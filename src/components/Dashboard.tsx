import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useGitHub } from "@/hooks/useRealGitHub";
import { complianceLogger } from "@/lib/compliance-logger";
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
  ExternalLink,
  LogOut
} from "lucide-react";
import { GitHubRepository } from "@/lib/real-github";

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
  const { user, apiClient, disconnect } = useGitHub();
  const { toast } = useToast();
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [analyses, setAnalyses] = useState<RepositoryAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [recentViolations, setRecentViolations] = useState<any[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    setDebugLogs(prev => [logEntry, ...prev.slice(0, 19)]); // Keep last 20 logs
  };

  const loadRecentViolations = async () => {
    try {
      addDebugLog('📊 Loading recent violations from database...');
      const violations = await complianceLogger.getRecentViolations(5);
      setRecentViolations(violations);
      setLastRefreshed(new Date());
      addDebugLog(`✅ Loaded ${violations.length} recent violations`);
    } catch (error) {
      console.error('❌ Failed to load recent violations:', error);
      addDebugLog('❌ Failed to load recent violations from database');
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast({
      title: "Disconnected",
      description: "Successfully disconnected from GitHub",
    });
  };

  useEffect(() => {
    if (apiClient && user) {
      loadRepositories();
      loadRecentViolations();
    }
  }, [apiClient, user]);

  const loadRepositories = async () => {
    if (!apiClient) {
      addDebugLog('❌ No apiClient available');
      return;
    }
    
    addDebugLog(`🔄 Loading repositories for user: ${user?.login}`);
    addDebugLog(`🔑 API client has token: ${!!(apiClient as any).accessToken}`);
    
    // Set debug logger on the API client
    if (apiClient && typeof (apiClient as any).setDebugLogger === 'function') {
      (apiClient as any).setDebugLogger(addDebugLog);
    }
    
    setLoading(true);
    try {
      addDebugLog('📡 Calling getUserRepositories...');
      addDebugLog(`🔍 API Client type: ${apiClient.constructor.name}`);
      addDebugLog(`🔍 API Client token exists: ${!!(apiClient as any).accessToken}`);
      const repos = await apiClient.getUserRepositories(user.login);
      addDebugLog(`✅ Loaded ${repos.length} repositories: ${repos.map(r => r.name).join(', ')}`);
      setRepositories(repos);
      
      // Auto-analyze repositories with requirements.txt
      analyzeRepositoriesWithRequirements(repos);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addDebugLog(`❌ Error loading repositories: ${errorMessage}`);
      addDebugLog(`❌ Error details: ${JSON.stringify(error)}`);
      toast({
        title: "Error",
        description: `Failed to load repositories: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const analyzeRepositoriesWithRequirements = async (repos: GitHubRepository[]) => {
    if (!apiClient || !user) return;

    addDebugLog(`🔍 Starting analysis for ${repos.length} repositories: ${repos.map(r => r.name).join(', ')}`);

    // Check all repositories for requirements.txt first (not just analyze those that have it)
    const analysisPromises = repos.slice(0, 10).map(async (repo) => {
      try {
        const [owner, repoName] = repo.full_name.split('/');
        addDebugLog(`=== Analyzing ${repo.full_name} ===`);
        
        // First check if requirements.txt exists (case-insensitive)
        addDebugLog(`Checking ${repo.name} for requirements.txt...`);
        const requirementsTxt = await apiClient.getRequirementsTxt(owner, repoName);
        addDebugLog(`Requirements.txt for ${repo.name}: ${requirementsTxt ? 'Found ✅' : 'Not found ❌'}`);
        
        if (!requirementsTxt) {
          addDebugLog(`❌ No requirements.txt found in ${repo.full_name}`);
          return {
            repository: repo,
            totalFiles: 0,
            pythonFiles: [],
            violations: [],
            hasRequirementsTxt: false,
            lastChecked: new Date()
          };
        }
        
        addDebugLog(`✅ Found requirements.txt in ${repo.full_name}, starting compliance analysis...`);
        const analysis = await apiClient.analyzeCodeCompliance(owner, repoName);
        addDebugLog(`Analysis complete for ${repo.full_name}: ${analysis.violations.length} violations found`);
        
        return {
          repository: repo,
          totalFiles: analysis.totalFiles,
          pythonFiles: analysis.pythonFiles,
          violations: analysis.violations,
          hasRequirementsTxt: true,
          lastChecked: new Date()
        };
      } catch (error) {
        addDebugLog(`❌ Failed to analyze ${repo.full_name}: ${error instanceof Error ? error.message : String(error)}`);
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
    addDebugLog('\n=== Final Analysis Results ===');
    addDebugLog(`Total results: ${results.length}`);
    results.forEach(result => {
      addDebugLog(`${result.repository.name}: hasRequirementsTxt=${result.hasRequirementsTxt}, violations=${result.violations.length}`);
    });
    setAnalyses(results);
  };

  const analyzeRepository = async (repo: GitHubRepository) => {
    if (!apiClient || !user) return;
    
    setSelectedRepo(repo.id.toString());
    try {
      const [owner, repoName] = repo.full_name.split('/');
      const analysis = await apiClient.analyzeCodeCompliance(owner, repoName);
      
      const newAnalysis: RepositoryAnalysis = {
        repository: repo,
        totalFiles: analysis.totalFiles,
        pythonFiles: analysis.pythonFiles,
        violations: analysis.violations,
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

      // Refresh violations from database after analysis
      await loadRecentViolations();

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

  const mockRecentViolations = analyses
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
      {/* Connected Repository Info */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GitBranch className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Connected to GitHub</p>
                <p className="font-medium text-foreground">github.com/{user?.login}</p>
                {repositories.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Repositories: {repositories.slice(0, 5).map(r => r.name).join(', ')}
                    {repositories.length > 5 && ` +${repositories.length - 5} more`}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="gap-1">
                <CheckCircle className="h-3 w-3 text-success" />
                {reposWithRequirements.length} repos with requirements.txt
              </Badge>
              <Button 
                onClick={handleDisconnect}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Disconnect
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Recent Violations ({recentViolations.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              {lastRefreshed && (
                <span className="text-xs text-muted-foreground">
                  Last updated: {lastRefreshed.toLocaleTimeString()}
                </span>
              )}
              <Button onClick={loadRecentViolations} size="sm" variant="outline">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 max-h-96 overflow-y-auto">
            {recentViolations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success" />
                No violations found! Your code is compliant.
              </div>
            ) : (
              recentViolations.map((violation, index) => (
                <div key={index} className="p-4 bg-gradient-accent rounded-lg border border-border">
                  <div className="flex items-start gap-3">
                    <FileX className="h-4 w-4 text-destructive flex-shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground text-sm">{violation.file_path || violation.file}</span>
                        <Badge 
                          variant={violation.severity === "high" || violation.severity === "critical" ? "destructive" : "outline"}
                          className="text-xs flex-shrink-0"
                        >
                          {violation.severity}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground block mb-2">
                        {violation.repositories?.name || violation.repo}
                      </span>
                      <span className="text-sm text-foreground break-words">
                        {violation.description || violation.violation}
                      </span>
                      {violation.created_at && (
                        <span className="text-xs text-muted-foreground block mt-2">
                          {new Date(violation.created_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Debug Logs */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Debug Logs
            <Button 
              onClick={() => setDebugLogs([])} 
              size="sm" 
              variant="ghost"
              className="ml-auto"
            >
              Clear
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
            {debugLogs.length === 0 ? (
              <p className="text-muted-foreground">No debug logs yet. Click refresh to see logs.</p>
            ) : (
              debugLogs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;