-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  github_username TEXT,
  github_access_token TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create repositories table
CREATE TABLE public.repositories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  github_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  description TEXT,
  default_branch TEXT DEFAULT 'main',
  private BOOLEAN DEFAULT false,
  has_requirements_txt BOOLEAN DEFAULT false,
  requirements_content TEXT,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, github_id)
);

-- Create audits table for tracking compliance checks
CREATE TABLE public.audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  total_files INTEGER DEFAULT 0,
  compliant_files INTEGER DEFAULT 0,
  violation_count INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Create violations table for storing compliance issues
CREATE TABLE public.violations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  violation_type TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  line_number INTEGER,
  suggestion TEXT,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for repositories
CREATE POLICY "Users can view their own repositories" 
ON public.repositories 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own repositories" 
ON public.repositories 
FOR ALL 
USING (auth.uid() = user_id);

-- Create RLS policies for audits
CREATE POLICY "Users can view audits for their repositories" 
ON public.audits 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.repositories 
    WHERE repositories.id = audits.repository_id 
    AND repositories.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage audits for their repositories" 
ON public.audits 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.repositories 
    WHERE repositories.id = audits.repository_id 
    AND repositories.user_id = auth.uid()
  )
);

-- Create RLS policies for violations
CREATE POLICY "Users can view violations for their repositories" 
ON public.violations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.repositories 
    WHERE repositories.id = violations.repository_id 
    AND repositories.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage violations for their repositories" 
ON public.violations 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.repositories 
    WHERE repositories.id = violations.repository_id 
    AND repositories.user_id = auth.uid()
  )
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_repositories_updated_at
  BEFORE UPDATE ON public.repositories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_repositories_user_id ON public.repositories(user_id);
CREATE INDEX idx_repositories_github_id ON public.repositories(github_id);
CREATE INDEX idx_audits_repository_id ON public.audits(repository_id);
CREATE INDEX idx_violations_audit_id ON public.violations(audit_id);
CREATE INDEX idx_violations_repository_id ON public.violations(repository_id);
CREATE INDEX idx_violations_resolved ON public.violations(resolved);