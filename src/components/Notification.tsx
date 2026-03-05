import { useEffect } from 'react'
import './Notification.css'

interface NotificationProps {
  title: string
  message: string
  onClose: () => void
  autoClose?: number
  type?: 'success' | 'error' | 'warning'
}

const icons: Record<string, string> = {
  success: '🎉',
  error: '⚠️',
  warning: '⏳',
}

export const Notification = ({ title, message, onClose, autoClose, type = 'success' }: NotificationProps) => {
  const duration = autoClose ?? (type === 'error' ? 8000 : 5000)

  useEffect(() => {
    if (duration) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  return (
    <div className={`notification notification-${type}`}>
      <div className="notification-icon">{icons[type]}</div>
      <div className="notification-content">
        <div className="notification-title">{title}</div>
        <div className="notification-message">{message}</div>
      </div>
      <button className="notification-close" onClick={onClose}>×</button>
    </div>
  )
}
