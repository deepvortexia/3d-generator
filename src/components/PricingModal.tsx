import { useState } from 'react'
import './PricingModal.css'
import { supabase } from '../lib/supabase'

interface PricingModalProps {
  isOpen: boolean
  onClose: () => void
}

interface PricingPack {
  name: string
  credits: number
  price: number
  popular?: boolean
}

const pricingPacks: PricingPack[] = [
  { name: 'Starter', credits: 10, price: 4.99 },
  { name: 'Basic', credits: 30, price: 9.99 },
  { name: 'Popular', credits: 75, price: 19.99, popular: true },
  { name: 'Pro', credits: 200, price: 49.99 },
  { name: 'Ultimate', credits: 500, price: 99.99 },
]

export const PricingModal = ({ isOpen, onClose }: PricingModalProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handlePurchase = async (pack: PricingPack) => {
    setIsLoading(true)
    setError('')

    try {
      // Refresh session token to prevent "Invalid authentication token" errors
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()

      // Use the refreshed session or fall back to getting current session
      const session = refreshData?.session || (await supabase.auth.getSession()).data.session

      if (!session) {
        const errorMsg = refreshError
          ? 'Session refresh failed. Please sign in again.'
          : 'Please sign in to purchase credits'
        setError(errorMsg)
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ packName: pack.name }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="pricing-modal-overlay" onClick={onClose}>
      <div className="pricing-modal" onClick={(e) => e.stopPropagation()}>
        <button className="pricing-modal-close" onClick={onClose}>×</button>

        <div className="pricing-modal-header">
          <h2>Choose Your Pack</h2>
          <p>Select the perfect credit pack for your needs</p>
        </div>

        <div className="pricing-grid">
          {pricingPacks.map((pack) => (
            <div
              key={pack.name}
              className={`pricing-card ${pack.popular ? 'popular' : ''}`}
            >
              {pack.popular && <div className="popular-badge">⭐ Popular</div>}

              <div className="pricing-card-header">
                <h3>{pack.name}</h3>
                <div className="pricing-credits">
                  <span className="credits-count">{pack.credits}</span>
                  <span className="credits-label">credits</span>
                </div>
              </div>

              <div className="pricing-card-body">
                <div className="pricing-price">
                  <span className="price-currency">$</span>
                  <span className="price-amount">{pack.price.toFixed(2)}</span>
                </div>
                <div className="pricing-perunit">
                  ${(pack.price / pack.credits).toFixed(3)} per credit
                </div>
              </div>

              <button
                className="pricing-btn"
                onClick={() => handlePurchase(pack)}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Buy Now'}
              </button>
            </div>
          ))}
        </div>

        {error && (
          <div className="pricing-error">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <div className="pricing-footer">
          <p>🔒 Secure payment powered by Stripe</p>
        </div>
      </div>
    </div>
  )
}
