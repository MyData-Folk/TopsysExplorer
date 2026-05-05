import { supabase } from './supabaseClient'
import { OccupancyData, AppConfig } from '../types'
import { hydrateReport } from '../utils/helpers'

export interface CloudReportMeta {
  id: string
  owner_id: string
  filename: string
  period_str: string
  establishment_name: string
  upload_date: string
}

function requireClient() {
  if (!supabase) throw new Error('Supabase non configuré — ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.local')
  return supabase
}

export async function saveReport(report: OccupancyData): Promise<string> {
  const client = requireClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error('Non connecté')

  const { data, error } = await client
    .from('user_reports')
    .insert({
      owner_id: user.id,
      filename: report.fileName || 'rapport',
      period_str: report.periodStr || '',
      establishment_name: report.establishmentName || '',
      data: report,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Erreur sauvegarde : ${error.message}`)
  if (!data) throw new Error('Erreur sauvegarde : aucune donnée retournée')
  return data.id
}

export async function listReports(): Promise<CloudReportMeta[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('user_reports')
    .select('id, owner_id, filename, period_str, establishment_name, upload_date')
    .order('upload_date', { ascending: false })

  if (error) throw new Error(`Erreur listage : ${error.message}`)
  return (data ?? []) as CloudReportMeta[]
}

export async function downloadReport(id: string): Promise<OccupancyData> {
  const client = requireClient()
  const { data, error } = await client
    .from('user_reports')
    .select('data')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') throw new Error('Rapport introuvable ou accès refusé')
    throw new Error(`Erreur téléchargement : ${error.message}`)
  }

  const raw = data.data
  if (typeof raw === 'string') {
    try { return hydrateReport(JSON.parse(raw) as OccupancyData) }
    catch { throw new Error('Contenu JSON corrompu') }
  }
  return hydrateReport(raw as OccupancyData)
}

export async function deleteSupabaseReport(id: string): Promise<void> {
  const client = requireClient()
  const { error } = await client
    .from('user_reports')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Erreur suppression : ${error.message}`)
}

export async function saveConfig(config: AppConfig): Promise<void> {
  const client = requireClient()
  const { data: authData, error: authError } = await client.auth.getUser()
  if (authError || !authData.user) throw new Error('Non connecté')

  const { error } = await client
    .from('user_config')
    .upsert(
      { owner_id: authData.user.id, data: config },
      { onConflict: 'owner_id' }
    )

  if (error) throw new Error(`Erreur sauvegarde config : ${error.message}`)
}

// Returns Partial<AppConfig> — caller must merge with DEFAULT_CONFIG before use
export async function loadCloudConfig(): Promise<Partial<AppConfig> | null> {
  const client = requireClient()
  const { data, error } = await client
    .from('user_config')
    .select('data')
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Erreur chargement config : ${error.message}`)
  }

  if (!data?.data) return null

  const raw = data.data
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as Partial<AppConfig> }
    catch { return null }
  }
  return raw as Partial<AppConfig>
}
