import { useState, useEffect, createContext, useContext } from "react";

interface GitHubUser {
  id: string;
  login: string;
  name: string;
  avatar_url: string;
  access_token: string;
}

interface GitHubContextType {
  user: GitHubUser | null;
  loading: boolean;
  connectGitHub: () => void;
  disconnect: () => void;
}

const GitHubContext = createContext<GitHubContextType | undefined>(undefined);

export const GitHubProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing GitHub connection
    const savedUser = localStorage.getItem('github_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Failed to parse saved GitHub user:', error);
        localStorage.removeItem('github_user');
      }
    }
    setLoading(false);
  }, []);

  const connectGitHub = () => {
    // In a real app, this would redirect to GitHub OAuth
    // For demo purposes, we'll simulate the connection
    const mockGitHubUser: GitHubUser = {
      id: 'gh_' + Math.random().toString(36).substr(2, 9),
      login: 'developer',
      name: 'GitHub Developer',
      avatar_url: 'https://github.com/github.png',
      access_token: 'mock_token_' + Math.random().toString(36).substr(2, 16)
    };
    
    setUser(mockGitHubUser);
    localStorage.setItem('github_user', JSON.stringify(mockGitHubUser));
  };

  const disconnect = () => {
    setUser(null);
    localStorage.removeItem('github_user');
  };

  return (
    <GitHubContext.Provider value={{ user, loading, connectGitHub, disconnect }}>
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