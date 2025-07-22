import { Button } from "@/components/ui/button";
import { Github, Shield, Settings } from "lucide-react";

const Header = () => {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Unlovable</h1>
              <p className="text-xs text-muted-foreground">Code Compliance Monitor</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="hero" className="gap-2">
              <Github className="h-4 w-4" />
              Connect GitHub
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;