import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import Replicate from 'replicate'

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
  console.log('[generate3d] REPLICATE_API_TOKEN present:', !!apiKey, 'length:', apiKey?.length)
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
    const timestamp = Date.now()
    const imgMime = mimeType || 'image/jpeg'
    const imgExt = imgMime.includes('png') ? 'png' : imgMime.includes('webp') ? 'webp' : 'jpg'

    // Step 1: Upload input image to Supabase Storage to get a public URL for Replicate
    console.log('[generate3d] Uploading input image to Supabase...')
    const imgBuffer = Buffer.from(imageBase64, 'base64')
    const inputFileName = `${userId}/${timestamp}-input.${imgExt}`
    const { error: inputUploadError } = await supabase.storage
      .from('generated-images')
      .upload(inputFileName, imgBuffer, { contentType: imgMime, upsert: false })
    if (inputUploadError) throw new Error(`Input image upload failed: ${inputUploadError.message}`)
    const { data: { publicUrl: inputImageUrl } } = supabase.storage
      .from('generated-images')
      .getPublicUrl(inputFileName)
    console.log('[generate3d] Input image public URL:', inputImageUrl)

    // Step 2: Call Trellis with the public URL
    const replicate = new Replicate({ auth: apiKey })
    console.log('[generate3d] Token prefix:', apiKey.slice(0, 8))
    console.log('[generate3d] Calling replicate.run() — this can take 3-5 minutes...')
    const output: any = await replicate.run(
      'firtoz/trellis:e8f6c45206993f297372f5436b90350817bd9b4a0d52d2a76df50c1c8afa2b3c',
      { input: { images: [inputImageUrl] } }
    )
    console.log('[generate3d] Full output:', JSON.stringify(output))

    // Step 3: Parse output — Trellis returns { color_video, combined_video, gaussian_ply, model_file }
    const rawVideoUrl: string | null = output?.combined_video || output?.color_video || null
    const rawGlbUrl: string | null = output?.model_file || output?.gaussian_ply || null

    if (!rawVideoUrl && !rawGlbUrl) {
      generationFailed = true
      throw new Error('No output returned from model')
    }

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
