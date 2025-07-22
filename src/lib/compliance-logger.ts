import { supabase } from '@/integrations/supabase/client'

// Database service for compliance logging
export class ComplianceLogger {
  
  async upsertRepository(owner: string, name: string, url: string) {
    try {
      // Strict input validation and sanitization
      if (!owner || !name || !url || 
          typeof owner !== 'string' || typeof name !== 'string' || typeof url !== 'string') {
        throw new Error('Invalid input parameters')
      }
      
      // Remove any SQL injection patterns and dangerous characters
      const cleanString = (str: string): string => {
        return str
          .replace(/['"`;\\]/g, '') // Remove SQL injection characters
          .replace(/[<>]/g, '') // Remove HTML injection
          .trim()
      }
      
      const sanitizedOwner = cleanString(owner).slice(0, 50)
      const sanitizedName = cleanString(name).slice(0, 50)
      const sanitizedUrl = cleanString(url).slice(0, 200)
      
      // Validate URL format
      try {
        new URL(sanitizedUrl)
      } catch {
        throw new Error('Invalid URL format')
      }
      
      // Validate alphanumeric + common chars only
      const validPattern = /^[a-zA-Z0-9._-]+$/
      if (!validPattern.test(sanitizedOwner) || !validPattern.test(sanitizedName)) {
        throw new Error('Invalid characters in repository name')
      }
      
      const userId = '11111111-1111-1111-1111-111111111111'
      const githubId = Math.abs(this.hashCode(`${sanitizedOwner}/${sanitizedName}`))
      
      const { data, error } = await supabase
        .rpc('upsert_repository', {
          p_name: sanitizedName,
          p_full_name: `${sanitizedOwner}/${sanitizedName}`,
          p_github_id: githubId,
          p_user_id: userId
        })

      if (error) {
        throw new Error('Database operation failed')
      }

      return data[0]
    } catch (error) {
      throw error instanceof Error ? error : new Error('Operation failed')
    }
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  async createAudit(repositoryId: string) {
    try {
      // Strict UUID validation
      if (!repositoryId || typeof repositoryId !== 'string') {
        throw new Error('Invalid repository ID')
      }
      
      // Validate UUID format strictly
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidPattern.test(repositoryId)) {
        throw new Error('Invalid UUID format')
      }
      
      const { data, error } = await supabase
        .rpc('create_audit', {
          p_repository_id: repositoryId
        })

      if (error) {
        throw new Error('Database operation failed')
      }

      return data[0]
    } catch (error) {
      throw error instanceof Error ? error : new Error('Operation failed')
    }
  }

  async logViolation(
    auditId: string,
    repositoryId: string,
    filePath: string,
    violationType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string,
    category: string,
    lineNumber?: number
  ) {
    try {
      // Strict validation for all inputs
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      
      if (!uuidPattern.test(auditId) || !uuidPattern.test(repositoryId)) {
        throw new Error('Invalid UUID format')
      }
      
      if (!filePath || !violationType || !description || 
          typeof filePath !== 'string' || typeof violationType !== 'string' || typeof description !== 'string') {
        throw new Error('Invalid input parameters')
      }
      
      const validSeverities = ['low', 'medium', 'high', 'critical'] as const
      if (!validSeverities.includes(severity)) {
        throw new Error('Invalid severity level')
      }
      
      // Aggressive sanitization
      const cleanString = (str: string): string => {
        return str
          .replace(/['"`;\\<>]/g, '') // Remove dangerous characters
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim()
      }
      
      const sanitizedFilePath = cleanString(filePath).slice(0, 255)
      const sanitizedViolationType = cleanString(violationType).slice(0, 50)
      const sanitizedDescription = cleanString(description).slice(0, 500)
      const sanitizedCategory = cleanString(category || '').slice(0, 50)
      
      // Validate line number if provided
      if (lineNumber !== undefined && (typeof lineNumber !== 'number' || lineNumber < 0 || lineNumber > 999999)) {
        throw new Error('Invalid line number')
      }
      
      const { error } = await supabase
        .rpc('log_violation', {
          p_audit_id: auditId,
          p_repository_id: repositoryId,
          p_file_path: sanitizedFilePath,
          p_violation_type: sanitizedViolationType,
          p_severity: severity,
          p_description: sanitizedDescription
        })

      if (error) {
        throw new Error('Database operation failed')
      }
    } catch (error) {
      throw error instanceof Error ? error : new Error('Operation failed')
    }
  }

  async completeAudit(
    auditId: string,
    totalFiles: number,
    filesWithViolations: number,
    compliantFiles: number,
    totalViolations: number
  ) {
    try {
      // Strict UUID validation
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidPattern.test(auditId)) {
        throw new Error('Invalid UUID format')
      }
      
      // Validate all numeric inputs
      const numbers = [totalFiles, filesWithViolations, compliantFiles, totalViolations]
      if (numbers.some(n => typeof n !== 'number' || n < 0 || n > 999999 || !Number.isInteger(n))) {
        throw new Error('Invalid numeric parameters')
      }
      
      const { error } = await supabase
        .rpc('complete_audit', {
          p_audit_id: auditId,
          p_total_files: totalFiles,
          p_violation_count: totalViolations,
          p_compliant_files: compliantFiles
        })

      if (error) {
        throw new Error('Database operation failed')
      }
    } catch (error) {
      throw error instanceof Error ? error : new Error('Operation failed')
    }
  }

  async getRecentViolations(limit = 10) {
    try {
      // Strict limit validation
      if (typeof limit !== 'number' || limit < 1 || limit > 50 || !Number.isInteger(limit)) {
        limit = 10
      }
      
      const { data, error } = await supabase
        .from('violations')
        .select(`
          id,
          file_path,
          violation_type,
          severity,
          description,
          created_at,
          repositories!inner(name, full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        return []
      }

      return data || []
    } catch {
      return []
    }
  }

  async getRepositoryStats() {
    try {
      const { data, error } = await supabase
        .from('repositories')
        .select(`
          id,
          name,
          full_name,
          last_synced_at,
          audits!inner(
            violation_count,
            status,
            completed_at
          )
        `)
        .order('last_synced_at', { ascending: false })
        .limit(100)

      if (error) {
        return []
      }

      return data || []
    } catch {
      return []
    }
  }
}

export const complianceLogger = new ComplianceLogger()