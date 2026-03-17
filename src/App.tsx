// src/App.tsx (3D Model Generator)
import { useState, useEffect, useRef } from 'react'
import './App.css'
import Header from './components/Header'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AuthModal } from './components/AuthModal'
import { PricingModal } from './components/PricingModal'
import { Notification } from './components/Notification'
import { useCredits } from './hooks/useCredits'
import { AuthCallback } from './pages/AuthCallback'
import { HowToUse } from './pages/HowToUse'
import { Gallery } from './components/Gallery'

const CREDIT_REFRESH_ERROR = 'Payment successful, but there was a temporary issue syncing your credits. Please refresh the page to see your updated balance.'
const PENDING_STRIPE_SESSION_KEY = 'pending_stripe_session'
const MAX_PIXELS = 2_000_000

const cleanUrlParams = () => {
  window.history.replaceState({}, '', window.location.pathname)
}

function AppContent() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadedImageUrl, setUploadedImageUrl] = useState('')
  const [resultVideo, setResultVideo] = useState('')
  const [resultGlb, setResultGlb] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isLoaded, setIsLoaded] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [toast, setToast] = useState<{ title: string; message: string; type: 'success' | 'error' | 'warning' } | null>(null)
  const [favRefreshKey, setFavRefreshKey] = useState(0)
  const [favSaving, setFavSaving] = useState(false)
  const [favSaved, setFavSaved] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const { user, session, loading } = useAuth()
  const { hasCredits, refreshProfile } = useCredits()

  const processedSessionIdRef = useRef<string | null>(null)
  const processedPendingSessionRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setIsLoaded(true) }, [])

  useEffect(() => {
    const handleStripeReturn = async () => {
      const params = new URLSearchParams(window.location.search)
      const sessionId = params.get('session_id')
      if (!sessionId) return
      if (processedSessionIdRef.current === sessionId) return
      if (loading) return
      processedSessionIdRef.current = sessionId
      if (user) {
        try {
          await refreshProfile()
          setShowNotification(true)
          cleanUrlParams()
        } catch {
          setError(CREDIT_REFRESH_ERROR)
        }
      } else {
        localStorage.setItem(PENDING_STRIPE_SESSION_KEY, sessionId)
        cleanUrlParams()
      }
    }
    handleStripeReturn()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user])

  useEffect(() => {
    const processPendingStripeSession = async () => {
      if (!user) { processedPendingSessionRef.current = false; return }
      if (processedPendingSessionRef.current) return
      const pendingSession = localStorage.getItem(PENDING_STRIPE_SESSION_KEY)
      if (pendingSession) {
        processedPendingSessionRef.current = true
        try {
          await refreshProfile()
          localStorage.removeItem(PENDING_STRIPE_SESSION_KEY)
          setShowNotification(true)
        } catch {
          processedPendingSessionRef.current = false
          setError(CREDIT_REFRESH_ERROR)
        }
      }
    }
    processPendingStripeSession()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleFileSelect = (file: File) => {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      setError('Please upload a JPG, PNG, or WEBP image.')
      return
    }
    setError('')
    setResultVideo('')
    setResultGlb('')
    setUploadedFile(file)
    const url = URL.createObjectURL(file)
    setUploadedImageUrl(url)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelect(file)
  }

  const resizeImageIfNeeded = (file: File): Promise<{ base64: string; mimeType: string; wasResized: boolean }> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const objectUrl = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(objectUrl)
        const { naturalWidth: w, naturalHeight: h } = img
        if (w * h <= MAX_PIXELS) {
          const reader = new FileReader()
          reader.onload = () => resolve({ base64: (reader.result as string).split(',')[1], mimeType: file.type, wasResized: false })
          reader.onerror = reject
          reader.readAsDataURL(file)
          return
        }
        const ratio = Math.sqrt(MAX_PIXELS / (w * h))
        const newW = Math.floor(w * ratio)
        const newH = Math.floor(h * ratio)
        const canvas = document.createElement('canvas')
        canvas.width = newW
        canvas.height = newH
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, newW, newH)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
        resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg', wasResized: true })
      }
      img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Failed to load image')) }
      img.src = objectUrl
    })
  }

  const generateModel = async () => {
    if (!uploadedFile) { setError('Please upload an image first.'); return }
    if (!user) { setError('Please sign in to generate 3D models'); setIsAuthModalOpen(true); return }
    if (!hasCredits) { setError('You have run out of credits. Please purchase more to continue.'); setIsPricingModalOpen(true); return }

    setIsLoading(true)
    setError('')
    setToast(null)

    try {
      const { base64, mimeType: resolvedMimeType, wasResized } = await resizeImageIfNeeded(uploadedFile)
      if (wasResized) {
        setToast({ title: 'Image resized for processing', message: 'Your image was automatically resized to fit within processing limits.', type: 'warning' })
      }

      const token = session?.access_token
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 115000)

      let response: Response
      try {
        response = await fetch('/api/generate3d', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ imageBase64: base64, mimeType: resolvedMimeType }),
          signal: controller.signal,
        })
      } catch (fetchErr: any) {
        clearTimeout(timeout)
        if (fetchErr.name === 'AbortError') {
          setToast({ title: 'Request Timed Out', message: '3D generation took too long. Please try again. No credits were deducted.', type: 'warning' })
        } else {
          setToast({ title: 'Network Error', message: 'Could not connect to the server. Please check your connection.', type: 'error' })
        }
        return
      }
      clearTimeout(timeout)

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        switch (response.status) {
          case 401:
            setToast({ title: 'Session Expired', message: 'Your session has expired. Please refresh and sign in again. No credits were deducted.', type: 'error' })
            break
          case 402:
            setToast({ title: 'Insufficient Credits', message: "You need at least 2 credits for 3D generation. Purchase more to continue.", type: 'warning' })
            setIsPricingModalOpen(true)
            break
          case 429:
            setToast({ title: 'Too Many Requests', message: 'Please wait a moment before trying again. No credits were deducted.', type: 'warning' })
            break
          case 503:
            setToast({ title: 'Service Unavailable', message: 'The 3D generation service is temporarily unavailable. Please try again shortly.', type: 'error' })
            break
          default:
            setToast({ title: 'Processing Failed', message: (data.error || 'An unexpected error occurred') + '. No credits were deducted.', type: 'error' })
            break
        }
        return
      }

      const data = await response.json()
      if (data.video) setResultVideo(data.video)
      if (data.glb) setResultGlb(data.glb)
      await refreshProfile()
    } catch (err: any) {
      setToast({ title: 'Processing Failed', message: err.message || 'An unexpected error occurred.', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { setFavSaved(false) }, [resultVideo])

  const saveFavorite = async () => {
    if ((!resultVideo && !resultGlb) || favSaving || favSaved) return
    if (!session) { setIsAuthModalOpen(true); return }
    setFavSaving(true)
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ result_url: resultVideo || resultGlb, original_url: resultGlb || null }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.ok) {
        setFavSaved(true)
        setFavRefreshKey(k => k + 1)
        setToast({ title: 'Added to Favorites!', message: 'Your 3D model has been saved. View it in ⭐ Favorites.', type: 'success' })
      } else {
        setToast({ title: 'Could not save', message: body.error || 'Failed to save favorite.', type: 'error' })
      }
    } catch {}
    finally { setFavSaving(false) }
  }

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  const downloadGlb = async () => {
    if (!resultGlb || downloading) return
    setDownloading(true)
    try {
      const response = await fetch(resultGlb)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()
      if (isMobile) {
        const filename = `3d-model-${Date.now()}.glb`
        const file = new File([blob], filename, { type: blob.type })
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file] })
        } else {
          window.open(resultGlb, '_blank')
        }
      } else {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `3d-model-${Date.now()}.glb`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    } catch {
      setToast({ title: 'Download failed', message: 'Could not download GLB file. Try right-clicking and "Save Link As...".', type: 'error' })
    } finally {
      setDownloading(false)
    }
  }

  const downloadVideo = async () => {
    if (!resultVideo) return
    try {
      const response = await fetch(resultVideo)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()
      if (isMobile) {
        const filename = `3d-preview-${Date.now()}.mp4`
        const file = new File([blob], filename, { type: blob.type })
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file] })
        } else {
          window.open(resultVideo, '_blank')
        }
      } else {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `3d-preview-${Date.now()}.mp4`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    } catch {
      setToast({ title: 'Download failed', message: 'Could not download video. Try right-clicking and "Save Video As...".', type: 'error' })
    }
  }

  const resetAll = () => {
    setResultVideo('')
    setResultGlb('')
    setUploadedFile(null)
    setUploadedImageUrl('')
    setError('')
  }

  return (
    <div className={`app ${isLoaded ? 'fade-in' : ''}`}>
      <Header />

      <div className="app-container">
        <div className="particles">
          {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((left, i) => (
            <div key={i} className="particle" style={{ left: `${left}%`, animationDelay: `${i * 0.5}s` }}></div>
          ))}
        </div>
      </div>

      <div className="main-content">
        <div className="prompt-section-wrapper">
          <h3 className="prompt-section-title"><span className="title-icon">🧊</span>Upload Your Image</h3>

          <div
            className={`upload-zone${isDragging ? ' upload-zone-dragging' : ''}${uploadedImageUrl ? ' upload-zone-has-image' : ''}`}
            onClick={() => !uploadedImageUrl && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {uploadedImageUrl ? (
              <div className="upload-zone-preview">
                <img src={uploadedImageUrl} alt="Uploaded" className="upload-preview-img" />
                <button
                  className="upload-change-btn"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                >
                  Change Image
                </button>
              </div>
            ) : (
              <div className="upload-zone-placeholder">
                <span className="upload-icon">📁</span>
                <p className="upload-text">Drop your image here or <span className="upload-link">browse</span></p>
                <p className="upload-hint">Supports JPG, PNG, WEBP · Costs 2 credits</p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />

          <button
            className="generate-btn-enhanced"
            onClick={generateModel}
            disabled={isLoading || !uploadedFile}
            style={{ marginTop: '1rem', width: '100%' }}
          >
            {isLoading ? (
              <><span className="spinner"></span><span className="btn-text">Generating 3D Model...</span></>
            ) : (
              <><span className="btn-icon">🧊</span><span className="btn-text">Generate 3D Model (2 credits)</span></>
            )}
          </button>
        </div>

        {error && <div className="error-message"><span className="error-icon">⚠️</span>{error}</div>}

        {isLoading && (
          <div className="loading-section">
            <div className="loading-spinner-large"></div>
            <p className="loading-message">Generating 3D model... ✨</p>
            <p className="loading-hint">This usually takes 30–90 seconds</p>
          </div>
        )}

        {(resultVideo || resultGlb) && !isLoading && (
          <div className="result-section slide-up">
            <h2 className="result-title">3D Model Ready ✨</h2>

            <div className="model-preview-container">
              {resultVideo && (
                <video
                  src={resultVideo}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="model-preview-video"
                />
              )}
              {!resultVideo && resultGlb && (
                <div className="model-glb-placeholder">
                  <span style={{ fontSize: '3rem' }}>🧊</span>
                  <p>3D model ready — download the GLB file below</p>
                </div>
              )}
            </div>

            <div className="action-buttons">
              {resultGlb && (
                <button onClick={downloadGlb} className="action-btn download-btn" disabled={downloading}>
                  <span>📦</span> {downloading ? 'Downloading...' : 'Download GLB'}
                </button>
              )}
              {resultVideo && (
                <button onClick={downloadVideo} className="action-btn download-btn secondary-download">
                  <span>🎬</span> Download Video
                </button>
              )}
              <button onClick={saveFavorite} className="action-btn save-btn" disabled={favSaving || favSaved}>
                <span>⭐</span> {favSaved ? 'Saved!' : favSaving ? 'Saving...' : 'Save to Favorites'}
              </button>
              <button onClick={resetAll} className="action-btn regenerate-btn"><span>🔄</span> New Model</button>
            </div>
          </div>
        )}
      </div>

      <Gallery refreshKey={favRefreshKey} />

      <section className="ecosystem-section">
        <h2 className="ecosystem-heading">Complete AI Ecosystem</h2>
        <div className="ecosystem-grid">
          {[
            { name: 'Emoticons',     icon: '😃', desc: 'Custom emoji creation',         status: 'Available Now',  isActive: true,  href: 'https://emoticons.deepvortexai.art',  isCurrent: false },
            { name: 'Image Gen',     icon: '🎨', desc: 'AI artwork',                    status: 'Available Now',  isActive: true,  href: 'https://images.deepvortexai.art',     isCurrent: false },
            { name: 'Logo Gen',      icon: '🛡️', desc: 'AI logo creation',             status: 'Available Now',  isActive: true,  href: 'https://logo.deepvortexai.art',       isCurrent: false },
            { name: 'Avatar Gen',    icon: '🎭', desc: 'AI portrait styles',            status: 'Available Now',  isActive: true,  href: 'https://avatar.deepvortexai.art',     isCurrent: false },
            { name: 'Remove BG',     icon: '✂️', desc: 'Remove backgrounds instantly',  status: 'Available Now',  isActive: true,  href: 'https://bgremover.deepvortexai.art',  isCurrent: false },
            { name: 'Upscaler',      icon: '🔍', desc: 'Upscale images up to 4x',       status: 'Available Now',  isActive: true,  href: 'https://upscaler.deepvortexai.art',   isCurrent: false },
            { name: '3D Generator',  icon: '🧊', desc: 'Image to 3D model',             status: 'Available Now',  isActive: true,  href: 'https://3d.deepvortexai.art',         isCurrent: true  },
            { name: 'Voice Gen',     icon: '🎙️', desc: 'AI Voice Generator',            status: 'Available Now',  isActive: true,  href: 'https://voice.deepvortexai.art',      isCurrent: false },
            { name: 'Image → Video', icon: '🎬', desc: 'Animate images with AI',        status: 'Available Now',  isActive: true,  href: 'https://video.deepvortexai.art',      isCurrent: false },
          ].map((tool, idx) => (
            <div
              key={idx}
              className={`ecosystem-card ${tool.isActive ? 'eco-card-active' : 'eco-card-inactive'}${tool.isCurrent ? ' eco-glow' : ''}`}
              onClick={() => { if (tool.isActive && tool.href && !tool.isCurrent) window.location.href = tool.href }}
              role={tool.isActive && !tool.isCurrent ? 'button' : 'presentation'}
              style={{ cursor: tool.isActive && !tool.isCurrent ? 'pointer' : 'default' }}
            >
              <div className="eco-icon">{tool.icon}</div>
              <h3 className="eco-title">{tool.name}</h3>
              <p className="eco-desc">{tool.desc}</p>
              <div className="eco-status-container">
                <span className={`eco-status-badge ${tool.isActive ? 'eco-badge-active' : 'eco-badge-upcoming'}`}>
                  {tool.status}
                </span>
                {tool.isCurrent && <div className="eco-current-label">CURRENT TOOL</div>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="footer">
        <a href="https://deepvortexai.art" className="footer-tagline footer-tagline-link">Deep Vortex AI - Building the complete AI creative ecosystem</a>
        <div className="footer-social">
          <a href="https://www.tiktok.com/@deepvortexai" target="_blank" rel="noopener noreferrer" className="footer-social-link">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.2 8.2 0 004.79 1.53V6.77a4.85 4.85 0 01-1.02-.08z"/>
            </svg>
            TikTok
          </a>
          <a href="https://x.com/deepvortexart" target="_blank" rel="noopener noreferrer" className="footer-social-link">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            X
          </a>
          <a href="mailto:admin@deepvortexai.xyz" className="footer-contact-btn">Contact Us</a>
        </div>
      </footer>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <PricingModal isOpen={isPricingModalOpen} onClose={() => setIsPricingModalOpen(false)} />
      {showNotification && (
        <Notification title="Payment Successful!" message="Your credits have been added to your account." onClose={() => setShowNotification(false)} />
      )}
      {toast && (
        <Notification title={toast.title} message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}

function App() {
  const path = window.location.pathname
  if (path === '/auth/callback') {
    return (
      <AuthProvider>
        <AuthCallback />
      </AuthProvider>
    )
  }

  if (path === '/how-to-use') {
    return <HowToUse />
  }

  return (
    <>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
      <a href="https://deepvortexai.art/game" target="_blank" rel="noopener noreferrer" className="play-earn-fab">⚡ Play & Earn</a>
    </>
  )
}

export default App
