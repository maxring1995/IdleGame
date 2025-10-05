'use client'

import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '@/lib/store'
import { getEquippedItems } from '@/lib/inventory'
import type { InventoryItem, Item } from '@/lib/supabase'
import * as THREE from 'three'

interface CharacterModelProps {
  characterId: string
}

interface EquippedItemWithDetails extends InventoryItem {
  item: Item
}

export default function CharacterModel({ characterId }: CharacterModelProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [equippedItems, setEquippedItems] = useState<EquippedItemWithDetails[]>([])
  const { character } = useGameStore()

  // Load equipped items
  useEffect(() => {
    async function loadEquipment() {
      const { data } = await getEquippedItems(characterId)
      if (data) {
        setEquippedItems(data as EquippedItemWithDetails[])
      }
    }
    loadEquipment()
  }, [characterId, character?.updated_at])

  // Idle animation - subtle breathing effect
  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.getElapsedTime()
      groupRef.current.position.y = Math.sin(t * 0.5) * 0.02
    }
  })

  // Get equipped weapon for display
  const equippedWeapon = equippedItems.find((item) => {
    const itemData = Array.isArray(item.item) ? item.item[0] : item.item
    return itemData.equipment_slot === 'weapon'
  })

  const equippedHelmet = equippedItems.find((item) => {
    const itemData = Array.isArray(item.item) ? item.item[0] : item.item
    return itemData.equipment_slot === 'helmet'
  })

  const equippedChest = equippedItems.find((item) => {
    const itemData = Array.isArray(item.item) ? item.item[0] : item.item
    return itemData.equipment_slot === 'chest'
  })

  return (
    <group ref={groupRef} position={[0, -0.5, 0]}>
      {/* Base Character Body - Placeholder Geometry */}
      <mesh castShadow position={[0, 0.5, 0]}>
        {/* Head */}
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial
          color={equippedHelmet ? '#4a90e2' : '#ffdbac'}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Torso */}
      <mesh castShadow position={[0, 0.2, 0]}>
        <capsuleGeometry args={[0.12, 0.3, 8, 16]} />
        <meshStandardMaterial
          color={equippedChest ? '#2d5a8f' : '#8b7355'}
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>

      {/* Arms */}
      <mesh castShadow position={[-0.18, 0.25, 0]} rotation={[0, 0, 0.3]}>
        <capsuleGeometry args={[0.05, 0.25, 6, 12]} />
        <meshStandardMaterial color="#ffdbac" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0.18, 0.25, 0]} rotation={[0, 0, -0.3]}>
        <capsuleGeometry args={[0.05, 0.25, 6, 12]} />
        <meshStandardMaterial color="#ffdbac" roughness={0.8} />
      </mesh>

      {/* Legs */}
      <mesh castShadow position={[-0.08, -0.15, 0]}>
        <capsuleGeometry args={[0.06, 0.35, 6, 12]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0.08, -0.15, 0]}>
        <capsuleGeometry args={[0.06, 0.35, 6, 12]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.7} />
      </mesh>

      {/* Weapon - Simple sword placeholder */}
      {equippedWeapon && (
        <group position={[0.25, 0.15, 0]} rotation={[0, 0, -0.5]}>
          {/* Sword blade */}
          <mesh castShadow>
            <boxGeometry args={[0.03, 0.4, 0.01]} />
            <meshStandardMaterial
              color="#c0c0c0"
              metalness={0.9}
              roughness={0.2}
              emissive={getRarityColor(equippedWeapon)}
              emissiveIntensity={0.2}
            />
          </mesh>
          {/* Sword handle */}
          <mesh castShadow position={[0, -0.22, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.08, 8]} />
            <meshStandardMaterial color="#654321" roughness={0.9} />
          </mesh>
          {/* Sword guard */}
          <mesh castShadow position={[0, -0.18, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.12, 0.02, 0.02]} />
            <meshStandardMaterial color="#8b7355" metalness={0.5} />
          </mesh>
        </group>
      )}

      {/* Helmet glow effect for legendary items */}
      {equippedHelmet && isLegendary(equippedHelmet) && (
        <pointLight position={[0, 0.65, 0]} color="#ffd700" intensity={0.5} distance={1} />
      )}

      {/* Chest glow effect for legendary items */}
      {equippedChest && isLegendary(equippedChest) && (
        <pointLight position={[0, 0.2, 0]} color="#ffd700" intensity={0.3} distance={1} />
      )}
    </group>
  )
}

// Helper functions
function getRarityColor(equippedItem: EquippedItemWithDetails): string {
  const item = Array.isArray(equippedItem.item) ? equippedItem.item[0] : equippedItem.item
  switch (item.rarity) {
    case 'legendary':
      return '#ffd700'
    case 'epic':
      return '#a855f7'
    case 'rare':
      return '#3b82f6'
    case 'uncommon':
      return '#10b981'
    default:
      return '#000000'
  }
}

function isLegendary(equippedItem: EquippedItemWithDetails): boolean {
  const item = Array.isArray(equippedItem.item) ? equippedItem.item[0] : equippedItem.item
  return item.rarity === 'legendary'
}
