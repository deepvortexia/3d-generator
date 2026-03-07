import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const TOOL_TYPE = '3d'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await createClient(supabaseUrl, supabaseAnonKey).auth.getUser(token)

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid authentication token' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('favorites')
      .select('id, result_url, metadata, created_at')
      .eq('user_id', user.id)
      .eq('tool_type', TOOL_TYPE)
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: 'Failed to fetch favorites' })
    return res.status(200).json({ favorites: data || [] })
  }

  if (req.method === 'POST') {
    const { result_url, glb_url } = req.body
    if (!result_url) return res.status(400).json({ error: 'result_url is required' })

    const metadata = glb_url ? { glb_url } : {}

    const { data, error } = await supabase
      .from('favorites')
      .insert({ user_id: user.id, tool_type: TOOL_TYPE, result_url, metadata })
      .select('id')
      .single()

    if (error) return res.status(500).json({ error: 'Failed to save favorite' })
    return res.status(200).json({ success: true, id: data.id })
  }

  if (req.method === 'DELETE') {
    const id = req.query.id as string
    if (!id) return res.status(400).json({ error: 'id is required' })

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('tool_type', TOOL_TYPE)

    if (error) return res.status(500).json({ error: 'Failed to delete favorite' })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
