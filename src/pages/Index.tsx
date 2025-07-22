import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import Dashboard from "@/components/Dashboard";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/toaster";

const IndexContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {user ? <Dashboard /> : <HeroSection />}
    </div>
  );
};

const Index = () => {
  return (
    <AuthProvider>
      <IndexContent />
      <Toaster />
    </AuthProvider>
  );
};

export default Index;
