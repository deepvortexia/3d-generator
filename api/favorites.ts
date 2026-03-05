import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// SQL to create the table (run once in Supabase SQL editor):
//
// CREATE TABLE IF NOT EXISTS bg_favorites (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
//   result_url text NOT NULL,
//   original_url text,
//   created_at timestamptz DEFAULT now()
// );
// ALTER TABLE bg_favorites ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "own" ON bg_favorites FOR ALL USING (auth.uid() = user_id);

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
      .from('bg_favorites')
      .select('id, result_url, original_url, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: 'Failed to fetch favorites' })
    return res.status(200).json({ favorites: data || [] })
  }

  if (req.method === 'POST') {
    const { result_url, original_url } = req.body
    if (!result_url) return res.status(400).json({ error: 'result_url is required' })

    const { data, error } = await supabase
      .from('bg_favorites')
      .insert({ user_id: user.id, result_url, original_url: original_url || null })
      .select('id')
      .single()

    if (error) return res.status(500).json({ error: 'Failed to save favorite' })
    return res.status(200).json({ success: true, id: data.id })
  }

  if (req.method === 'DELETE') {
    const id = req.query.id as string
    if (!id) return res.status(400).json({ error: 'id is required' })

    const { error } = await supabase
      .from('bg_favorites')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) return res.status(500).json({ error: 'Failed to delete favorite' })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
