import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useGitHub } from "@/hooks/useGitHub";
import { 
  AlertTriangle, 
  CheckCircle, 
  FileX, 
  GitBranch, 
  Clock,
  TrendingUp,
  Shield,
  Eye,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { GitHubRepository } from "@/lib/github-api";

interface RepositoryAnalysis {
  repository: GitHubRepository;
  totalFiles: number;
  pythonFiles: string[];
  violations: Array<{
    file: string;
    violations: string[];
  }>;
  hasRequirementsTxt: boolean;
  lastChecked: Date;
}

const Dashboard = () => {
  const { user, apiClient } = useGitHub();
  const { toast } = useToast();
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [analyses, setAnalyses] = useState<RepositoryAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);

  useEffect(() => {
    if (apiClient && user) {
      loadRepositories();
    }
  }, [apiClient, user]);

  const loadRepositories = async () => {
    if (!apiClient) return;
    
    setLoading(true);
    try {
      const repos = await apiClient.getUserRepositories();
      setRepositories(repos);
      
      // Auto-analyze repositories with requirements.txt
      analyzeRepositoriesWithRequirements(repos);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load repositories",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const analyzeRepositoriesWithRequirements = async (repos: GitHubRepository[]) => {
    if (!apiClient) return;

    const analysisPromises = repos.slice(0, 5).map(async (repo) => { // Limit to first 5 repos
      try {
        const [owner, repoName] = repo.full_name.split('/');
        const requirementsTxt = await apiClient.getRequirementsTxt(owner, repoName);
        
        if (requirementsTxt) {
          const analysis = await apiClient.analyzeCodeCompliance(owner, repoName);
          return {
            repository: repo,
            ...analysis,
            hasRequirementsTxt: true,
            lastChecked: new Date()
          };
        }
        
        return {
          repository: repo,
          totalFiles: 0,
          pythonFiles: [],
          violations: [],
          hasRequirementsTxt: false,
          lastChecked: new Date()
        };
      } catch (error) {
        console.error(`Failed to analyze ${repo.full_name}:`, error);
        return {
          repository: repo,
          totalFiles: 0,
          pythonFiles: [],
          violations: [],
          hasRequirementsTxt: false,
          lastChecked: new Date()
        };
      }
    });

    const results = await Promise.all(analysisPromises);
    setAnalyses(results);
  };

  const analyzeRepository = async (repo: GitHubRepository) => {
    if (!apiClient) return;
    
    setSelectedRepo(repo.id.toString());
    try {
      const [owner, repoName] = repo.full_name.split('/');
      const analysis = await apiClient.analyzeCodeCompliance(owner, repoName);
      
      const newAnalysis: RepositoryAnalysis = {
        repository: repo,
        ...analysis,
        hasRequirementsTxt: true,
        lastChecked: new Date()
      };

      setAnalyses(prev => {
        const index = prev.findIndex(a => a.repository.id === repo.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = newAnalysis;
          return updated;
        }
        return [...prev, newAnalysis];
      });

      toast({
        title: "Analysis Complete",
        description: `Found ${analysis.violations.length} violations in ${repo.name}`
      });
    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSelectedRepo(null);
    }
  };

  const totalViolations = analyses.reduce((sum, analysis) => 
    sum + analysis.violations.reduce((vSum, v) => vSum + v.violations.length, 0), 0
  );
  
  const totalCompliantFiles = analyses.reduce((sum, analysis) => 
    sum + (analysis.totalFiles - analysis.violations.length), 0
  );

  const reposWithRequirements = analyses.filter(a => a.hasRequirementsTxt);
  const complianceRate = reposWithRequirements.length > 0 
    ? Math.round(((reposWithRequirements.filter(a => a.violations.length === 0).length) / reposWithRequirements.length) * 100)
    : 0;

  const stats = [
    {
      title: "Total Repositories",
      value: repositories.length.toString(),
      icon: GitBranch,
      change: `${reposWithRequirements.length} with requirements.txt`
    },
    {
      title: "Compliance Rate",
      value: `${complianceRate}%`,
      icon: Shield,
      change: `${reposWithRequirements.filter(a => a.violations.length === 0).length} fully compliant`
    },
    {
      title: "Active Violations",
      value: totalViolations.toString(),
      icon: AlertTriangle,
      change: `${analyses.length} repositories analyzed`
    },
    {
      title: "Files Monitored",
      value: analyses.reduce((sum, a) => sum + a.totalFiles, 0).toString(),
      icon: Eye,
      change: `${analyses.reduce((sum, a) => sum + a.pythonFiles.length, 0)} Python files`
    }
  ];

  const recentViolations = analyses
    .flatMap(analysis => 
      analysis.violations.flatMap(v => 
        v.violations.map(violation => ({
          file: v.file,
          repo: analysis.repository.name,
          violation: violation,
          severity: violation.includes('unauthorized') || violation.includes('Unauthorized') ? 'high' : 'medium',
          repoUrl: analysis.repository.html_url
        }))
      )
    )
    .slice(0, 10);

  if (loading && repositories.length === 0) {
    return (
      <div className="container mx-auto px-6 py-8 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading repositories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="bg-card border-border hover:shadow-card transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3" />
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Repository List and Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" />
              Repositories ({repositories.length})
            </CardTitle>
            <Button onClick={loadRepositories} disabled={loading} size="sm" variant="outline">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 max-h-96 overflow-y-auto">
            {repositories.map((repo) => {
              const analysis = analyses.find(a => a.repository.id === repo.id);
              const violationCount = analysis ? 
                analysis.violations.reduce((sum, v) => sum + v.violations.length, 0) : 0;
              
              return (
                <div key={repo.id} className="flex items-center justify-between p-4 bg-gradient-accent rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{repo.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {repo.description || 'No description'}
                      </span>
                      {analysis && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Checked {analysis.lastChecked.toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {analysis ? (
                      <div className="flex items-center gap-2">
                        <Badge variant={violationCount === 0 ? "default" : "destructive"} className="gap-1">
                          {violationCount === 0 ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <AlertTriangle className="h-3 w-3" />
                          )}
                          {violationCount} violations
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle className="h-3 w-3 text-success" />
                          {analysis.totalFiles - analysis.violations.length} compliant
                        </Badge>
                      </div>
                    ) : (
                      <Badge variant="outline">Not analyzed</Badge>
                    )}
                    <Button 
                      onClick={() => analyzeRepository(repo)}
                      disabled={selectedRepo === repo.id.toString()}
                      size="sm"
                      variant="outline"
                    >
                      {selectedRepo === repo.id.toString() ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        'Analyze'
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Recent Violations ({recentViolations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-96 overflow-y-auto">
            {recentViolations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success" />
                No violations found! Your code is compliant.
              </div>
            ) : (
              recentViolations.map((violation, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gradient-accent rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <FileX className="h-4 w-4 text-destructive" />
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{violation.file}</span>
                      <span className="text-xs text-muted-foreground">{violation.repo}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end max-w-xs">
                      <span className="text-sm text-foreground truncate">{violation.violation}</span>
                      <Badge 
                        variant={violation.severity === "high" ? "destructive" : "outline"}
                        className="text-xs"
                      >
                        {violation.severity}
                      </Badge>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={violation.repoUrl} target="_blank" rel="noopener noreferrer">
                        Fix
                      </a>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;