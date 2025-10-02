'use client'

import EquipmentOverlay from './EquipmentOverlay'

export default function Character() {
  return (
    <div className="space-y-6">
      {/* Character Overview Header */}
      <div className="panel p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/5">
        <h2 className="text-2xl font-bold text-white mb-2 text-shadow">Character Management</h2>
        <p className="text-sm text-gray-400">Manage your equipment, skills, and character progression</p>
      </div>

      {/* Equipment Manager - Full Page Integration */}
      <EquipmentOverlay
        isOpen={true}
        onClose={() => {}}
      />
    </div>
  )
}
