import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import './Gallery.css'

interface FavoriteItem {
  id: string
  resultUrl: string  // video URL
  originalUrl: string | null  // GLB URL
  createdAt: number
}

interface FavoritesModalProps {
  isOpen: boolean
  onClose: () => void
}

export function FavoritesModal({ isOpen, onClose }: FavoritesModalProps) {
  const { session } = useAuth()
  const token = session?.access_token

  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(false)

  const loadFavorites = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/favorites', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setFavorites((data.favorites || []).map((f: any) => ({
          id: f.id,
          resultUrl: f.result_url,
          originalUrl: f.original_url || null,
          createdAt: new Date(f.created_at).getTime(),
        })))
      }
    } catch {}
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { if (isOpen) loadFavorites() }, [isOpen, loadFavorites])

  const handleDelete = async (id: string) => {
    if (!token) return
    try {
      await fetch(`/api/favorites?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setFavorites(prev => prev.filter(f => f.id !== id))
    } catch {}
  }

  const handleDownloadGlb = async (glbUrl: string, id: string) => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    try {
      const response = await fetch(glbUrl)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()
      if (isMobile) {
        const filename = `3d-model-${id.slice(0, 8)}.glb`
        const file = new File([blob], filename, { type: blob.type })
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file] })
          return
        }
        window.open(glbUrl, '_blank')
        return
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `3d-model-${id.slice(0, 8)}.glb`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      alert('Download failed. Please try right-clicking and "Save Link As..."')
    }
  }

  if (!isOpen) return null

  return (
    <div className="gallery-modal" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="gallery-content">
        <div className="gallery-header">
          <h2>⭐ Saved 3D Models</h2>
          <button onClick={onClose} className="gallery-close">✕</button>
        </div>

        {!token ? (
          <p className="gallery-empty">Sign in to view your saved 3D models.</p>
        ) : loading ? (
          <p className="favorites-loading">Loading...</p>
        ) : favorites.length === 0 ? (
          <p className="gallery-empty">No favorites saved yet. Generate a 3D model and click ⭐ Save!</p>
        ) : (
          <div className="gallery-grid">
            {favorites.map((item) => (
              <div key={item.id} className="gallery-item">
                <div className="gallery-item-img-wrap">
                  <video
                    src={item.resultUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
                <div className="gallery-item-info">
                  <p className="gallery-date">{new Date(item.createdAt).toLocaleDateString()}</p>
                </div>
                {item.originalUrl && (
                  <button
                    className="gallery-download-btn"
                    onClick={(e) => { e.stopPropagation(); handleDownloadGlb(item.originalUrl!, item.id) }}
                    title="Download GLB"
                    aria-label="Download GLB model"
                  >💾</button>
                )}
                <button
                  className="gallery-delete-btn"
                  onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }}
                  title="Remove from favorites"
                  aria-label="Remove from favorites"
                >🗑️</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
