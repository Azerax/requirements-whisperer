import { useState, useEffect, createContext, useContext } from "react";
import { GitHubApiClient, GitHubUser } from "@/lib/github-api";

interface GitHubContextType {
  user: GitHubUser | null;
  loading: boolean;
  apiClient: GitHubApiClient | null;
  connectGitHub: () => void;
  disconnect: () => void;
  error: string | null;
}

const GitHubContext = createContext<GitHubContextType | undefined>(undefined);

export const GitHubProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiClient, setApiClient] = useState<GitHubApiClient | null>(null);
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
      // In a real implementation, this would exchange the code for an access token
      // via your backend server. For now, we'll show how this would work:
      
      // This would be done on your backend:
      // const response = await fetch('/api/auth/github/callback', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ code })
      // });
      // const { access_token } = await response.json();
      
      setError("OAuth callback received. In production, this would exchange the code for an access token via your backend.");
    } catch (err) {
      setError("Failed to complete GitHub authentication");
    } finally {
      setLoading(false);
    }
  };

  const initializeWithToken = async (token: string) => {
    try {
      const client = new GitHubApiClient(token);
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
    // In production, you would redirect to GitHub OAuth:
    // const clientId = process.env.GITHUB_CLIENT_ID;
    // const redirectUri = encodeURIComponent(window.location.origin);
    // const scope = encodeURIComponent('repo read:user');
    // window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    
    // For demo purposes, prompt for a personal access token
    const token = prompt(
      "For demo purposes, enter a GitHub Personal Access Token with 'repo' scope.\n\n" +
      "To create one:\n" +
      "1. Go to GitHub Settings > Developer settings > Personal access tokens\n" +
      "2. Generate new token with 'repo' scope\n" +
      "3. Copy and paste it here"
    );
    
    if (token) {
      localStorage.setItem('github_access_token', token);
      initializeWithToken(token);
    }
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