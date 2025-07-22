import { useState } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import Dashboard from "@/components/Dashboard";

const Index = () => {
  const [isConnected, setIsConnected] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {isConnected ? <Dashboard /> : <HeroSection />}
    </div>
  );
};

export default Index;
