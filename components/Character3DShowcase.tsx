'use client'

import { useState } from 'react'
import Character3DViewer from './Character3DViewer'
import { useGameStore } from '@/lib/store'

export default function Character3DShowcase() {
  const { character } = useGameStore()
  const [animationState, setAnimationState] = useState<'idle' | 'attack' | 'defend' | 'victory' | 'defeat'>('idle')

  if (!character) return null

  const animations = [
    { id: 'idle', label: 'Idle', icon: '🧍', color: 'gray' },
    { id: 'attack', label: 'Attack', icon: '⚔️', color: 'red' },
    { id: 'defend', label: 'Defend', icon: '🛡️', color: 'blue' },
    { id: 'victory', label: 'Victory', icon: '🎉', color: 'green' },
    { id: 'defeat', label: 'Defeat', icon: '💀', color: 'purple' },
  ] as const

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="panel p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-4xl shadow-xl">
            🎭
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-1 text-shadow">3D Character Viewer</h2>
            <p className="text-sm text-gray-400">
              Interactive model with animations and full camera control
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Viewer */}
        <div className="lg:col-span-2">
          <div className="panel p-6">
            <Character3DViewer
              characterId={character.id}
              size={600}
              interactive={true}
              autoRotate={animationState === 'idle'}
              showControls={true}
              animationState={animationState}
              scale={1.5}
            />

            <div className="mt-6 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-300">
                <span className="text-xl">🖱️</span>
                <span>Drag to rotate • Scroll to zoom • Right-click to pan</span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls Panel */}
        <div className="space-y-4">
          {/* Animation Controls */}
          <div className="panel p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">🎬</span>
              Animations
            </h3>

            <div className="space-y-2">
              {animations.map((anim) => (
                <button
                  key={anim.id}
                  onClick={() => setAnimationState(anim.id as any)}
                  className={`w-full btn text-sm py-3 justify-start group transition-all duration-300 ${
                    animationState === anim.id
                      ? `btn-primary shadow-lg scale-105`
                      : 'btn-secondary hover:scale-102'
                  }`}
                >
                  <span className="text-xl mr-3 transition-transform duration-300 group-hover:scale-125">
                    {anim.icon}
                  </span>
                  <span className="flex-1 text-left">{anim.label}</span>
                  {animationState === anim.id && (
                    <span className="text-xs opacity-75">▶</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Character Info */}
          <div className="panel p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">📊</span>
              Model Info
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Geometry</span>
                <span className="text-white font-mono">~2.5K tris</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-400">Rendering</span>
                <span className="text-green-400 font-mono">WebGL 2.0</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-400">Shadows</span>
                <span className="text-green-400">Enabled ✓</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-400">Animations</span>
                <span className="text-white">{animations.length} poses</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-400">Equipment Slots</span>
                <span className="text-white">6 visible</span>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="panel p-6 bg-gradient-to-br from-amber-500/5 to-amber-600/5 border-amber-500/20">
            <h3 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
              <span className="text-xl">💡</span>
              Pro Tips
            </h3>

            <ul className="space-y-2 text-xs text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                <span>Equip legendary items to see golden aura effects</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                <span>All equipment slots are visible on the model</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                <span>Attack animation shows weapon swing motion</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                <span>Victory pose rotates and bounces continuously</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
