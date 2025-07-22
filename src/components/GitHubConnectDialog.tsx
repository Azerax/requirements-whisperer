import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Github, User, Key } from "lucide-react";
import { useGitHub } from "@/hooks/useRealGitHub";
import { useToast } from "@/hooks/use-toast";

interface GitHubConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GitHubConnectDialog = ({ open, onOpenChange }: GitHubConnectDialogProps) => {
  const [mode, setMode] = useState<'username' | 'token'>('username');
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const { connectWithUsername, connectWithToken } = useGitHub();
  const { toast } = useToast();

  const handleUsernameConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    try {
      await connectWithUsername(username.trim());
      onOpenChange(false);
      toast({
        title: "Connected!",
        description: `Connected to ${username}'s public repositories`
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Please check the username and try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTokenConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setLoading(true);
    try {
      await connectWithToken(token.trim());
      onOpenChange(false);
      toast({
        title: "Connected!",
        description: "Connected with personal access token"
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Invalid token or API error",
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
          <DialogTitle className="text-center flex items-center gap-2 justify-center">
            <Github className="h-5 w-5" />
            Connect to GitHub
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button 
              variant={mode === 'username' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('username')}
              className="flex-1"
            >
              <User className="h-4 w-4 mr-2" />
              Public Repos
            </Button>
            <Button 
              variant={mode === 'token' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('token')}
              className="flex-1"
            >
              <Key className="h-4 w-4 mr-2" />
              Private Access
            </Button>
          </div>

          {mode === 'username' ? (
            <form onSubmit={handleUsernameConnect} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">GitHub Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter GitHub username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Access public repositories only
                </p>
              </div>
              
              <Button type="submit" className="w-full" disabled={loading || !username.trim()}>
                {loading ? 'Connecting...' : 'Connect to Public Repos'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleTokenConnect} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token">Personal Access Token</Label>
                <Input
                  id="token"
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxx"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  <a 
                    href="https://github.com/settings/tokens" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Create a token
                  </a> with 'repo' scope for private repositories
                </p>
              </div>
              
              <Button type="submit" className="w-full" disabled={loading || !token.trim()}>
                {loading ? 'Connecting...' : 'Connect with Token'}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GitHubConnectDialog;