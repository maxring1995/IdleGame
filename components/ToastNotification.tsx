'use client'

import { useEffect, useState } from 'react'
import { useNotificationStore } from '@/lib/notificationStore'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  icon?: string
}

export default function ToastNotification() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const notifications = useNotificationStore((state) => state.notifications)

  // Listen for new notifications and show as toast
  useEffect(() => {
    if (notifications.length > 0) {
      const latestNotif = notifications[0]

      // Only show toast for very recent notifications (within last 2 seconds)
      if (Date.now() - latestNotif.timestamp < 2000) {
        const toast: Toast = {
          id: latestNotif.id,
          message: latestNotif.message,
          type: latestNotif.type,
          icon: latestNotif.icon,
        }

        setToasts((prev) => [toast, ...prev].slice(0, 3)) // Keep max 3 toasts

        // Auto-remove after 5 seconds
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toast.id))
        }, 5000)
      }
    }
  }, [notifications])

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const getToastStyle = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-gradient-to-r from-green-500 to-green-600 border-green-400'
      case 'error':
        return 'bg-gradient-to-r from-red-500 to-red-600 border-red-400'
      case 'warning':
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600 border-yellow-400'
      default:
        return 'bg-gradient-to-r from-blue-500 to-blue-600 border-blue-400'
    }
  }

  if (toasts.length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 p-4 rounded-xl border-2 shadow-2xl text-white min-w-[300px] max-w-[400px] animate-slide-in-right ${getToastStyle(
            toast.type
          )}`}
        >
          {/* Icon */}
          {toast.icon && (
            <div className="text-2xl flex-shrink-0">{toast.icon}</div>
          )}

          {/* Message */}
          <p className="flex-1 text-sm font-semibold">{toast.message}</p>

          {/* Close Button */}
          <button
            onClick={() => removeToast(toast.id)}
            className="p-1 hover:bg-white/20 rounded transition-colors flex-shrink-0"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
