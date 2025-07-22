import { useState, useEffect, createContext, useContext } from "react";
import { SimpleGitHubClient, GitHubUser } from "@/lib/simple-github";

interface GitHubContextType {
  user: GitHubUser | null;
  loading: boolean;
  apiClient: SimpleGitHubClient | null;
  connectGitHub: () => void;
  disconnect: () => void;
  error: string | null;
}

const GitHubContext = createContext<GitHubContextType | undefined>(undefined);

export const GitHubProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiClient, setApiClient] = useState<SimpleGitHubClient | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing demo connection
    const demoConnected = localStorage.getItem('github_demo_connected');
    if (demoConnected) {
      // Restore demo connection
      const demoUser: GitHubUser = {
        id: 12345,
        login: 'demo-user',
        name: 'Demo Developer',
        avatar_url: 'https://github.com/github.png',
        email: 'demo@example.com'
      };
      
      const demoClient = new SimpleGitHubClient('demo_token');
      setUser(demoUser);
      setApiClient(demoClient);
    }
    setLoading(false);
  }, []);

  const disconnect = () => {
    setUser(null);
    setApiClient(null);
    setError(null);
    localStorage.removeItem('github_demo_connected');
  };

  const connectGitHub = () => {
    // Simple demo connection - no external OAuth needed
    setLoading(true);
    
    // Simulate GitHub connection with demo data
    setTimeout(() => {
      const demoUser: GitHubUser = {
        id: 12345,
        login: 'demo-user',
        name: 'Demo Developer',
        avatar_url: 'https://github.com/github.png',
        email: 'demo@example.com'
      };
      
      const demoClient = new SimpleGitHubClient('demo_token');
      
      setUser(demoUser);
      setApiClient(demoClient);
      setError(null);
      setLoading(false);
      
      // Store demo connection
      localStorage.setItem('github_demo_connected', 'true');
    }, 1500); // Simulate loading time
  };


  return (
    <GitHubContext.Provider value={{ user, loading, apiClient, connectGitHub, disconnect, error }}>
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