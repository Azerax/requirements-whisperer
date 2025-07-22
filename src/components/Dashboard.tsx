import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  CheckCircle, 
  FileX, 
  GitBranch, 
  Clock,
  TrendingUp,
  Shield,
  Eye
} from "lucide-react";

const Dashboard = () => {
  const mockRepos = [
    {
      name: "ai-project",
      violations: 3,
      compliant: 15,
      lastChecked: "2 minutes ago",
      status: "warning"
    },
    {
      name: "web-scraper",
      violations: 0,
      compliant: 8,
      lastChecked: "5 minutes ago",
      status: "success"
    },
    {
      name: "ml-pipeline",
      violations: 7,
      compliant: 12,
      lastChecked: "1 hour ago",
      status: "error"
    }
  ];

  const stats = [
    {
      title: "Total Repositories",
      value: "12",
      icon: GitBranch,
      change: "+2 this week"
    },
    {
      title: "Compliance Rate",
      value: "87%",
      icon: Shield,
      change: "+5% from last week"
    },
    {
      title: "Active Violations",
      value: "23",
      icon: AlertTriangle,
      change: "-3 resolved today"
    },
    {
      title: "Files Monitored",
      value: "1,247",
      icon: Eye,
      change: "+47 new files"
    }
  ];

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

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" />
              Repository Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockRepos.map((repo, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gradient-accent rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{repo.name}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {repo.lastChecked}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={repo.status === "success" ? "default" : "destructive"} className="gap-1">
                      {repo.status === "success" ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <AlertTriangle className="h-3 w-3" />
                      )}
                      {repo.violations} violations
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <CheckCircle className="h-3 w-3 text-success" />
                      {repo.compliant} compliant
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm">
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Recent Violations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                file: "app.py",
                repo: "ai-project",
                violation: "Missing numpy==1.21.0 requirement",
                severity: "high"
              },
              {
                file: "requirements.txt",
                repo: "ml-pipeline",
                violation: "Outdated pandas version",
                severity: "medium"
              },
              {
                file: "main.py",
                repo: "ai-project",
                violation: "Unlisted tensorflow dependency",
                severity: "high"
              }
            ].map((violation, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gradient-accent rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <FileX className="h-4 w-4 text-destructive" />
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{violation.file}</span>
                    <span className="text-xs text-muted-foreground">{violation.repo}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className="text-sm text-foreground">{violation.violation}</span>
                    <Badge 
                      variant={violation.severity === "high" ? "destructive" : "outline"}
                      className="text-xs"
                    >
                      {violation.severity}
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm">
                    Fix
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;