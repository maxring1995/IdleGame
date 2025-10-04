/**
 * Notification Store
 *
 * Manages notifications for task completions across:
 * - Adventures/Travel
 * - Gathering
 * - Quests
 * - Combat
 * - Crafting
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type NotificationType = 'success' | 'info' | 'warning' | 'error'
export type NotificationCategory = 'adventure' | 'gathering' | 'quest' | 'combat' | 'crafting' | 'system'

export interface Notification {
  id: string
  type: NotificationType
  category: NotificationCategory
  title: string
  message: string
  timestamp: number
  read: boolean
  actionLabel?: string
  actionUrl?: string
  icon?: string
}

export interface ActiveTask {
  id: string
  type: NotificationCategory
  title: string
  description: string
  startTime: number
  estimatedEndTime: number
  progress?: number // 0-100
  metadata?: Record<string, any>
}

interface NotificationState {
  // Notifications
  notifications: Notification[]
  unreadCount: number

  // Active tasks (adventures, gathering, etc.)
  activeTasks: ActiveTask[]

  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => string
  removeNotification: (id: string) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearAll: () => void

  // Active task actions
  addActiveTask: (task: Omit<ActiveTask, 'id'>) => string
  updateActiveTask: (id: string, updates: Partial<ActiveTask>) => void
  removeActiveTask: (id: string) => void
  clearCompletedTasks: () => void

  // Helpers
  getUnreadNotifications: () => Notification[]
  getNotificationsByCategory: (category: NotificationCategory) => Notification[]
  hasActiveTaskOfType: (type: NotificationCategory) => boolean
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      activeTasks: [],

      // Add a new notification
      addNotification: (notification) => {
        const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const newNotif: Notification = {
          ...notification,
          id,
          timestamp: Date.now(),
          read: false,
        }

        set((state) => ({
          notifications: [newNotif, ...state.notifications].slice(0, 50), // Keep last 50
          unreadCount: state.unreadCount + 1,
        }))

        return id
      },

      // Remove a notification
      removeNotification: (id) => {
        set((state) => {
          const notif = state.notifications.find((n) => n.id === id)
          return {
            notifications: state.notifications.filter((n) => n.id !== id),
            unreadCount: notif && !notif.read ? state.unreadCount - 1 : state.unreadCount,
          }
        })
      },

      // Mark notification as read
      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
          unreadCount: state.notifications.find((n) => n.id === id && !n.read)
            ? state.unreadCount - 1
            : state.unreadCount,
        }))
      },

      // Mark all as read
      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }))
      },

      // Clear all notifications
      clearAll: () => {
        set({ notifications: [], unreadCount: 0 })
      },

      // Add active task
      addActiveTask: (task) => {
        const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const newTask: ActiveTask = {
          ...task,
          id,
        }

        set((state) => ({
          activeTasks: [...state.activeTasks, newTask],
        }))

        return id
      },

      // Update active task
      updateActiveTask: (id, updates) => {
        set((state) => ({
          activeTasks: state.activeTasks.map((task) =>
            task.id === id ? { ...task, ...updates } : task
          ),
        }))
      },

      // Remove active task
      removeActiveTask: (id) => {
        set((state) => ({
          activeTasks: state.activeTasks.filter((task) => task.id !== id),
        }))
      },

      // Clear completed tasks
      clearCompletedTasks: () => {
        set((state) => ({
          activeTasks: state.activeTasks.filter(
            (task) => task.estimatedEndTime > Date.now()
          ),
        }))
      },

      // Get unread notifications
      getUnreadNotifications: () => {
        return get().notifications.filter((n) => !n.read)
      },

      // Get notifications by category
      getNotificationsByCategory: (category) => {
        return get().notifications.filter((n) => n.category === category)
      },

      // Check if has active task of type
      hasActiveTaskOfType: (type) => {
        return get().activeTasks.some((task) => task.type === type)
      },
    }),
    {
      name: 'eternal-realms-notifications',
      partialize: (state) => ({
        notifications: state.notifications,
        unreadCount: state.unreadCount,
        // Don't persist active tasks (they should be refreshed from server)
      }),
    }
  )
)

// Helper function to create notifications for common events
export const notificationHelpers = {
  // Adventure/Travel notifications
  travelComplete: (zoneName: string, rewards: { xp?: number; gold?: number; items?: number }) => ({
    type: 'success' as NotificationType,
    category: 'adventure' as NotificationCategory,
    title: `🗺️ Journey Complete!`,
    message: `You've arrived at ${zoneName}. ${rewards.xp ? `+${rewards.xp} XP` : ''} ${rewards.gold ? `+${rewards.gold} Gold` : ''}`,
    icon: '🗺️',
  }),

  explorationComplete: (location: string, discoveries: number) => ({
    type: 'success' as NotificationType,
    category: 'adventure' as NotificationCategory,
    title: `🔍 Exploration Complete!`,
    message: `Discovered ${discoveries} new things at ${location}`,
    icon: '🔍',
  }),

  // Gathering notifications
  gatheringComplete: (
    material: string,
    quantity: number,
    xpGained: number
  ) => ({
    type: 'success' as NotificationType,
    category: 'gathering' as NotificationCategory,
    title: `⛏️ Gathering Complete!`,
    message: `Gathered ${quantity}x ${material}. +${xpGained} XP`,
    icon: '⛏️',
  }),

  // Quest notifications
  questComplete: (questName: string, rewards: { xp: number; gold: number; items?: string[] }) => ({
    type: 'success' as NotificationType,
    category: 'quest' as NotificationCategory,
    title: `📜 Quest Complete!`,
    message: `"${questName}" - +${rewards.xp} XP, +${rewards.gold} Gold${rewards.items ? `, +${rewards.items.length} items` : ''}`,
    icon: '📜',
  }),

  questProgress: (questName: string, current: number, goal: number) => ({
    type: 'info' as NotificationType,
    category: 'quest' as NotificationCategory,
    title: `📋 Quest Progress`,
    message: `"${questName}" - ${current}/${goal}`,
    icon: '📋',
  }),

  // Combat notifications
  combatVictory: (enemyName: string, rewards: { xp: number; gold: number; loot?: string[] }) => ({
    type: 'success' as NotificationType,
    category: 'combat' as NotificationCategory,
    title: `⚔️ Victory!`,
    message: `Defeated ${enemyName}. +${rewards.xp} XP, +${rewards.gold} Gold${rewards.loot ? `, +${rewards.loot.length} items` : ''}`,
    icon: '⚔️',
  }),

  combatDefeat: (enemyName: string) => ({
    type: 'warning' as NotificationType,
    category: 'combat' as NotificationCategory,
    title: `💀 Defeated`,
    message: `You were defeated by ${enemyName}`,
    icon: '💀',
  }),

  // Crafting notifications
  craftingComplete: (itemName: string, quantity: number) => ({
    type: 'success' as NotificationType,
    category: 'crafting' as NotificationCategory,
    title: `🔨 Crafting Complete!`,
    message: `Crafted ${quantity}x ${itemName}`,
    icon: '🔨',
  }),

  // System notifications
  levelUp: (newLevel: number) => ({
    type: 'success' as NotificationType,
    category: 'system' as NotificationCategory,
    title: `🎉 Level Up!`,
    message: `Congratulations! You've reached level ${newLevel}`,
    icon: '🎉',
  }),

  skillLevelUp: (skillName: string, newLevel: number) => ({
    type: 'success' as NotificationType,
    category: 'system' as NotificationCategory,
    title: `📈 Skill Level Up!`,
    message: `${skillName} is now level ${newLevel}`,
    icon: '📈',
  }),
}
