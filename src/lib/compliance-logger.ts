import { supabase } from '@/integrations/supabase/client'

// Database service for compliance logging
export class ComplianceLogger {
  
  async upsertRepository(owner: string, name: string, url: string) {
    try {
      console.log(`📊 Upserting repository: ${owner}/${name}`)
      
      // Input validation
      if (!owner || !name || !url) {
        throw new Error('Owner, name, and URL are required')
      }
      
      // Sanitize inputs
      const sanitizedOwner = owner.trim().slice(0, 100)
      const sanitizedName = name.trim().slice(0, 100)
      const sanitizedUrl = url.trim().slice(0, 500)
      
      // Always use the Unlovable user ID
      const userId = '11111111-1111-1111-1111-111111111111'
      
      // Generate consistent GitHub ID based on repo name
      const githubId = Math.abs(this.hashCode(`${sanitizedOwner}/${sanitizedName}`))
      
      const { data, error } = await supabase
        .rpc('upsert_repository', {
          p_name: sanitizedName,
          p_full_name: `${sanitizedOwner}/${sanitizedName}`,
          p_github_id: githubId,
          p_user_id: userId,
          p_description: `Repository for ${sanitizedOwner}/${sanitizedName}`,
          p_url: sanitizedUrl
        })

      if (error) {
        console.error('❌ Failed to upsert repository:', error)
        throw new Error(`Database error: ${error.message}`)
      }

      console.log(`✅ Repository upserted successfully`)
      return data[0] // RPC returns array
    } catch (error) {
      console.error('❌ Repository upsert failed:', error)
      throw error instanceof Error ? error : new Error('Unknown error occurred')
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
      console.log(`📊 Creating audit for repository: ${repositoryId}`)
      
      // Input validation
      if (!repositoryId || typeof repositoryId !== 'string') {
        throw new Error('Valid repository ID is required')
      }
      
      const { data, error } = await supabase
        .rpc('create_audit', {
          p_repository_id: repositoryId
        })

      if (error) {
        console.error('❌ Failed to create audit:', error)
        throw new Error(`Database error: ${error.message}`)
      }

      console.log(`✅ Audit created successfully`)
      return data[0] // RPC returns array
    } catch (error) {
      console.error('❌ Audit creation failed:', error)
      throw error instanceof Error ? error : new Error('Unknown error occurred')
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
      // Input validation
      if (!auditId || !repositoryId || !filePath || !violationType || !description) {
        throw new Error('All required fields must be provided')
      }
      
      const validSeverities = ['low', 'medium', 'high', 'critical']
      if (!validSeverities.includes(severity)) {
        throw new Error(`Invalid severity: ${severity}`)
      }
      
      // Sanitize inputs
      const sanitizedFilePath = filePath.trim().slice(0, 500)
      const sanitizedViolationType = violationType.trim().slice(0, 100)
      const sanitizedDescription = description.trim().slice(0, 1000)
      const sanitizedCategory = category.trim().slice(0, 100)
      
      const { error } = await supabase
        .rpc('log_violation', {
          p_audit_id: auditId,
          p_repository_id: repositoryId,
          p_file_path: sanitizedFilePath,
          p_violation_type: sanitizedViolationType,
          p_severity: severity,
          p_description: sanitizedDescription,
          p_category: sanitizedCategory,
          p_line_number: lineNumber
        })

      if (error) {
        console.error('❌ Failed to log violation:', error)
        throw new Error(`Database error: ${error.message}`)
      }
    } catch (error) {
      console.error('❌ Violation logging failed:', error)
      throw error instanceof Error ? error : new Error('Unknown error occurred')
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
      console.log(`📊 Completing audit: ${auditId}`)
      
      // Input validation
      if (!auditId || typeof auditId !== 'string') {
        throw new Error('Valid audit ID is required')
      }
      if (typeof totalFiles !== 'number' || totalFiles < 0) {
        throw new Error('Total files must be a non-negative number')
      }
      if (typeof totalViolations !== 'number' || totalViolations < 0) {
        throw new Error('Total violations must be a non-negative number')
      }
      if (typeof compliantFiles !== 'number' || compliantFiles < 0) {
        throw new Error('Compliant files must be a non-negative number')
      }
      
      const { error } = await supabase
        .rpc('complete_audit', {
          p_audit_id: auditId,
          p_total_files: totalFiles,
          p_violation_count: totalViolations,
          p_compliant_files: compliantFiles
        })

      if (error) {
        console.error('❌ Failed to complete audit:', error)
        throw new Error(`Database error: ${error.message}`)
      }

      console.log(`✅ Audit completed successfully`)
    } catch (error) {
      console.error('❌ Audit completion failed:', error)
      throw error instanceof Error ? error : new Error('Unknown error occurred')
    }
  }

  async getRecentViolations(limit = 10) {
    try {
      // Input validation
      if (typeof limit !== 'number' || limit < 1 || limit > 100) {
        limit = 10 // Default to safe value
      }
      
      const { data, error } = await supabase
        .from('violations')
        .select(`
          *,
          repositories!inner(name, full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('❌ Failed to fetch recent violations:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('❌ Error fetching recent violations:', error)
      return []
    }
  }

  async getRepositoryStats() {
    try {
      const { data, error } = await supabase
        .from('repositories')
        .select(`
          *,
          audits!inner(
            violation_count,
            status,
            completed_at
          )
        `)
        .order('last_synced_at', { ascending: false })

      if (error) {
        console.error('❌ Failed to fetch repository stats:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('❌ Error fetching repository stats:', error)
      return []
    }
  }
}

export const complianceLogger = new ComplianceLogger()