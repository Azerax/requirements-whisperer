import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Github, Shield, Eye, AlertTriangle, CheckCircle, Zap } from "lucide-react";
import { useGitHub } from "@/hooks/useGitHub";

const HeroSection = () => {
  const { connectGitHub } = useGitHub();
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card">
      <div className="container mx-auto px-6 py-20">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          {/* Hero Content */}
          <div className="space-y-6">
            <Badge className="bg-gradient-primary text-primary-foreground px-4 py-2">
              <Shield className="h-4 w-4 mr-2" />
              Code Compliance Monitoring
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold text-foreground leading-tight">
              Keep Your Code{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Compliant
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Automatically audit your GitHub repositories against requirements.txt files. 
              Get real-time monitoring and instant alerts when code drifts from specifications.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              variant="hero" 
              size="lg" 
              className="gap-3 px-8 py-6 text-lg"
              onClick={connectGitHub}
            >
              <Github className="h-5 w-5" />
              Connect GitHub Account
            </Button>
            <Button variant="outline" size="lg" className="px-8 py-6 text-lg">
              <Eye className="h-5 w-5" />
              View Demo
            </Button>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <Card className="bg-card border-border hover:shadow-card transition-all duration-300 transform hover:scale-105">
              <CardContent className="p-6 text-center space-y-4">
                <div className="p-3 bg-gradient-primary rounded-full w-fit mx-auto">
                  <Shield className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Full Code Audit</h3>
                <p className="text-muted-foreground">
                  Comprehensive analysis of all your repositories against requirements.txt specifications
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border hover:shadow-card transition-all duration-300 transform hover:scale-105">
              <CardContent className="p-6 text-center space-y-4">
                <div className="p-3 bg-gradient-success rounded-full w-fit mx-auto">
                  <Zap className="h-6 w-6 text-success-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Real-time Monitoring</h3>
                <p className="text-muted-foreground">
                  Instant notifications when files are created or updated that violate requirements
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border hover:shadow-card transition-all duration-300 transform hover:scale-105">
              <CardContent className="p-6 text-center space-y-4">
                <div className="p-3 bg-warning rounded-full w-fit mx-auto">
                  <AlertTriangle className="h-6 w-6 text-warning-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Smart Alerts</h3>
                <p className="text-muted-foreground">
                  Get detailed reports on violations with suggestions for fixes and compliance
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 pt-16 border-t border-border">
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground">100%</div>
              <div className="text-muted-foreground">Automated</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground">Real-time</div>
              <div className="text-muted-foreground">Monitoring</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground">Zero</div>
              <div className="text-muted-foreground">Configuration</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;