import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './AuthModal.css'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const { signInWithGoogle, signInWithEmail } = useAuth()

  if (!isOpen) return null

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setMessage('')
    try {
      await signInWithGoogle()
    } catch (error: any) {
      setMessage(error.message || 'Failed to sign in with Google')
      setIsLoading(false)
    }
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setMessage('Please enter your email')
      return
    }

    setIsLoading(true)
    setMessage('')

    try {
      const { error } = await signInWithEmail(email)
      if (error) throw error

      setEmailSent(true)
      setMessage('Check your email for the magic link!')
    } catch (error: any) {
      setMessage(error.message || 'Failed to send magic link')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose}>×</button>

        <div className="auth-modal-header">
          <img
            src="/deepgoldremoveetiny.png"
            alt="Deep Vortex Logo"
            className="auth-modal-logo"
            aria-label="Deep Vortex AI"
          />
          <h2>Welcome to Deep Vortex AI</h2>
          <p>Sign in to get 3 free credits and explore the ecosystem!</p>
        </div>

        {!emailSent ? (
          <div className="auth-modal-content">
            <button
              className="auth-btn auth-btn-google"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <form onSubmit={handleEmailSignIn}>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input"
                disabled={isLoading}
              />
              <button
                type="submit"
                className="auth-btn auth-btn-email"
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : '✉️ Send Magic Link'}
              </button>
            </form>

            {message && (
              <div className={`auth-message ${message.includes('Check') ? 'success' : 'error'}`}>
                {message}
              </div>
            )}
          </div>
        ) : (
          <div className="auth-modal-content">
            <div className="auth-success">
              <div className="success-icon">✅</div>
              <h3>Check Your Email!</h3>
              <p>We've sent a magic link to <strong>{email}</strong></p>
              <p className="success-hint">Click the link in your email to sign in</p>
              <button className="auth-btn-secondary" onClick={onClose}>
                Got it!
              </button>
            </div>
          </div>
        )}

        <div className="auth-modal-footer">
          <p>🎁 Get 3 free credits upon sign up!</p>
        </div>
      </div>
    </div>
  )
}
