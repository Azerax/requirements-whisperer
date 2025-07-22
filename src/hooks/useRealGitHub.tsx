import { useState, useEffect, createContext, useContext } from "react";
import { RealGitHubClient, GitHubUser } from "@/lib/real-github";

interface GitHubContextType {
  user: GitHubUser | null;
  loading: boolean;
  apiClient: RealGitHubClient | null;
  connectWithUsername: (username: string) => Promise<void>;
  connectWithToken: (token: string) => Promise<void>;
  disconnect: () => void;
  error: string | null;
}

const GitHubContext = createContext<GitHubContextType | undefined>(undefined);

export const GitHubProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiClient, setApiClient] = useState<RealGitHubClient | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing connection
    const savedUser = localStorage.getItem('github_user');
    const savedToken = localStorage.getItem('github_token');
    
    if (savedUser && savedToken) {
      try {
        const userData = JSON.parse(savedUser);
        const client = new RealGitHubClient(savedToken);
        setUser(userData);
        setApiClient(client);
      } catch (error) {
        localStorage.removeItem('github_user');
        localStorage.removeItem('github_token');
      }
    }
    setLoading(false);
  }, []);

  const connectWithUsername = async (username: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const client = new RealGitHubClient(); // No token for public access
      const userData = await client.getUser(username);
      
      setUser(userData);
      setApiClient(client);
      
      // Save user data (no token for public access)
      localStorage.setItem('github_user', JSON.stringify(userData));
      localStorage.setItem('github_access_type', 'public');
      
    } catch (err: any) {
      setError(`Failed to find GitHub user: ${username}`);
    } finally {
      setLoading(false);
    }
  };

  const connectWithToken = async (token: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const client = new RealGitHubClient(token);
      const userData = await client.getCurrentUser();
      
      setUser(userData);
      setApiClient(client);
      
      // Save user data and token
      localStorage.setItem('github_user', JSON.stringify(userData));
      localStorage.setItem('github_token', token);
      localStorage.setItem('github_access_type', 'private');
      
    } catch (err: any) {
      setError('Invalid GitHub token or API error');
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    setUser(null);
    setApiClient(null);
    setError(null);
    localStorage.removeItem('github_user');
    localStorage.removeItem('github_token');
    localStorage.removeItem('github_access_type');
  };

  return (
    <GitHubContext.Provider value={{ 
      user, 
      loading, 
      apiClient, 
      connectWithUsername, 
      connectWithToken, 
      disconnect, 
      error 
    }}>
      {children}
    </GitHubContext.Provider>
  );
};

export const useGitHub = () => {
  const context = useContext(GitHubContext);
  if (context === undefined) {
    throw new Error("useGitHub must be used within a GitHubProvider");
  }
  return context;
};