import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { AuthModal } from './AuthModal'
import { FavoritesModal } from './FavoritesModal'
import { PricingModal } from './PricingModal'
import './Header.css'

export default function Header() {
  const { user, profile, signOut, loading, refreshProfile } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showFavoritesModal, setShowFavoritesModal] = useState(false)
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [loadingTimeout, setLoadingTimeout] = useState(false)
  const [showRetry, setShowRetry] = useState(false)
  const [isEmbedded, setIsEmbedded] = useState(false)

  useEffect(() => {
    try { setIsEmbedded(window.self !== window.top) } catch { setIsEmbedded(true) }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'true' && user) {
      refreshProfile()
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [user, refreshProfile])

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => { setLoadingTimeout(true); setShowRetry(true) }, 5000)
      return () => clearTimeout(timer)
    } else {
      setLoadingTimeout(false)
      setShowRetry(false)
    }
  }, [loading])

  const handleBuyCreditsClick = () => {
    if (!user) setShowAuthModal(true)
    else setShowPricingModal(true)
  }

  const getAvatarUrl = () => user?.user_metadata?.avatar_url || profile?.avatar_url || null
  const getUserDisplayName = () => profile?.full_name || profile?.email?.split('@')[0] || 'User'
  const getUserInitials = () => {
    const name = getUserDisplayName()
    return name.length >= 2 ? name.substring(0, 2).toUpperCase() : name.toUpperCase() || 'U'
  }

  return (
    <>
      <header className="hub-header" role="banner">
        {!isEmbedded && (
          <a href="https://deepvortexai.art" className="back-to-hub-link">← Back to Hub</a>
        )}

        <div className="logo-display-zone">
          <div className="orbit-ring-one" />
          <div className="orbit-ring-two" />
          <div className="orbit-ring-three" />
          <img src="/deepgoldremoveetiny.png" alt="Deep Vortex" className="brand-logo-image" />
        </div>

        <h1 className="brand-title-text">AI 3D Generator</h1>
        <p className="primary-tagline">🧊 Generate 3D models from a single image with AI</p>

        <div className="hub-pills-container">
          {user ? (
            <div className="hub-pill credits-pill">
              <span className="pill-icon">🏆</span>
              <span className="pill-text">{profile?.credits ?? 0} credits</span>
            </div>
          ) : (
            <button className="hub-pill credits-pill" style={{ cursor: 'pointer' }} onClick={() => setShowAuthModal(true)}>
              <span className="pill-icon">🏆</span>
              <span className="pill-text">Sign in - Get 2 Free Credits</span>
            </button>
          )}

          <button className="hub-pill buy-credits-pill" onClick={handleBuyCreditsClick}>
            <span className="pill-icon">💳</span>
            <span className="pill-text">Buy Credits</span>
          </button>

          <button className="hub-pill favorites-pill" onClick={() => setShowFavoritesModal(true)}>
            <span className="pill-icon">⭐</span>
            <span className="pill-text">Favorites</span>
          </button>

          {user ? (
            <div className="hub-pill profile-pill">
              {getAvatarUrl() ? (
                <div className="profile-avatar">
                  <img src={getAvatarUrl()!} alt={`${getUserDisplayName()}'s avatar`} />
                </div>
              ) : (
                <div className="profile-avatar-fallback">{getUserInitials()}</div>
              )}
              <span className="profile-name">{getUserDisplayName()}</span>
              <button className="signout-btn" onClick={signOut}>Sign Out</button>
            </div>
          ) : (
            <button
              className="hub-pill signin-pill"
              onClick={() => setShowAuthModal(true)}
              disabled={loading && !loadingTimeout}
            >
              <span className="pill-icon">🔐</span>
              <span className="pill-text">{(loading && !loadingTimeout) ? 'Loading...' : 'Sign In'}</span>
            </button>
          )}

          {showRetry && (
            <button className="hub-pill retry-pill" onClick={() => { setShowRetry(false); setLoadingTimeout(false); if (user) refreshProfile() }}>
              <span className="pill-icon">🔄</span>
              <span className="pill-text">Retry</span>
            </button>
          )}
        </div>
      </header>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <FavoritesModal isOpen={showFavoritesModal} onClose={() => setShowFavoritesModal(false)} />
      <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} />
    </>
  )
}
