import type { VercelRequest, VercelResponse } from '@vercel/node'

// DISABLED — this endpoint does NOT process payments.
// The universal Stripe webhook handler for ALL apps is at:
//   https://images.deepvortexai.art/api/webhook
//
// Only ONE Stripe webhook endpoint should be registered in the Stripe Dashboard.
// If this URL is accidentally called, return 200 so Stripe does not retry.

export const config = {
  api: { bodyParser: false },
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  console.warn('[webhook] This endpoint is disabled. Universal handler is at images.deepvortexai.art/api/webhook')
  return res.status(200).json({ received: true })
}
