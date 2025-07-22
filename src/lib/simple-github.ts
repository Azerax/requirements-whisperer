// Simple GitHub integration for public repositories
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

export class SimpleGitHubClient {
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
    // Get public repositories only for simplicity
    const repos = await this.makeRequest<GitHubRepository[]>('/user/repos?visibility=public&sort=updated&per_page=50');
    return repos;
  }

  async getPublicFileContent(owner: string, repo: string, path: string): Promise<string | null> {
    try {
      // Use raw.githubusercontent.com for public files - no auth needed!
      const response = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`);
      if (response.ok) {
        return await response.text();
      }
      
      // Try master branch if main fails
      const masterResponse = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/master/${path}`);
      if (masterResponse.ok) {
        return await masterResponse.text();
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  async analyzeRepository(repo: GitHubRepository): Promise<{
    hasRequirements: boolean;
    requirements: string[];
    sampleAnalysis: {
      totalFiles: number;
      violations: Array<{ file: string; issue: string; severity: string }>;
    };
  }> {
    const [owner, repoName] = repo.full_name.split('/');
    
    // Check for requirements.txt
    const requirementsContent = await this.getPublicFileContent(owner, repoName, 'requirements.txt');
    
    if (!requirementsContent) {
      return {
        hasRequirements: false,
        requirements: [],
        sampleAnalysis: { totalFiles: 0, violations: [] }
      };
    }

    // Parse requirements
    const requirements = requirementsContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(line => line.split('==')[0].split('>=')[0].split('<=')[0].trim());

    // Generate sample analysis for demo
    const sampleViolations = this.generateSampleViolations(requirements);

    return {
      hasRequirements: true,
      requirements,
      sampleAnalysis: {
        totalFiles: Math.floor(Math.random() * 20) + 5,
        violations: sampleViolations
      }
    };
  }

  private generateSampleViolations(requirements: string[]): Array<{ file: string; issue: string; severity: string }> {
    const violations = [];
    const commonUnauthorized = ['requests', 'numpy', 'pandas', 'matplotlib', 'tensorflow', 'torch'];
    
    // Generate some realistic violations
    const unauthorizedImports = commonUnauthorized.filter(pkg => !requirements.includes(pkg));
    
    for (let i = 0; i < Math.min(3, unauthorizedImports.length); i++) {
      const pkg = unauthorizedImports[i];
      violations.push({
        file: `src/${['main', 'app', 'utils', 'models'][Math.floor(Math.random() * 4)]}.py`,
        issue: `Unauthorized import '${pkg}' not found in requirements.txt`,
        severity: Math.random() > 0.5 ? 'high' : 'medium'
      });
    }

    return violations;
  }
}