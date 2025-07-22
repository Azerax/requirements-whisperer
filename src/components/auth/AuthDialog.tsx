import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Github, Mail, Lock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthSuccess: (user: any) => void;
}

const AuthDialog = ({ open, onOpenChange, onAuthSuccess }: AuthDialogProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const { toast } = useToast();

  const handleGitHubAuth = async () => {
    setLoading(true);
    try {
      // Simulate GitHub OAuth - in a real app this would redirect to GitHub
      const mockUser = {
        id: 'github_' + Math.random().toString(36).substr(2, 9),
        name: 'GitHub User',
        email: 'user@github.com',
        avatar_url: 'https://github.com/github.png',
        provider: 'github'
      };
      
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      onAuthSuccess(mockUser);
      onOpenChange(false);
      
      toast({
        title: "Connected to GitHub",
        description: "Successfully connected your GitHub account."
      });
    } catch (error: any) {
      toast({
        title: "Authentication Error",
        description: "Failed to connect to GitHub",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Simulate email authentication
      const mockUser = {
        id: 'email_' + Math.random().toString(36).substr(2, 9),
        name: name || 'User',
        email: email,
        avatar_url: null,
        provider: 'email'
      };
      
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      onAuthSuccess(mockUser);
      onOpenChange(false);
      
      if (!isLogin) {
        toast({
          title: "Account Created",
          description: "Your account has been created successfully."
        });
      } else {
        toast({
          title: "Signed In",
          description: "Welcome back!"
        });
      }
    } catch (error: any) {
      toast({
        title: "Authentication Error",
        description: "Authentication failed",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {isLogin ? "Sign In" : "Create Account"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Button 
            onClick={handleGitHubAuth}
            disabled={loading}
            className="w-full"
            variant="hero"
          >
            <Github className="h-4 w-4" />
            Continue with GitHub
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>
          
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  minLength={6}
                  required
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>
          
          <div className="text-center text-sm">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline"
            >
              {isLogin 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;