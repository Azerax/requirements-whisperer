// Real GitHub API client for actual GitHub integration
import { complianceLogger } from './supabase';
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
    forbiddenImports: string[];
  } | null> {
    // Try different case variations of requirements.txt
    const possibleNames = ['requirements.txt', 'Requirements.txt', 'REQUIREMENTS.TXT', 'requirements.TXT'];
    
    for (const filename of possibleNames) {
      const content = await this.getFileContent(owner, repo, filename);
      if (content) {
        this.log(`📋 Found requirements file: ${filename}`);
        
        const lines = content.split('\n').map(line => line.trim());
        const dependencies: string[] = [];
        const forbiddenImports: string[] = [];
        
        lines.forEach(line => {
          if (line && !line.startsWith('#')) {
            // Check for forbidden imports (lines starting with "no " or "forbidden ")
            if (line.toLowerCase().startsWith('no ') || line.toLowerCase().startsWith('forbidden ')) {
              const forbidden = line.replace(/^(no|forbidden)\s+/i, '').trim();
              if (forbidden) {
                forbiddenImports.push(forbidden);
              }
            } else if (!line.startsWith('-')) {
              // Regular dependency
              const match = line.match(/^([a-zA-Z0-9\-_\.]+)/);
              if (match) {
                dependencies.push(match[1]);
              }
            }
          }
        });

        this.log(`📦 Found ${dependencies.length} allowed dependencies: ${dependencies.slice(0, 3).join(', ')}${dependencies.length > 3 ? '...' : ''}`);
        this.log(`🚫 Found ${forbiddenImports.length} forbidden imports: ${forbiddenImports.join(', ')}`);

        return { content, dependencies, forbiddenImports };
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
    forbiddenImports: string[] | null;
  }> {
    // Create or update repository record
    const repoUrl = `https://github.com/${owner}/${repo}`;
    let repository;
    let audit;
    
    try {
      repository = await complianceLogger.upsertRepository(owner, repo, repoUrl);
      audit = await complianceLogger.createAudit(repository.id);
    } catch (error) {
      console.error('Failed to initialize database logging:', error);
      // Continue with analysis even if logging fails
    }
    // Get requirements.txt first
    const requirementsTxt = await this.getRequirementsTxt(owner, repo);
    if (!requirementsTxt) {
      throw new Error('No requirements.txt found in repository');
    }

    this.log(`📋 Found requirements with ${requirementsTxt.dependencies.length} dependencies: ${requirementsTxt.dependencies.join(', ')}`);

    // Find Python files in common directories
    const searchPaths = ['src', 'app', 'lib', '']; // Start with src/, then app/, lib/, then root
    let pythonFiles: string[] = [];
    
    for (const searchPath of searchPaths) {
      this.log(`🔍 Searching for Python files in: ${searchPath || 'root directory'}`);
      const filesInPath = await this.findPythonFiles(owner, repo, searchPath, 3);
      pythonFiles.push(...filesInPath);
      this.log(`📁 Found ${filesInPath.length} Python files in ${searchPath || 'root'}: ${filesInPath.slice(0, 3).join(', ')}${filesInPath.length > 3 ? '...' : ''}`);
    }

    // Remove duplicates
    pythonFiles = [...new Set(pythonFiles)];
    this.log(`📊 Total unique Python files found: ${pythonFiles.length}`);
    
    const violations: Array<{ file: string; violations: string[] }> = [];

    // Analyze first 15 Python files to avoid rate limits
    const filesToAnalyze = pythonFiles.slice(0, 15);
    this.log(`🔬 Analyzing ${filesToAnalyze.length} Python files for compliance...`);
    
    for (const filePath of filesToAnalyze) {
      this.log(`📄 Analyzing file: ${filePath}`);
      const content = await this.getFileContent(owner, repo, filePath);
      if (content) {
        const fileViolations = this.analyzeFileCompliance(content, requirementsTxt.forbiddenImports);
        if (fileViolations.length > 0) {
          this.log(`⚠️ Found ${fileViolations.length} violations in ${filePath}`);
          violations.push({ file: filePath, violations: fileViolations });
          
          // Log violations to database
          if (repository && audit) {
            for (const violation of fileViolations) {
              try {
                // Extract line number and description
                const lineMatch = violation.match(/Line (\d+): (.+)/);
                const lineNumber = lineMatch ? parseInt(lineMatch[1]) : undefined;
                const description = lineMatch ? lineMatch[2] : violation;
                
                // Categorize violation
                let category = 'general';
                let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
                
                if (violation.includes('Forbidden import')) {
                  category = 'forbidden_imports';
                  severity = 'high';
                } else if (violation.includes('Hardcoded value')) {
                  category = 'hardcoded_values';
                  severity = 'medium';
                } else if (violation.includes('security risk')) {
                  category = 'security';
                  severity = 'critical';
                } else if (violation.includes('Auth logic')) {
                  category = 'authentication';
                  severity = 'high';
                } else if (violation.includes('API call missing error handling')) {
                  category = 'error_handling';
                  severity = 'medium';
                } else if (violation.includes('Console.log')) {
                  category = 'code_quality';
                  severity = 'low';
                }

                await complianceLogger.logViolation(
                  audit.id,
                  repository.id,
                  filePath,
                  category,
                  severity,
                  description,
                  category,
                  lineNumber
                );
              } catch (logError) {
                console.error('Failed to log violation:', logError);
              }
            }
          }
        } else {
          this.log(`✅ No violations in ${filePath}`);
        }
      } else {
        this.log(`❌ Could not read content of ${filePath}`);
      }
    }

    this.log(`🎯 Analysis complete: ${violations.length} files with violations, ${filesToAnalyze.length - violations.length} compliant`);

    // Complete the audit
    if (repository && audit) {
      try {
        const totalViolations = violations.reduce((sum, v) => sum + v.violations.length, 0);
        await complianceLogger.completeAudit(
          audit.id,
          pythonFiles.length,
          violations.length,
          filesToAnalyze.length - violations.length,
          totalViolations
        );
      } catch (error) {
        console.error('Failed to complete audit:', error);
      }
    }

    return {
      totalFiles: pythonFiles.length,
      pythonFiles,
      violations,
      requirements: requirementsTxt.dependencies,
      forbiddenImports: requirementsTxt.forbiddenImports
    };
  }

  private analyzeFileCompliance(content: string, forbiddenImports: string[]): string[] {
    const violations: string[] = [];
    const lines = content.split('\n');

    // Track hardcoded values
    const hardcodedPatterns = [
      /["'](?:localhost|127\.0\.0\.1|192\.168\.|10\.|172\.)/,  // IP addresses
      /["'](?:password|secret|key|token)["']\s*[:=]\s*["'][^"']+["']/i,  // Credentials
      /["'](?:https?:\/\/[^"']+)["']/,  // URLs
      /["'](?:\/[^"']*\/[^"']+)["']/,  // File paths
      /\b\d{4,}\b/,  // Large numbers (ports, IDs)
      /["'][A-Z0-9]{20,}["']/,  // API keys pattern
    ];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      const lineNum = index + 1;
      
      // 1. Check for forbidden imports
      if (trimmedLine.startsWith('import ') || trimmedLine.startsWith('from ')) {
        let moduleName = '';
        
        if (trimmedLine.startsWith('from ')) {
          const match = trimmedLine.match(/^from\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
          if (match) moduleName = match[1];
        } else if (trimmedLine.startsWith('import ')) {
          const match = trimmedLine.match(/^import\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
          if (match) moduleName = match[1];
        }
        
        if (moduleName && forbiddenImports.includes(moduleName)) {
          violations.push(`Line ${lineNum}: Forbidden import '${moduleName}' is not allowed in this project`);
        }
      }

      // 2. Check for hardcoded values
      hardcodedPatterns.forEach(pattern => {
        if (pattern.test(trimmedLine) && !trimmedLine.includes('TODO') && !trimmedLine.includes('FIXME')) {
          violations.push(`Line ${lineNum}: Hardcoded value detected - should use environment variables or configuration`);
        }
      });

      // 3. Required route checks (for routing files)
      if (trimmedLine.includes('Route') && trimmedLine.includes('path=')) {
        const requiredRoutes = ['/login', '/dashboard', '/signup'];
        const hasRequiredRoute = requiredRoutes.some(route => trimmedLine.includes(route));
        if (!hasRequiredRoute && (trimmedLine.includes('/') && trimmedLine.includes('element='))) {
          // This is a route definition but not a required one - check if required routes exist elsewhere
        }
      }

      // 4. Auth flow integrity checks
      if (trimmedLine.includes('signIn') || trimmedLine.includes('signOut') || trimmedLine.includes('session')) {
        if (trimmedLine.includes('// TODO') || trimmedLine.includes('// STUB')) {
          violations.push(`Line ${lineNum}: Auth logic appears to be a stub or placeholder`);
        }
      }

      // 5. Button/Label preservation checks
      const criticalLabels = ['Log In', 'Sign Out', 'Login', 'Logout', 'Sign Up', 'Register'];
      if (trimmedLine.includes('>') && trimmedLine.includes('<')) {
        criticalLabels.forEach(label => {
          if (trimmedLine.includes(`>${label}<`) && trimmedLine.includes('TODO')) {
            violations.push(`Line ${lineNum}: Critical UI label '${label}' may have been modified or stubbed`);
          }
        });
      }

      // 6. Supabase data component checks
      if (trimmedLine.includes('supabase.from(') && trimmedLine.includes('TODO')) {
        violations.push(`Line ${lineNum}: Supabase data operation appears to be stubbed or incomplete`);
      }

      // 7. API error handling checks
      if (trimmedLine.includes('.fetch(') || trimmedLine.includes('axios.') || trimmedLine.includes('api.')) {
        const nextLines = lines.slice(index, index + 5).join('\n');
        if (!nextLines.includes('.catch(') && !nextLines.includes('try') && !nextLines.includes('error')) {
          violations.push(`Line ${lineNum}: API call missing error handling (.catch() or try/catch)`);
        }
      }

      // 8. Dead code checks
      if (trimmedLine.includes('export default') && trimmedLine.includes('() => null')) {
        violations.push(`Line ${lineNum}: Empty component export detected - possible dead code`);
      }

      // 9. Navigation link integrity
      if (trimmedLine.includes('href=') || trimmedLine.includes('to=')) {
        if (trimmedLine.includes('#') || trimmedLine.includes('TODO')) {
          violations.push(`Line ${lineNum}: Navigation link appears to be placeholder or broken`);
        }
      }

      // 10. Custom logic preservation
      if (trimmedLine.includes('// AI generated') || trimmedLine.includes('// Stub')) {
        violations.push(`Line ${lineNum}: AI-generated stub detected - custom logic may have been overwritten`);
      }

      // 11. Syntax issues
      if (trimmedLine.includes(';;') || trimmedLine.match(/\{\s*\}/)) {
        violations.push(`Line ${lineNum}: Syntax issue detected - double semicolons or empty blocks`);
      }

      // 12. Variable naming violations
      if (trimmedLine.match(/\b[a-z]+[A-Z][a-z]*\s*=/) && trimmedLine.includes('var ')) {
        violations.push(`Line ${lineNum}: Inconsistent variable naming - mixing camelCase with var declaration`);
      }

      // 13. Module duplication
      const importMatch = trimmedLine.match(/^import.*from\s+['"]([^'"]+)['"]/);
      if (importMatch) {
        const module = importMatch[1];
        const otherImports = lines.filter(l => l.includes(`from '${module}'`) || l.includes(`from "${module}"`));
        if (otherImports.length > 1) {
          violations.push(`Line ${lineNum}: Duplicate import detected for module '${module}'`);
        }
      }

      // 14. Missing dependencies
      if (trimmedLine.includes('import') && trimmedLine.includes('react')) {
        if (!content.includes('package.json') && !content.includes('dependencies')) {
          // This would need cross-file analysis in a real implementation
        }
      }

      // 15. Inconsistent formatting
      if (trimmedLine.includes('  ') && trimmedLine.includes('\t')) {
        violations.push(`Line ${lineNum}: Mixed indentation detected - tabs and spaces`);
      }

      // 16. Unsafe operations
      if (trimmedLine.includes('eval(') || trimmedLine.includes('innerHTML =')) {
        violations.push(`Line ${lineNum}: Unsafe operation detected - potential security risk`);
      }

      // 17. Missing type annotations (TypeScript)
      if (trimmedLine.includes('function ') && !trimmedLine.includes(':') && !trimmedLine.includes('=>')) {
        violations.push(`Line ${lineNum}: Function missing type annotation`);
      }

      // 18. Console logs in production
      if (trimmedLine.includes('console.log') && !trimmedLine.includes('//')) {
        violations.push(`Line ${lineNum}: Console.log statement should be removed for production`);
      }

      // 19. Magic numbers
      if (trimmedLine.match(/\b\d{2,}\b/) && !trimmedLine.includes('//') && !trimmedLine.includes('const')) {
        violations.push(`Line ${lineNum}: Magic number detected - should be defined as constant`);
      }
    });

    return violations;
  }
}