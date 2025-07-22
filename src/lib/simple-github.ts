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
    // Return demo repositories for demonstration
    return [
      {
        id: 1,
        name: 'ai-project',
        full_name: 'demo-user/ai-project',
        description: 'AI-powered data analysis tool',
        private: false,
        default_branch: 'main',
        html_url: 'https://github.com/demo-user/ai-project',
        clone_url: 'https://github.com/demo-user/ai-project.git',
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        name: 'web-scraper',
        full_name: 'demo-user/web-scraper',
        description: 'Python web scraping utility',
        private: false,
        default_branch: 'main',
        html_url: 'https://github.com/demo-user/web-scraper',
        clone_url: 'https://github.com/demo-user/web-scraper.git',
        updated_at: new Date().toISOString()
      },
      {
        id: 3,
        name: 'ml-pipeline',
        full_name: 'demo-user/ml-pipeline',
        description: 'Machine learning data pipeline',
        private: false,
        default_branch: 'main',
        html_url: 'https://github.com/demo-user/ml-pipeline',
        clone_url: 'https://github.com/demo-user/ml-pipeline.git',
        updated_at: new Date().toISOString()
      },
      {
        id: 4,
        name: 'api-server',
        full_name: 'demo-user/api-server',
        description: 'REST API server with FastAPI',
        private: false,
        default_branch: 'main',
        html_url: 'https://github.com/demo-user/api-server',
        clone_url: 'https://github.com/demo-user/api-server.git',
        updated_at: new Date().toISOString()
      }
    ];
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
    // Simulate analysis with demo data
    const demoRequirements = ['flask', 'numpy', 'pandas', 'requests'];
    const hasRequirements = Math.random() > 0.3; // 70% chance of having requirements.txt
    
    if (!hasRequirements) {
      return {
        hasRequirements: false,
        requirements: [],
        sampleAnalysis: { totalFiles: 0, violations: [] }
      };
    }

    // Generate realistic violations
    const sampleViolations = this.generateSampleViolations(demoRequirements, repo.name);

    return {
      hasRequirements: true,
      requirements: demoRequirements,
      sampleAnalysis: {
        totalFiles: Math.floor(Math.random() * 20) + 5,
        violations: sampleViolations
      }
    };
  }

  private generateSampleViolations(requirements: string[], repoName: string): Array<{ file: string; issue: string; severity: string }> {
    const violations = [];
    const unauthorizedPackages = ['tensorflow', 'torch', 'matplotlib', 'scikit-learn', 'opencv-python'];
    
    // Generate violations based on repo type
    const repoViolations = {
      'ai-project': [
        { file: 'src/model.py', issue: "Unauthorized import 'tensorflow' not found in requirements.txt", severity: 'high' },
        { file: 'src/utils.py', issue: "Unauthorized import 'sklearn' not found in requirements.txt", severity: 'medium' }
      ],
      'ml-pipeline': [
        { file: 'pipeline/training.py', issue: "Unauthorized import 'torch' not found in requirements.txt", severity: 'high' },
        { file: 'pipeline/preprocessing.py', issue: "Unauthorized import 'cv2' not found in requirements.txt", severity: 'medium' },
        { file: 'pipeline/evaluation.py', issue: "Unauthorized import 'matplotlib' not found in requirements.txt", severity: 'low' }
      ],
      'web-scraper': [
        { file: 'scraper/main.py', issue: "Unauthorized import 'selenium' not found in requirements.txt", severity: 'high' }
      ],
      'api-server': []
    };

    return repoViolations[repoName as keyof typeof repoViolations] || [];
  }
}