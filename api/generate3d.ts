import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
)

const CREDITS_PER_GENERATION = 2

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[generate3d] Request received:', { method: req.method })

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { imageBase64, mimeType } = req.body

  if (!imageBase64) {
    return res.status(400).json({ error: 'Image is required' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Please sign in to generate 3D models' })
  }

  const apiKey = process.env.REPLICATE_API_TOKEN
  if (!apiKey) {
    return res.status(500).json({ error: 'Replicate API key not configured' })
  }

  let userId: string
  let currentCredits: number

  try {
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authentication token' })
    }

    userId = user.id
    console.log('[generate3d] User verified:', { userId })

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return res.status(500).json({ error: 'Failed to fetch user profile' })
    }

    if (!profile || profile.credits < CREDITS_PER_GENERATION) {
      return res.status(402).json({ error: `Insufficient credits. 3D generation costs ${CREDITS_PER_GENERATION} credits.` })
    }

    currentCredits = profile.credits

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        credits: profile.credits - CREDITS_PER_GENERATION,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .eq('credits', profile.credits)
      .select()
      .single()

    if (updateError || !updatedProfile) {
      return res.status(409).json({ error: 'Credit check failed, please try again' })
    }
  } catch (error: any) {
    console.error('[generate3d] Auth error:', error)
    return res.status(500).json({ error: 'Failed to verify credits' })
  }

  let generationFailed = false

  try {
    const imageDataUrl = `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait',
      },
      body: JSON.stringify({
        version: 'e8f6c45206993f297372f5436b90350817bd9b4a0d52d2a76df50c1c8afa2b3c',
        input: {
          images: [imageDataUrl],
        },
      }),
    })

    const prediction = await response.json()
    console.log('[generate3d] Replicate response:', { status: response.status, ok: response.ok })

    if (!response.ok) {
      generationFailed = true
      throw new Error(prediction.detail || 'Failed to create prediction')
    }

    // Poll for completion
    let result = prediction
    const pollStartTime = Date.now()

    while (result.status !== 'succeeded' && result.status !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 2000))

      const pollResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${result.id}`,
        { headers: { 'Authorization': `Token ${apiKey}` } }
      )

      if (!pollResponse.ok) {
        generationFailed = true
        throw new Error(`Failed to poll prediction status: ${pollResponse.status}`)
      }

      result = await pollResponse.json()
      console.log('[generate3d] Poll result:', { status: result.status, id: result.id })

      if (Date.now() - pollStartTime > 100000) {
        generationFailed = true
        throw new Error('Processing timeout')
      }
    }

    if (result.status === 'failed') {
      generationFailed = true
      throw new Error(result.error || '3D generation failed')
    }

    // Parse output — Trellis returns { video: url, mesh: url } or array [video, glb]
    const output = result.output
    let rawVideoUrl: string | null = null
    let rawGlbUrl: string | null = null

    if (Array.isArray(output)) {
      for (const url of output) {
        if (typeof url === 'string') {
          if (url.includes('.mp4') || url.includes('video')) rawVideoUrl = url
          else if (url.includes('.glb') || url.includes('mesh') || url.includes('3d')) rawGlbUrl = url
        }
      }
      // Fallback: first = video, second = glb
      if (!rawVideoUrl && output[0]) rawVideoUrl = output[0]
      if (!rawGlbUrl && output[1]) rawGlbUrl = output[1]
    } else if (output && typeof output === 'object') {
      rawVideoUrl = output.video || output.video_file || null
      rawGlbUrl = output.mesh || output.model_file || output.glb || null
    }

    if (!rawVideoUrl && !rawGlbUrl) {
      generationFailed = true
      throw new Error('No output returned from model')
    }

    const timestamp = Date.now()

    // Upload video to Supabase Storage
    let videoUrl: string | null = null
    if (rawVideoUrl) {
      const videoRes = await fetch(rawVideoUrl)
      if (videoRes.ok) {
        const videoBuffer = await videoRes.arrayBuffer()
        const videoFileName = `${userId}/${timestamp}-preview.mp4`
        const { error: videoUploadError } = await supabase.storage
          .from('generated-images')
          .upload(videoFileName, videoBuffer, { contentType: 'video/mp4', upsert: false })
        if (!videoUploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('generated-images')
            .getPublicUrl(videoFileName)
          videoUrl = publicUrl
        } else {
          console.error('[generate3d] Video upload failed:', videoUploadError)
          videoUrl = rawVideoUrl
        }
      }
    }

    // Upload GLB to Supabase Storage
    let glbUrl: string | null = null
    if (rawGlbUrl) {
      const glbRes = await fetch(rawGlbUrl)
      if (glbRes.ok) {
        const glbBuffer = await glbRes.arrayBuffer()
        const glbFileName = `${userId}/${timestamp}-model.glb`
        const { error: glbUploadError } = await supabase.storage
          .from('generated-images')
          .upload(glbFileName, glbBuffer, { contentType: 'model/gltf-binary', upsert: false })
        if (!glbUploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('generated-images')
            .getPublicUrl(glbFileName)
          glbUrl = publicUrl
        } else {
          console.error('[generate3d] GLB upload failed:', glbUploadError)
          glbUrl = rawGlbUrl
        }
      }
    }

    // Log transaction
    void supabase
      .from('generation_logs')
      .insert({ user_id: userId, tool: '3d-generator', created_at: new Date().toISOString() })

    return res.status(200).json({ video: videoUrl, glb: glbUrl })
  } catch (error: any) {
    console.error('[generate3d] Error:', error?.message)

    if (generationFailed) {
      try {
        await supabase
          .from('profiles')
          .update({ credits: currentCredits, updated_at: new Date().toISOString() })
          .eq('id', userId)
        console.log(`[generate3d] Refunded ${CREDITS_PER_GENERATION} credits to user ${userId}`)
      } catch (refundError) {
        console.error('[generate3d] Failed to refund credits:', refundError)
      }
    }

    return res.status(500).json({ error: error.message || 'Failed to generate 3D model' })
  }
}
