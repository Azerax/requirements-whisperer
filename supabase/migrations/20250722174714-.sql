-- Create tables to log compliance analysis results

-- Table to store repository information
CREATE TABLE public.repositories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner TEXT NOT NULL,
  url TEXT NOT NULL,
  last_analyzed TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(owner, name)
);

-- Table to store audit runs
CREATE TABLE public.audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  total_files INTEGER NOT NULL DEFAULT 0,
  files_with_violations INTEGER NOT NULL DEFAULT 0,
  compliant_files INTEGER NOT NULL DEFAULT 0,
  total_violations INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table to store individual violations
CREATE TABLE public.violations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  line_number INTEGER,
  violation_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth required as requested)
CREATE POLICY "Allow all operations on repositories" 
ON public.repositories 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all operations on audits" 
ON public.audits 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all operations on violations" 
ON public.violations 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_repositories_owner_name ON public.repositories(owner, name);
CREATE INDEX idx_audits_repository_id ON public.audits(repository_id);
CREATE INDEX idx_audits_status ON public.audits(status);
CREATE INDEX idx_violations_audit_id ON public.violations(audit_id);
CREATE INDEX idx_violations_repository_id ON public.violations(repository_id);
CREATE INDEX idx_violations_severity ON public.violations(severity);
CREATE INDEX idx_violations_category ON public.violations(category);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_repositories_updated_at
BEFORE UPDATE ON public.repositories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();