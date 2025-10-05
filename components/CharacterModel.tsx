'use client'

import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '@/lib/store'
import { getEquippedItems } from '@/lib/inventory'
import type { InventoryItem, Item } from '@/lib/supabase'
import * as THREE from 'three'
import ParticleSystem from './ParticleSystem'

interface CharacterModelProps {
  characterId: string
  animationState?: 'idle' | 'attack' | 'defend' | 'victory' | 'defeat'
  scale?: number
}

interface EquippedItemWithDetails extends InventoryItem {
  item: Item
}

const lerp = (start: number, end: number, t: number): number => {
  return start + (end - start) * t
}

export default function CharacterModel({
  characterId,
  animationState = 'idle',
  scale = 1
}: CharacterModelProps) {
  const groupRef = useRef<THREE.Group>(null)
  const headRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Group>(null)
  const leftArmRef = useRef<THREE.Group>(null)
  const rightArmRef = useRef<THREE.Group>(null)
  const shieldRef = useRef<THREE.Group>(null)
  const swordRef = useRef<THREE.Group>(null)

  const [equippedItems, setEquippedItems] = useState<EquippedItemWithDetails[]>([])
  const { character } = useGameStore()

  useEffect(() => {
    async function loadEquipment() {
      const { data } = await getEquippedItems(characterId)
      if (data) {
        setEquippedItems(data as EquippedItemWithDetails[])
      }
    }
    loadEquipment()
  }, [characterId, character?.updated_at])

  const getEquippedItem = (slot: string) => {
    return equippedItems.find((item) => {
      const itemData = Array.isArray(item.item) ? item.item[0] : item.item
      return itemData.equipment_slot === slot
    })
  }

  const equippedWeapon = getEquippedItem('weapon')
  const equippedHelmet = getEquippedItem('helmet')
  const equippedChest = getEquippedItem('chest')
  const equippedLegs = getEquippedItem('legs')

  // 8-bit style animations - simple and snappy
  useFrame((state, delta) => {
    if (!groupRef.current) return

    const t = state.clock.getElapsedTime()

    switch (animationState) {
      case 'idle':
        // Subtle 8-bit bob
        if (groupRef.current) {
          groupRef.current.position.y = Math.floor(Math.sin(t * 2) * 4) * 0.01
        }
        break

      case 'attack':
        // Sword slash animation
        const attackCycle = (t * 4) % (Math.PI * 2)
        const isSlashing = attackCycle < Math.PI * 0.5

        if (swordRef.current) {
          const slashAngle = isSlashing ? Math.PI * 0.75 : 0
          swordRef.current.rotation.z = lerp(swordRef.current.rotation.z, slashAngle, delta * 12)
        }

        if (rightArmRef.current) {
          const armAngle = isSlashing ? -0.8 : 0.2
          rightArmRef.current.rotation.x = lerp(rightArmRef.current.rotation.x, armAngle, delta * 12)
        }

        if (groupRef.current) {
          groupRef.current.position.z = isSlashing ? 0.15 : 0
        }
        break

      case 'defend':
        // Shield up
        if (shieldRef.current) {
          shieldRef.current.position.y = lerp(shieldRef.current.position.y, 0.15, delta * 8)
        }

        if (leftArmRef.current) {
          leftArmRef.current.rotation.x = lerp(leftArmRef.current.rotation.x, -0.8, delta * 8)
        }
        break

      case 'victory':
        // Jump celebration
        const victoryCycle = Math.sin(t * 6)
        if (groupRef.current) {
          groupRef.current.position.y = Math.abs(victoryCycle) * 0.2
        }

        if (swordRef.current) {
          swordRef.current.rotation.z = Math.sin(t * 8) * 0.3
        }
        break

      case 'defeat':
        // Knocked back
        if (groupRef.current) {
          groupRef.current.position.y = lerp(groupRef.current.position.y, -0.2, delta * 5)
          groupRef.current.rotation.z = lerp(groupRef.current.rotation.z, -0.3, delta * 5)
        }
        break
    }
  })

  // Game Boy Color palette (limited, vibrant colors)
  const skinColor = '#ffcc88'
  const tunicColor = equippedChest ? getEquipmentColor(equippedChest, '#00aa44') : '#00cc55'
  const tunicShadow = equippedChest ? getDarkerShade(getEquipmentColor(equippedChest, '#00aa44')) : '#008833'
  const hatColor = equippedHelmet ? getEquipmentColor(equippedHelmet, '#00aa44') : '#00cc55'
  const beltColor = '#8b4513'
  const bootsColor = '#654321'
  const hairColor = '#ffd700'

  return (
    <group ref={groupRef} position={[0, -0.4, 0]} scale={scale}>
      {/* Head - Simple rounded cube for Zelda style */}
      <group ref={headRef} position={[0, 0.45, 0]}>
        {/* Face */}
        <mesh castShadow>
          <boxGeometry args={[0.22, 0.24, 0.22]} />
          <meshStandardMaterial
            color={skinColor}
            roughness={1}
            metalness={0}
            flatShading
          />
        </mesh>

        {/* Hat/Helmet */}
        <group>
          {/* Hat cone (Zelda style) */}
          <mesh castShadow position={[0, 0.15, 0]}>
            <coneGeometry args={[0.16, 0.25, 4]} />
            <meshStandardMaterial
              color={hatColor}
              roughness={1}
              metalness={0}
              flatShading
              emissive={equippedHelmet && isLegendary(equippedHelmet) ? getRarityColor(equippedHelmet) : '#000000'}
              emissiveIntensity={0.3}
            />
          </mesh>

          {/* Hat brim */}
          <mesh castShadow position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 0.03, 8]} />
            <meshStandardMaterial
              color={hatColor}
              roughness={1}
              metalness={0}
              flatShading
            />
          </mesh>

          {/* Hat back flap */}
          <mesh castShadow position={[0, 0.08, -0.15]} rotation={[0.4, 0, 0]}>
            <boxGeometry args={[0.12, 0.2, 0.03]} />
            <meshStandardMaterial
              color={hatColor}
              roughness={1}
              flatShading
            />
          </mesh>
        </group>

        {/* Simple eyes - 8-bit style */}
        <mesh position={[-0.05, 0, 0.11]}>
          <boxGeometry args={[0.025, 0.025, 0.01]} />
          <meshStandardMaterial color="#000000" flatShading />
        </mesh>
        <mesh position={[0.05, 0, 0.11]}>
          <boxGeometry args={[0.025, 0.025, 0.01]} />
          <meshStandardMaterial color="#000000" flatShading />
        </mesh>

        {/* Hair tuft (if no helmet detail) */}
        {equippedHelmet && (
          <mesh castShadow position={[0, 0.28, 0]}>
            <boxGeometry args={[0.06, 0.08, 0.06]} />
            <meshStandardMaterial
              color={getRarityColor(equippedHelmet)}
              metalness={0.6}
              roughness={0.3}
              flatShading
              emissive={getRarityColor(equippedHelmet)}
              emissiveIntensity={0.5}
            />
          </mesh>
        )}
      </group>

      {/* Body - Zelda tunic style */}
      <group ref={bodyRef} position={[0, 0.15, 0]}>
        {/* Main tunic */}
        <mesh castShadow>
          <boxGeometry args={[0.28, 0.35, 0.2]} />
          <meshStandardMaterial
            color={tunicColor}
            roughness={1}
            metalness={0}
            flatShading
            emissive={equippedChest && isLegendary(equippedChest) ? getRarityColor(equippedChest) : '#000000'}
            emissiveIntensity={0.2}
          />
        </mesh>

        {/* Tunic shadow/detail */}
        <mesh castShadow position={[0, -0.05, 0.101]}>
          <boxGeometry args={[0.24, 0.25, 0.01]} />
          <meshStandardMaterial
            color={tunicShadow}
            roughness={1}
            flatShading
          />
        </mesh>

        {/* Belt */}
        <mesh castShadow position={[0, -0.1, 0]}>
          <boxGeometry args={[0.3, 0.06, 0.21]} />
          <meshStandardMaterial color={beltColor} roughness={1} flatShading />
        </mesh>

        {/* Belt buckle - Triforce inspired */}
        <mesh castShadow position={[0, -0.1, 0.11]}>
          <cylinderGeometry args={[0.04, 0.04, 0.02, 3]} />
          <meshStandardMaterial
            color="#ffd700"
            metalness={0.7}
            roughness={0.3}
            flatShading
          />
        </mesh>

        {/* Chest armor detail */}
        {equippedChest && (
          <>
            {/* Shoulder guards */}
            <mesh castShadow position={[-0.16, 0.14, 0]}>
              <boxGeometry args={[0.08, 0.08, 0.08]} />
              <meshStandardMaterial
                color={getRarityColor(equippedChest)}
                metalness={0.5}
                roughness={0.4}
                flatShading
              />
            </mesh>
            <mesh castShadow position={[0.16, 0.14, 0]}>
              <boxGeometry args={[0.08, 0.08, 0.08]} />
              <meshStandardMaterial
                color={getRarityColor(equippedChest)}
                metalness={0.5}
                roughness={0.4}
                flatShading
              />
            </mesh>

            {/* Chest emblem */}
            <mesh castShadow position={[0, 0.05, 0.11]}>
              <cylinderGeometry args={[0.05, 0.05, 0.02, 3]} />
              <meshStandardMaterial
                color={getRarityColor(equippedChest)}
                metalness={0.6}
                roughness={0.3}
                flatShading
                emissive={getRarityColor(equippedChest)}
                emissiveIntensity={0.4}
              />
            </mesh>
          </>
        )}

        {/* Skirt part of tunic */}
        <mesh castShadow position={[0, -0.24, 0]}>
          <boxGeometry args={[0.26, 0.15, 0.18]} />
          <meshStandardMaterial
            color={tunicColor}
            roughness={1}
            flatShading
          />
        </mesh>
      </group>

      {/* Left Arm - Simple blocky */}
      <group ref={leftArmRef} position={[-0.18, 0.25, 0]}>
        <mesh castShadow position={[0, -0.12, 0]}>
          <boxGeometry args={[0.08, 0.25, 0.08]} />
          <meshStandardMaterial color={tunicColor} roughness={1} flatShading />
        </mesh>

        {/* Hand */}
        <mesh castShadow position={[0, -0.27, 0]}>
          <boxGeometry args={[0.06, 0.06, 0.06]} />
          <meshStandardMaterial color={skinColor} roughness={1} flatShading />
        </mesh>

        {/* Shield - Zelda style */}
        <group ref={shieldRef} position={[0, -0.15, 0.08]}>
          {/* Shield body */}
          <mesh castShadow>
            <boxGeometry args={[0.15, 0.2, 0.03]} />
            <meshStandardMaterial
              color="#4488ff"
              metalness={0.3}
              roughness={0.6}
              flatShading
            />
          </mesh>

          {/* Shield border */}
          <mesh castShadow position={[0, 0, 0.016]}>
            <boxGeometry args={[0.13, 0.18, 0.01]} />
            <meshStandardMaterial
              color="#88bbff"
              metalness={0.4}
              roughness={0.5}
              flatShading
            />
          </mesh>

          {/* Shield emblem - triangle */}
          <mesh castShadow position={[0, 0, 0.026]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.01, 3]} />
            <meshStandardMaterial
              color="#ffcc00"
              metalness={0.7}
              roughness={0.3}
              flatShading
            />
          </mesh>
        </group>
      </group>

      {/* Right Arm - Simple blocky */}
      <group ref={rightArmRef} position={[0.18, 0.25, 0]}>
        <mesh castShadow position={[0, -0.12, 0]}>
          <boxGeometry args={[0.08, 0.25, 0.08]} />
          <meshStandardMaterial color={tunicColor} roughness={1} flatShading />
        </mesh>

        {/* Hand */}
        <mesh castShadow position={[0, -0.27, 0]}>
          <boxGeometry args={[0.06, 0.06, 0.06]} />
          <meshStandardMaterial color={skinColor} roughness={1} flatShading />
        </mesh>

        {/* Sword - 8-bit Zelda style */}
        {equippedWeapon && (
          <group ref={swordRef} position={[0, -0.27, 0.1]} rotation={[0, 0, 0]}>
            {/* Blade */}
            <mesh castShadow position={[0, -0.2, 0]}>
              <boxGeometry args={[0.06, 0.4, 0.015]} />
              <meshStandardMaterial
                color="#e0e0e0"
                metalness={0.9}
                roughness={0.1}
                flatShading
                emissive={getRarityColor(equippedWeapon)}
                emissiveIntensity={isLegendary(equippedWeapon) ? 0.7 : 0.2}
              />
            </mesh>

            {/* Blade shine */}
            <mesh castShadow position={[0.025, -0.2, 0]}>
              <boxGeometry args={[0.01, 0.38, 0.012]} />
              <meshStandardMaterial
                color="#ffffff"
                metalness={1}
                roughness={0.05}
                flatShading
                emissive="#ffffff"
                emissiveIntensity={0.5}
              />
            </mesh>

            {/* Crossguard */}
            <mesh castShadow position={[0, 0.02, 0]} rotation={[0, 0, 0]}>
              <boxGeometry args={[0.14, 0.03, 0.03]} />
              <meshStandardMaterial
                color={getRarityColor(equippedWeapon)}
                metalness={0.7}
                roughness={0.3}
                flatShading
              />
            </mesh>

            {/* Guard ornaments */}
            <mesh castShadow position={[-0.07, 0.02, 0]}>
              <boxGeometry args={[0.025, 0.04, 0.025]} />
              <meshStandardMaterial
                color={getRarityColor(equippedWeapon)}
                metalness={0.8}
                roughness={0.2}
                flatShading
              />
            </mesh>
            <mesh castShadow position={[0.07, 0.02, 0]}>
              <boxGeometry args={[0.025, 0.04, 0.025]} />
              <meshStandardMaterial
                color={getRarityColor(equippedWeapon)}
                metalness={0.8}
                roughness={0.2}
                flatShading
              />
            </mesh>

            {/* Handle */}
            <mesh castShadow position={[0, 0.08, 0]}>
              <boxGeometry args={[0.035, 0.1, 0.035]} />
              <meshStandardMaterial color="#4444aa" roughness={1} flatShading />
            </mesh>

            {/* Handle wrap lines */}
            <mesh castShadow position={[0, 0.06, 0.018]}>
              <boxGeometry args={[0.04, 0.015, 0.001]} />
              <meshStandardMaterial color="#222266" flatShading />
            </mesh>
            <mesh castShadow position={[0, 0.1, 0.018]}>
              <boxGeometry args={[0.04, 0.015, 0.001]} />
              <meshStandardMaterial color="#222266" flatShading />
            </mesh>

            {/* Pommel */}
            <mesh castShadow position={[0, 0.14, 0]}>
              <boxGeometry args={[0.045, 0.045, 0.045]} />
              <meshStandardMaterial
                color={getRarityColor(equippedWeapon)}
                metalness={0.8}
                roughness={0.2}
                flatShading
                emissive={getRarityColor(equippedWeapon)}
                emissiveIntensity={0.3}
              />
            </mesh>

            {/* Legendary gem */}
            {isLegendary(equippedWeapon) && (
              <mesh castShadow position={[0, 0.14, 0.03]}>
                <boxGeometry args={[0.02, 0.02, 0.015]} />
                <meshStandardMaterial
                  color="#ff4400"
                  metalness={0}
                  roughness={0}
                  flatShading
                  emissive="#ff4400"
                  emissiveIntensity={2}
                  transparent
                  opacity={0.9}
                />
              </mesh>
            )}

            {/* Master Sword glow effect */}
            {isLegendary(equippedWeapon) && (
              <pointLight
                position={[0, -0.2, 0]}
                color={getRarityColor(equippedWeapon)}
                intensity={1.5}
                distance={1.5}
              />
            )}
          </group>
        )}
      </group>

      {/* Legs - Simple boots style */}
      <group position={[0, -0.15, 0]}>
        {/* Left leg */}
        <mesh castShadow position={[-0.06, -0.12, 0]}>
          <boxGeometry args={[0.08, 0.22, 0.08]} />
          <meshStandardMaterial
            color={equippedLegs ? getEquipmentColor(equippedLegs, '#ffffff') : '#ffffff'}
            roughness={1}
            flatShading
          />
        </mesh>

        {/* Right leg */}
        <mesh castShadow position={[0.06, -0.12, 0]}>
          <boxGeometry args={[0.08, 0.22, 0.08]} />
          <meshStandardMaterial
            color={equippedLegs ? getEquipmentColor(equippedLegs, '#ffffff') : '#ffffff'}
            roughness={1}
            flatShading
          />
        </mesh>

        {/* Left boot */}
        <mesh castShadow position={[-0.06, -0.26, 0.02]}>
          <boxGeometry args={[0.09, 0.06, 0.12]} />
          <meshStandardMaterial color={bootsColor} roughness={1} flatShading />
        </mesh>

        {/* Right boot */}
        <mesh castShadow position={[0.06, -0.26, 0.02]}>
          <boxGeometry args={[0.09, 0.06, 0.12]} />
          <meshStandardMaterial color={bootsColor} roughness={1} flatShading />
        </mesh>
      </group>

      {/* Legendary effects - sparkles */}
      {(isLegendary(equippedHelmet) || isLegendary(equippedChest) || isLegendary(equippedWeapon)) && (
        <>
          <pointLight position={[0, 0.5, 0]} color="#ffff88" intensity={1.2} distance={2} />
          <pointLight position={[0, 0, 0.3]} color="#ffff88" intensity={0.8} distance={1.5} />
        </>
      )}

      {(isEpic(equippedHelmet) || isEpic(equippedChest)) && (
        <pointLight position={[0, 0.3, 0]} color="#dd66ff" intensity={1} distance={1.5} />
      )}

      {(isRare(equippedHelmet) || isRare(equippedChest)) && (
        <pointLight position={[0, 0.3, 0]} color="#4499ff" intensity={0.8} distance={1.2} />
      )}

      {/* Pixel-style particle effects */}
      {isLegendary(equippedHelmet) && (
        <ParticleSystem
          position={[0, 0.6, 0]}
          color="#ffff88"
          count={12}
          size={0.025}
          spread={0.12}
          speed={0.15}
        />
      )}

      {isLegendary(equippedChest) && (
        <ParticleSystem
          position={[0, 0.2, 0]}
          color="#ffff88"
          count={16}
          size={0.03}
          spread={0.15}
          speed={0.2}
        />
      )}

      {isLegendary(equippedWeapon) && (
        <ParticleSystem
          position={[0.18, -0.05, 0]}
          color="#ffff88"
          count={10}
          size={0.02}
          spread={0.1}
          speed={0.25}
        />
      )}
    </group>
  )
}

