'use client'

import { useState, useEffect } from 'react'
import { useNotificationStore, ActiveTask } from '@/lib/notificationStore'

export default function ActiveTasksPanel() {
  const { activeTasks, updateActiveTask, removeActiveTask } = useNotificationStore()
  const [currentTime, setCurrentTime] = useState(Date.now())

  // Update time every second for progress calculation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'adventure':
        return '🗺️'
      case 'gathering':
        return '⛏️'
      case 'quest':
        return '📜'
      case 'combat':
        return '⚔️'
      case 'crafting':
        return '🔨'
      default:
        return '⏳'
    }
  }

  const getTaskColor = (type: string) => {
    switch (type) {
      case 'adventure':
        return 'from-blue-500 to-blue-600'
      case 'gathering':
        return 'from-green-500 to-green-600'
      case 'quest':
        return 'from-purple-500 to-purple-600'
      case 'combat':
        return 'from-red-500 to-red-600'
      case 'crafting':
        return 'from-amber-500 to-amber-600'
      default:
        return 'from-gray-500 to-gray-600'
    }
  }

  const calculateProgress = (task: ActiveTask) => {
    const totalDuration = task.estimatedEndTime - task.startTime
    const elapsed = currentTime - task.startTime
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))
  }

  const calculateTimeRemaining = (task: ActiveTask) => {
    const remaining = task.estimatedEndTime - currentTime
    if (remaining <= 0) return 'Complete!'

    const seconds = Math.floor(remaining / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  if (activeTasks.length === 0) {
    return null
  }

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span>⏳</span>
          Active Tasks
          <span className="text-sm text-gray-400 font-normal">
            ({activeTasks.length})
          </span>
        </h3>
      </div>

      <div className="space-y-3">
        {activeTasks.map((task) => {
          const progress = task.progress ?? calculateProgress(task)
          const timeRemaining = calculateTimeRemaining(task)
          const isComplete = currentTime >= task.estimatedEndTime

          return (
            <div
              key={task.id}
              className="card p-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="text-3xl">{getTaskIcon(task.type)}</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-semibold text-white">{task.title}</h4>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {task.description}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded ${
                        isComplete
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {isComplete ? 'Ready!' : timeRemaining}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="progress-bar">
                    <div
                      className={`progress-fill bg-gradient-to-r ${getTaskColor(
                        task.type
                      )} ${isComplete ? 'animate-pulse' : ''}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Metadata */}
                  {task.metadata && (
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      {task.metadata.location && (
                        <span>📍 {task.metadata.location}</span>
                      )}
                      {task.metadata.quantity && (
                        <span>📦 {task.metadata.quantity}x</span>
                      )}
                      {task.metadata.reward && (
                        <span>💰 {task.metadata.reward}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Remove Button (only if complete) */}
                {isComplete && (
                  <button
                    onClick={() => removeActiveTask(task.id)}
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
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
