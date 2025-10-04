'use client'

import { useState, useEffect } from 'react'
import { useNotificationStore, Notification } from '@/lib/notificationStore'
import { formatDistanceToNow } from 'date-fns'

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useNotificationStore()

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'adventure':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30'
      case 'gathering':
        return 'text-green-400 bg-green-500/10 border-green-500/30'
      case 'quest':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/30'
      case 'combat':
        return 'text-red-400 bg-red-500/10 border-red-500/30'
      case 'crafting':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30'
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30'
    }
  }

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-l-green-500'
      case 'warning':
        return 'border-l-yellow-500'
      case 'error':
        return 'border-l-red-500'
      default:
        return 'border-l-blue-500'
    }
  }

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.read) {
      markAsRead(notif.id)
    }
    // Note: Navigation is disabled in single-page tab app
    // The actionLabel serves as informational text only
  }

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-white/5 transition-colors"
      >
        <span className="text-2xl">🔔</span>
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 w-96 max-h-[32rem] bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-gradient-to-r from-gray-800/50 to-gray-900/50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-white">Notifications</h3>
                <span className="text-sm text-gray-400">
                  {unreadCount} unread
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                  className="text-xs text-blue-400 hover:text-blue-300 disabled:text-gray-600 disabled:cursor-not-allowed"
                >
                  Mark all read
                </button>
                <button
                  onClick={clearAll}
                  disabled={notifications.length === 0}
                  className="text-xs text-red-400 hover:text-red-300 disabled:text-gray-600 disabled:cursor-not-allowed"
                >
                  Clear all
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <span className="text-6xl mb-4 opacity-50">🔕</span>
                  <p className="text-sm">No notifications yet</p>
                  <p className="text-xs mt-1">Complete tasks to receive updates</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`w-full text-left p-4 hover:bg-white/5 transition-colors border-l-4 ${getTypeStyle(
                        notif.type
                      )} ${!notif.read ? 'bg-white/5' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div
                          className={`p-2 rounded-lg border ${getCategoryColor(
                            notif.category
                          )}`}
                        >
                          <span className="text-xl">{notif.icon || '📢'}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4
                              className={`font-semibold ${
                                notif.read ? 'text-gray-300' : 'text-white'
                              }`}
                            >
                              {notif.title}
                            </h4>
                            {!notif.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                          <p
                            className={`text-sm mt-1 ${
                              notif.read ? 'text-gray-500' : 'text-gray-400'
                            }`}
                          >
                            {notif.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-600">
                              {formatDistanceToNow(notif.timestamp, {
                                addSuffix: true,
                              })}
                            </span>
                            {notif.actionLabel && (
                              <span className="text-xs text-blue-400 hover:text-blue-300">
                                {notif.actionLabel} →
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeNotification(notif.id)
                          }}
                          className="p-1 hover:bg-red-500/20 rounded text-gray-600 hover:text-red-400 transition-colors"
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
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
