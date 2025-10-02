'use client'

import { useState } from 'react'

export default function CraftingPanel() {
  return (
    <div className="text-center py-20 space-y-4">
      <div className="text-6xl mb-4">🔨</div>
      <h3 className="text-2xl font-bold text-primary">Crafting System</h3>
      <p className="text-gray-400 max-w-md mx-auto">
        The crafting system is coming soon! Combine gathered materials to create powerful weapons,
        armor, potions, and enchantments.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mt-8 text-left">
        <div className="bg-bg-card border border-white/10 rounded-lg p-4">
          <div className="text-2xl mb-2">⚔️</div>
          <h4 className="font-bold text-primary mb-1">Blacksmithing</h4>
          <p className="text-sm text-gray-400">
            Forge weapons and armor from ores and metals
          </p>
        </div>

        <div className="bg-bg-card border border-white/10 rounded-lg p-4">
          <div className="text-2xl mb-2">🏹</div>
          <h4 className="font-bold text-primary mb-1">Fletching</h4>
          <p className="text-sm text-gray-400">
            Craft bows, arrows, and ranged equipment from wood
          </p>
        </div>

        <div className="bg-bg-card border border-white/10 rounded-lg p-4">
          <div className="text-2xl mb-2">🧵</div>
          <h4 className="font-bold text-primary mb-1">Leatherworking</h4>
          <p className="text-sm text-gray-400">
            Create armor and accessories from hides and pelts
          </p>
        </div>

        <div className="bg-bg-card border border-white/10 rounded-lg p-4">
          <div className="text-2xl mb-2">✨</div>
          <h4 className="font-bold text-primary mb-1">Enchanting</h4>
          <p className="text-sm text-gray-400">
            Imbue items with magical properties using runes
          </p>
        </div>
      </div>
    </div>
  )
}
