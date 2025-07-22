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
    // Check for OAuth callback or existing token
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      // Handle OAuth callback
      handleOAuthCallback(code);
    } else {
      // Check for existing token
      const savedToken = localStorage.getItem('github_access_token');
      if (savedToken) {
        initializeWithToken(savedToken);
      } else {
        setLoading(false);
      }
    }
  }, []);

  const handleOAuthCallback = async (code: string) => {
    try {
      setLoading(true);
      
      // Exchange code for access token using a public proxy service
      const response = await fetch('https://github-oauth-proxy.vercel.app/api/oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          code,
          client_id: 'Ov23liPQF0gUs3eOOSy8'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to authenticate with GitHub');
      }
      
      const { access_token } = await response.json();
      localStorage.setItem('github_access_token', access_token);
      await initializeWithToken(access_token);
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err) {
      setError("Failed to complete GitHub authentication");
    } finally {
      setLoading(false);
    }
  };

  const initializeWithToken = async (token: string) => {
    try {
      const client = new SimpleGitHubClient(token);
      const userData = await client.getCurrentUser();
      
      setApiClient(client);
      setUser(userData);
      setError(null);
    } catch (err) {
      setError("Invalid or expired GitHub token");
      localStorage.removeItem('github_access_token');
    } finally {
      setLoading(false);
    }
  };

  const connectGitHub = () => {
    // Simple GitHub OAuth redirect - no tokens needed!
    const clientId = 'Ov23liPQF0gUs3eOOSy8'; // GitHub OAuth App (public client ID)
    const redirectUri = encodeURIComponent(window.location.origin);
    const scope = encodeURIComponent('public_repo read:user');
    
    // Redirect to GitHub OAuth
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`;
  };

  const disconnect = () => {
    setUser(null);
    setApiClient(null);
    setError(null);
    localStorage.removeItem('github_access_token');
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