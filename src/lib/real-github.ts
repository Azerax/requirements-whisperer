// Real GitHub API client for actual GitHub integration
export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  default_branch: string;
  html_url: string;
  clone_url: string;
  updated_at: string;
}

export interface GitHubUser {
  id: number;
  login: string;
  name: string;
  avatar_url: string;
  email: string | null;
}

export class RealGitHubClient {
  private accessToken?: string;
  private baseUrl = 'https://api.github.com';
  private debugLogger?: (message: string) => void;

  constructor(accessToken?: string) {
    this.accessToken = accessToken;
  }

  setDebugLogger(logger: (message: string) => void) {
    this.debugLogger = logger;
  }

  private log(message: string) {
    if (this.debugLogger) {
      this.debugLogger(message);
    } else {
      console.log(message);
    }
  }

  private async makeRequest<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    this.log(`🌐 Making GitHub API request to: ${url}`);
    this.log(`🔑 Using token: ${this.accessToken ? 'Yes' : 'No'}`);
    
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
      this.log(`🔒 Authorization header set`);
    }

    const response = await fetch(url, { headers });
    this.log(`📡 Response status: ${response.status} ${response.statusText}`);
    
    // Log response headers for debugging scopes
    const scopeHeader = response.headers.get('x-oauth-scopes');
    const acceptedScopesHeader = response.headers.get('x-accepted-oauth-scopes');
    if (scopeHeader) {
      this.log(`🔑 Token scopes: ${scopeHeader}`);
    }
    if (acceptedScopesHeader) {
      this.log(`✅ Accepted scopes for this endpoint: ${acceptedScopesHeader}`);
    }
    
    if (!response.ok) {
      this.log(`❌ GitHub API Error: ${response.status} ${response.statusText}`);
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    this.log(`📦 Response data type: ${Array.isArray(data) ? `Array with ${data.length} items` : typeof data}`);
    
    // Log first few items for debugging
    if (Array.isArray(data) && data.length > 0) {
      this.log(`📋 First repository: ${data[0].name || data[0].login || JSON.stringify(data[0]).substring(0, 100)}`);
    } else if (Array.isArray(data) && data.length === 0) {
      this.log(`⚠️ Empty array returned - check token scopes!`);
    }
    
    return data;
  }

  async getUser(username: string): Promise<GitHubUser> {
    return this.makeRequest<GitHubUser>(`/users/${username}`);
  }

  async getCurrentUser(): Promise<GitHubUser> {
    if (!this.accessToken) {
      throw new Error('Access token required for current user');
    }
    return this.makeRequest<GitHubUser>('/user');
  }

  async getUserRepositories(username: string): Promise<GitHubRepository[]> {
    this.log(`getUserRepositories called with: username=${username}, hasToken=${!!this.accessToken}`);
    
    if (this.accessToken) {
      // If we have a token, use the authenticated user's repos endpoint to get both public and private
      this.log('Using authenticated endpoint: /user/repos');
      const repos = await this.makeRequest<GitHubRepository[]>(`/user/repos?sort=updated&per_page=100`);
      this.log(`Authenticated repos result: ${repos.length} repositories`);
      return repos;
    } else {
      // Without token, only public repos
      this.log('Using public endpoint: /users/' + username + '/repos');
      const repos = await this.makeRequest<GitHubRepository[]>(`/users/${username}/repos?sort=updated&per_page=100`);
      this.log(`Public repos result: ${repos.length} repositories (filtering private)`);
      return repos.filter(repo => !repo.private);
    }
  }

  async getFileContent(owner: string, repo: string, path: string, branch: string = 'main'): Promise<string | null> {
    try {
      // For private repos or when we have a token, use the GitHub API
      if (this.accessToken) {
        try {
          const response = await this.makeRequest<any>(`/repos/${owner}/${repo}/contents/${path}?ref=${branch}`);
          if (response.content && response.encoding === 'base64') {
            return atob(response.content);
          }
        } catch (apiError) {
          // If branch fails, try with master
          if (branch === 'main') {
            return this.getFileContent(owner, repo, path, 'master');
          }
        }
      } else {
        // Try using raw.githubusercontent.com for public repos without token
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
        const response = await fetch(rawUrl);
        
        if (response.ok) {
          return await response.text();
        }

        // If main branch fails, try master
        if (branch === 'main') {
          return this.getFileContent(owner, repo, path, 'master');
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  async getDirectoryContents(owner: string, repo: string, path: string = ''): Promise<any[]> {
    try {
      const contents = await this.makeRequest<any[]>(`/repos/${owner}/${repo}/contents/${path}`);
      return contents;
    } catch (error) {
      return [];
    }
  }

  async getRequirementsTxt(owner: string, repo: string): Promise<{
    content: string;
    dependencies: string[];
  } | null> {
    // Try different case variations of requirements.txt
    const possibleNames = ['requirements.txt', 'Requirements.txt', 'REQUIREMENTS.TXT', 'requirements.TXT'];
    
    for (const filename of possibleNames) {
      const content = await this.getFileContent(owner, repo, filename);
      if (content) {
        this.log(`📋 Found requirements file: ${filename}`);
        const dependencies = content
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('#') && !line.startsWith('-'))
          .map(line => {
            // Extract package name from various requirement formats
            const match = line.match(/^([a-zA-Z0-9\-_\.]+)/);
            return match ? match[1] : line;
          })
          .filter(Boolean);

        return { content, dependencies };
      }
    }
    
    return null;
  }

  async findPythonFiles(owner: string, repo: string, path: string = '', maxDepth: number = 3): Promise<string[]> {
    if (maxDepth <= 0) return [];

    const pythonFiles: string[] = [];
    
    try {
      const contents = await this.getDirectoryContents(owner, repo, path);
      
      for (const item of contents) {
        if (item.type === 'file' && item.name.endsWith('.py')) {
          pythonFiles.push(item.path);
        } else if (item.type === 'dir' && !item.name.startsWith('.') && !['node_modules', '__pycache__'].includes(item.name)) {
          const subFiles = await this.findPythonFiles(owner, repo, item.path, maxDepth - 1);
          pythonFiles.push(...subFiles);
        }
      }
    } catch (error) {
      console.error(`Error accessing ${path}:`, error);
    }

    return pythonFiles;
  }

  async analyzeCodeCompliance(owner: string, repo: string): Promise<{
    totalFiles: number;
    pythonFiles: string[];
    violations: Array<{
      file: string;
      violations: string[];
    }>;
    requirements: string[] | null;
  }> {
    // Get requirements.txt
    const requirementsTxt = await this.getRequirementsTxt(owner, repo);
    if (!requirementsTxt) {
      throw new Error('No requirements.txt found in repository');
    }

    // Find Python files
    const pythonFiles = await this.findPythonFiles(owner, repo);
    
    const violations: Array<{ file: string; violations: string[] }> = [];

    // Analyze first 10 Python files to avoid rate limits
    const filesToAnalyze = pythonFiles.slice(0, 10);
    
    for (const filePath of filesToAnalyze) {
      const content = await this.getFileContent(owner, repo, filePath);
      if (content) {
        const fileViolations = this.analyzeFileCompliance(content, requirementsTxt.dependencies);
        if (fileViolations.length > 0) {
          violations.push({ file: filePath, violations: fileViolations });
        }
      }
    }

    return {
      totalFiles: pythonFiles.length,
      pythonFiles,
      violations,
      requirements: requirementsTxt.dependencies
    };
  }

  private analyzeFileCompliance(content: string, allowedDependencies: string[]): string[] {
    const violations: string[] = [];
    const lines = content.split('\n');

    // Standard library modules (Python built-ins)
    const standardLibModules = new Set([
      'os', 'sys', 'json', 'datetime', 'collections', 'itertools', 'functools',
      'pathlib', 'urllib', 'http', 'logging', 'typing', 're', 'math', 'random',
      'time', 'asyncio', 'threading', 'multiprocessing', 'subprocess', 'argparse',
      'configparser', 'csv', 'xml', 'html', 'email', 'base64', 'hashlib', 'hmac',
      'sqlite3', 'pickle', 'tempfile', 'shutil', 'glob', 'fnmatch', 'linecache',
      'textwrap', 'string', 'bytes', 'io', 'warnings', 'contextlib', 'abc',
      'numbers', 'decimal', 'fractions', 'statistics', 'unittest', 'doctest'
    ]);

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Check for import statements
      if (trimmedLine.startsWith('import ') || trimmedLine.startsWith('from ')) {
        let moduleName = '';
        
        if (trimmedLine.startsWith('from ')) {
          const match = trimmedLine.match(/^from\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
          if (match) moduleName = match[1];
        } else if (trimmedLine.startsWith('import ')) {
          const match = trimmedLine.match(/^import\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
          if (match) moduleName = match[1];
        }
        
        if (moduleName && 
            !standardLibModules.has(moduleName) && 
            !allowedDependencies.includes(moduleName) &&
            !moduleName.startsWith('.') && // Relative imports
            moduleName !== '__future__') {
          violations.push(`Line ${index + 1}: Unauthorized import '${moduleName}' not found in requirements.txt`);
        }
      }
    });

    return violations;
  }
}