// Helper functions - Game Boy Color palette
function getEquipmentColor(equippedItem: EquippedItemWithDetails, baseColor: string): string {
  const item = Array.isArray(equippedItem.item) ? equippedItem.item[0] : equippedItem.item

  switch (item.rarity) {
    case 'legendary':
      return '#ffcc00' // Gold
    case 'epic':
      return '#cc44ff' // Purple
    case 'rare':
      return '#4488ff' // Blue
    case 'uncommon':
      return '#44cc44' // Green
    default:
      return baseColor
  }
}

function getRarityColor(equippedItem: EquippedItemWithDetails): string {
  const item = Array.isArray(equippedItem.item) ? equippedItem.item[0] : equippedItem.item

  switch (item.rarity) {
    case 'legendary':
      return '#ffee44'
    case 'epic':
      return '#dd66ff'
    case 'rare':
      return '#5599ff'
    case 'uncommon':
      return '#55dd55'
    default:
      return '#aaaaaa'
  }
}

function getDarkerShade(color: string): string {
  const hex = color.replace('#', '')
  const r = Math.max(0, parseInt(hex.substring(0, 2), 16) - 50)
  const g = Math.max(0, parseInt(hex.substring(2, 4), 16) - 50)
  const b = Math.max(0, parseInt(hex.substring(4, 6), 16) - 50)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function isLegendary(equippedItem: EquippedItemWithDetails | undefined): boolean {
  if (!equippedItem) return false
  const item = Array.isArray(equippedItem.item) ? equippedItem.item[0] : equippedItem.item
  return item?.rarity === 'legendary'
}

function isEpic(equippedItem: EquippedItemWithDetails | undefined): boolean {
  if (!equippedItem) return false
  const item = Array.isArray(equippedItem.item) ? equippedItem.item[0] : equippedItem.item
  return item?.rarity === 'epic'
}

function isRare(equippedItem: EquippedItemWithDetails | undefined): boolean {
  if (!equippedItem) return false
  const item = Array.isArray(equippedItem.item) ? equippedItem.item[0] : equippedItem.item
  return item?.rarity === 'rare'
}
