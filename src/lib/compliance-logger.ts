import { supabase } from '@/integrations/supabase/client'

// Database service for compliance logging
export class ComplianceLogger {
  
  async upsertRepository(owner: string, name: string, url: string) {
    console.log(`📊 Upserting repository: ${owner}/${name}`)
    
    // Extract GitHub ID from URL or use a placeholder
    const githubId = Math.floor(Math.random() * 1000000) // Placeholder for now
    
    const { data, error } = await supabase
      .from('repositories')
      .upsert({
        name,
        full_name: `${owner}/${name}`,
        github_id: githubId,
        user_id: '00000000-0000-0000-0000-000000000000', // Will be updated when auth is implemented
        last_synced_at: new Date().toISOString()
      }, {
        onConflict: 'github_id'
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Failed to upsert repository:', error)
      throw error
    }

    console.log(`✅ Repository upserted: ${data.id}`)
    return data
  }

  async createAudit(repositoryId: string) {
    console.log(`📊 Creating audit for repository: ${repositoryId}`)
    
    const { data, error } = await supabase
      .from('audits')
      .insert({
        repository_id: repositoryId,
        status: 'in_progress'
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Failed to create audit:', error)
      throw error
    }

    console.log(`✅ Audit created: ${data.id}`)
    return data
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
    const { error } = await supabase
      .from('violations')
      .insert({
        audit_id: auditId,
        repository_id: repositoryId,
        file_path: filePath,
        line_number: lineNumber,
        violation_type: violationType,
        severity,
        description,
        category
      })

    if (error) {
      console.error('❌ Failed to log violation:', error)
      throw error
    }
  }

  async completeAudit(
    auditId: string,
    totalFiles: number,
    filesWithViolations: number,
    compliantFiles: number,
    totalViolations: number
  ) {
    console.log(`📊 Completing audit: ${auditId}`)
    
    const { error } = await supabase
      .from('audits')
      .update({
        total_files: totalFiles,
        compliant_files: compliantFiles,
        violation_count: totalViolations,
        completed_at: new Date().toISOString(),
        status: 'completed'
      })
      .eq('id', auditId)

    if (error) {
      console.error('❌ Failed to complete audit:', error)
      throw error
    }

    console.log(`✅ Audit completed: ${auditId}`)
  }

  async getRecentViolations(limit = 10) {
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
  }

  async getRepositoryStats() {
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
  }
}

export const complianceLogger = new ComplianceLogger()