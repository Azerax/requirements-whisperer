// GitHub API client for real API calls
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

export interface RequirementsTxt {
  content: string;
  dependencies: string[];
  path: string;
}

export class GitHubApiClient {
  private accessToken: string;
  private baseUrl = 'https://api.github.com';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async makeRequest<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getCurrentUser(): Promise<GitHubUser> {
    return this.makeRequest<GitHubUser>('/user');
  }

  async getUserRepositories(): Promise<GitHubRepository[]> {
    const repos = await this.makeRequest<GitHubRepository[]>('/user/repos?sort=updated&per_page=100');
    return repos.filter(repo => !repo.private || repo.name); // Include all repos user has access to
  }

  async getFileContent(owner: string, repo: string, path: string): Promise<string | null> {
    try {
      const response = await this.makeRequest<{ content: string; encoding: string }>(`/repos/${owner}/${repo}/contents/${path}`);
      if (response.encoding === 'base64') {
        return atob(response.content);
      }
      return response.content;
    } catch (error) {
      return null; // File doesn't exist
    }
  }

  async getRequirementsTxt(owner: string, repo: string): Promise<RequirementsTxt | null> {
    const content = await this.getFileContent(owner, repo, 'requirements.txt');
    if (!content) return null;

    const dependencies = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(line => line.split('==')[0].split('>=')[0].split('<=')[0].split('>')[0].split('<')[0].trim());

    return {
      content,
      dependencies,
      path: 'requirements.txt'
    };
  }

  async getRepositoryFiles(owner: string, repo: string, path: string = ''): Promise<any[]> {
    try {
      const files = await this.makeRequest<any[]>(`/repos/${owner}/${repo}/contents/${path}`);
      return files;
    } catch (error) {
      return [];
    }
  }

  async analyzeCodeCompliance(owner: string, repo: string): Promise<{
    totalFiles: number;
    pythonFiles: string[];
    violations: Array<{
      file: string;
      violations: string[];
    }>;
  }> {
    const requirements = await this.getRequirementsTxt(owner, repo);
    if (!requirements) {
      throw new Error('No requirements.txt found in repository');
    }

    // Get all Python files
    const pythonFiles = await this.findPythonFiles(owner, repo);
    
    const violations: Array<{ file: string; violations: string[] }> = [];

    // Analyze each Python file for compliance
    for (const file of pythonFiles) {
      const content = await this.getFileContent(owner, repo, file);
      if (content) {
        const fileViolations = this.analyzeFileCompliance(content, requirements.dependencies);
        if (fileViolations.length > 0) {
          violations.push({ file, violations: fileViolations });
        }
      }
    }

    return {
      totalFiles: pythonFiles.length,
      pythonFiles,
      violations
    };
  }

  private async findPythonFiles(owner: string, repo: string, path: string = ''): Promise<string[]> {
    const files = await this.getRepositoryFiles(owner, repo, path);
    const pythonFiles: string[] = [];

    for (const file of files) {
      if (file.type === 'file' && file.name.endsWith('.py')) {
        pythonFiles.push(file.path);
      } else if (file.type === 'dir' && !file.name.startsWith('.')) {
        const subFiles = await this.findPythonFiles(owner, repo, file.path);
        pythonFiles.push(...subFiles);
      }
    }

    return pythonFiles;
  }

  private analyzeFileCompliance(content: string, allowedDependencies: string[]): string[] {
    const violations: string[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Check for import statements
      if (trimmedLine.startsWith('import ') || trimmedLine.startsWith('from ')) {
        const importMatch = trimmedLine.match(/^(?:from\s+)?([a-zA-Z_][a-zA-Z0-9_]*)/);
        if (importMatch) {
          const moduleName = importMatch[1];
          
          // Skip standard library modules
          const standardLibModules = [
            'os', 'sys', 'json', 'datetime', 'collections', 'itertools', 'functools',
            'pathlib', 'urllib', 'http', 'logging', 'typing', 're', 'math', 'random'
          ];
          
          if (!standardLibModules.includes(moduleName) && 
              !allowedDependencies.includes(moduleName) &&
              !moduleName.startsWith('.')) { // Relative imports
            violations.push(`Line ${index + 1}: Unauthorized import '${moduleName}' not found in requirements.txt`);
          }
        }
      }
    });

    return violations;
  }
}