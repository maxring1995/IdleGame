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

// Easing functions for smooth animations
const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

const easeOutElastic = (t: number): number => {
  const c4 = (2 * Math.PI) / 3
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
}

const lerp = (start: number, end: number, t: number): number => {
  return start + (end - start) * t
}

export default function CharacterModel({
  characterId,
  animationState = 'idle',
  scale = 1
}: CharacterModelProps) {
  // Main refs for character parts
  const groupRef = useRef<THREE.Group>(null)
  const headRef = useRef<THREE.Group>(null)
  const torsoRef = useRef<THREE.Group>(null)
  const weaponRef = useRef<THREE.Group>(null)
  const leftShoulderRef = useRef<THREE.Group>(null)
  const rightShoulderRef = useRef<THREE.Group>(null)
  const leftElbowRef = useRef<THREE.Group>(null)
  const rightElbowRef = useRef<THREE.Group>(null)
  const leftHipRef = useRef<THREE.Group>(null)
  const rightHipRef = useRef<THREE.Group>(null)
  const leftKneeRef = useRef<THREE.Group>(null)
  const rightKneeRef = useRef<THREE.Group>(null)
  const capeRef = useRef<THREE.Mesh>(null)

  const [equippedItems, setEquippedItems] = useState<EquippedItemWithDetails[]>([])
  const [previousState, setPreviousState] = useState<string>(animationState)
  const [transitionProgress, setTransitionProgress] = useState(1)
  const { character } = useGameStore()

  // Animation state transition
  useEffect(() => {
    if (animationState !== previousState) {
      setTransitionProgress(0)
      setPreviousState(animationState)
    }
  }, [animationState, previousState])

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

  // Get equipped items by slot
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
  const equippedBoots = getEquippedItem('boots')
  const equippedGloves = getEquippedItem('gloves')

  // Enhanced animation system with smooth transitions
  useFrame((state, delta) => {
    if (!groupRef.current) return

    const t = state.clock.getElapsedTime()

    // Smooth transition between animation states
    if (transitionProgress < 1) {
      setTransitionProgress(Math.min(1, transitionProgress + delta * 3))
    }
    const ease = easeInOutCubic(transitionProgress)

    // Reset all rotations to neutral for smooth transitions
    const neutralize = (ref: React.RefObject<THREE.Group>, factor: number = 1) => {
      if (ref.current) {
        ref.current.rotation.x = lerp(ref.current.rotation.x, 0, delta * 5 * factor)
        ref.current.rotation.y = lerp(ref.current.rotation.y, 0, delta * 5 * factor)
        ref.current.rotation.z = lerp(ref.current.rotation.z, 0, delta * 5 * factor)
      }
    }

    switch (animationState) {
      case 'idle':
        // Gentle breathing and natural sway
        if (groupRef.current) {
          groupRef.current.position.y = Math.sin(t * 1.2) * 0.02
          groupRef.current.rotation.y = Math.sin(t * 0.4) * 0.03
        }

        if (torsoRef.current) {
          torsoRef.current.rotation.x = Math.sin(t * 1.2) * 0.015
          torsoRef.current.rotation.z = Math.sin(t * 0.8) * 0.01
        }

        if (headRef.current) {
          headRef.current.rotation.y = Math.sin(t * 0.6) * 0.08
          headRef.current.rotation.x = Math.sin(t * 0.5) * 0.03
        }

        // Natural arm sway
        if (leftShoulderRef.current) {
          leftShoulderRef.current.rotation.x = Math.sin(t * 0.7) * 0.05
          leftShoulderRef.current.rotation.z = lerp(leftShoulderRef.current.rotation.z, 0.15, delta * 3)
        }
        if (rightShoulderRef.current) {
          rightShoulderRef.current.rotation.x = Math.sin(t * 0.7 + Math.PI) * 0.05
          rightShoulderRef.current.rotation.z = lerp(rightShoulderRef.current.rotation.z, -0.15, delta * 3)
        }

        if (leftElbowRef.current) {
          leftElbowRef.current.rotation.z = lerp(leftElbowRef.current.rotation.z, 0.3, delta * 3)
        }
        if (rightElbowRef.current) {
          rightElbowRef.current.rotation.z = lerp(rightElbowRef.current.rotation.z, -0.3, delta * 3)
        }

        // Slight knee bend
        if (leftKneeRef.current) {
          leftKneeRef.current.rotation.x = lerp(leftKneeRef.current.rotation.x, 0.05, delta * 3)
        }
        if (rightKneeRef.current) {
          rightKneeRef.current.rotation.x = lerp(rightKneeRef.current.rotation.x, 0.05, delta * 3)
        }

        // Cape gentle sway
        if (capeRef.current) {
          capeRef.current.rotation.x = Math.sin(t * 0.8) * 0.1 - 0.1
        }
        break

      case 'attack':
        // Overhead sword swing attack
        const attackCycle = (t * 2.5) % (Math.PI * 2)
        const attackProgress = Math.sin(attackCycle)
        const isSwinging = attackCycle < Math.PI

        if (groupRef.current) {
          groupRef.current.position.z = isSwinging ? attackProgress * 0.2 : 0
          groupRef.current.rotation.y = isSwinging ? -attackProgress * 0.3 : 0
        }

        if (torsoRef.current) {
          torsoRef.current.rotation.y = isSwinging ? attackProgress * 0.4 : 0
          torsoRef.current.rotation.x = isSwinging ? -attackProgress * 0.15 : 0
        }

        // Right arm (weapon) - overhead to downward swing
        if (rightShoulderRef.current) {
          // Swing from overhead (positive) to forward (negative)
          const targetRotX = isSwinging ?
            lerp(-2.2, 0.3, (attackProgress + 1) / 2) : // Overhead to down
            -1.5 // Ready position (raised)
          const targetRotZ = -0.2
          rightShoulderRef.current.rotation.x = lerp(rightShoulderRef.current.rotation.x, targetRotX, delta * 10)
          rightShoulderRef.current.rotation.z = lerp(rightShoulderRef.current.rotation.z, targetRotZ, delta * 8)
        }

        if (rightElbowRef.current) {
          // Elbow extends during swing
          const targetRot = isSwinging ?
            lerp(-1.4, -0.3, (attackProgress + 1) / 2) :
            -1.2
          rightElbowRef.current.rotation.z = lerp(rightElbowRef.current.rotation.z, targetRot, delta * 10)
        }

        // Left arm counterbalance - back and to side
        if (leftShoulderRef.current) {
          leftShoulderRef.current.rotation.x = lerp(leftShoulderRef.current.rotation.x, 0.5, delta * 5)
          leftShoulderRef.current.rotation.z = lerp(leftShoulderRef.current.rotation.z, 0.6, delta * 5)
        }

        if (leftElbowRef.current) {
          leftElbowRef.current.rotation.z = lerp(leftElbowRef.current.rotation.z, 0.4, delta * 5)
        }

        // Weapon rotation - swings with arm
        if (weaponRef.current) {
          weaponRef.current.rotation.x = 0
          weaponRef.current.rotation.z = isSwinging ? attackProgress * 0.3 : 0
        }

        // Cape dramatic flow
        if (capeRef.current) {
          capeRef.current.rotation.x = isSwinging ? -attackProgress * 0.3 - 0.15 : -0.1
        }
        break

      case 'defend':
        // Defensive stance
        if (groupRef.current) {
          groupRef.current.position.y = lerp(groupRef.current.position.y, -0.15, delta * 5)
        }

        if (torsoRef.current) {
          torsoRef.current.rotation.x = lerp(torsoRef.current.rotation.x, 0.2, delta * 5)
        }

        // Shield arm (left) up
        if (leftShoulderRef.current) {
          leftShoulderRef.current.rotation.x = lerp(leftShoulderRef.current.rotation.x, -1.2, delta * 5)
          leftShoulderRef.current.rotation.z = lerp(leftShoulderRef.current.rotation.z, 0.8, delta * 5)
        }

        if (leftElbowRef.current) {
          leftElbowRef.current.rotation.z = lerp(leftElbowRef.current.rotation.z, 1.2, delta * 5)
        }

        // Weapon arm ready
        if (rightShoulderRef.current) {
          rightShoulderRef.current.rotation.x = lerp(rightShoulderRef.current.rotation.x, -0.8, delta * 5)
          rightShoulderRef.current.rotation.z = lerp(rightShoulderRef.current.rotation.z, -0.3, delta * 5)
        }

        if (rightElbowRef.current) {
          rightElbowRef.current.rotation.z = lerp(rightElbowRef.current.rotation.z, -0.9, delta * 5)
        }

        // Knees bent
        if (leftKneeRef.current) {
          leftKneeRef.current.rotation.x = lerp(leftKneeRef.current.rotation.x, 0.4, delta * 5)
        }
        if (rightKneeRef.current) {
          rightKneeRef.current.rotation.x = lerp(rightKneeRef.current.rotation.x, 0.4, delta * 5)
        }
        break

      case 'victory':
        // Celebratory pose with bounce
        const victoryBounce = Math.abs(Math.sin(t * 3)) * 0.2
        if (groupRef.current) {
          groupRef.current.position.y = victoryBounce
          groupRef.current.rotation.y = t * 0.8
        }

        // Arms raised
        if (leftShoulderRef.current) {
          const targetRotX = -1.8 + Math.sin(t * 4) * 0.2
          leftShoulderRef.current.rotation.x = lerp(leftShoulderRef.current.rotation.x, targetRotX, delta * 5)
          leftShoulderRef.current.rotation.z = lerp(leftShoulderRef.current.rotation.z, 0.3, delta * 5)
        }

        if (rightShoulderRef.current) {
          const targetRotX = -1.8 + Math.sin(t * 4 + Math.PI) * 0.2
          rightShoulderRef.current.rotation.x = lerp(rightShoulderRef.current.rotation.x, targetRotX, delta * 5)
          rightShoulderRef.current.rotation.z = lerp(rightShoulderRef.current.rotation.z, -0.3, delta * 5)
        }

        if (leftElbowRef.current) {
          leftElbowRef.current.rotation.z = lerp(leftElbowRef.current.rotation.z, 0.8, delta * 5)
        }
        if (rightElbowRef.current) {
          rightElbowRef.current.rotation.z = lerp(rightElbowRef.current.rotation.z, -0.8, delta * 5)
        }

        // Head looking up
        if (headRef.current) {
          headRef.current.rotation.x = lerp(headRef.current.rotation.x, -0.3, delta * 5)
        }

        // Cape flowing
        if (capeRef.current) {
          capeRef.current.rotation.x = Math.sin(t * 3) * 0.3 - 0.2
        }
        break

      case 'defeat':
        // Slumped defeated pose
        if (groupRef.current) {
          groupRef.current.position.y = lerp(groupRef.current.position.y, -0.35, delta * 3)
          groupRef.current.rotation.x = lerp(groupRef.current.rotation.x, 0.4, delta * 3)
        }

        if (torsoRef.current) {
          torsoRef.current.rotation.x = lerp(torsoRef.current.rotation.x, 0.6, delta * 3)
        }

        if (headRef.current) {
          headRef.current.rotation.x = lerp(headRef.current.rotation.x, 0.5, delta * 3)
          headRef.current.rotation.y = lerp(headRef.current.rotation.y, -0.3, delta * 3)
        }

        // Arms drooping
        if (leftShoulderRef.current) {
          leftShoulderRef.current.rotation.x = lerp(leftShoulderRef.current.rotation.x, 0.8, delta * 3)
          leftShoulderRef.current.rotation.z = lerp(leftShoulderRef.current.rotation.z, 0.3, delta * 3)
        }

        if (rightShoulderRef.current) {
          rightShoulderRef.current.rotation.x = lerp(rightShoulderRef.current.rotation.x, 0.8, delta * 3)
          rightShoulderRef.current.rotation.z = lerp(rightShoulderRef.current.rotation.z, -0.3, delta * 3)
        }

        if (leftElbowRef.current) {
          leftElbowRef.current.rotation.z = lerp(leftElbowRef.current.rotation.z, 0.2, delta * 3)
        }
        if (rightElbowRef.current) {
          rightElbowRef.current.rotation.z = lerp(rightElbowRef.current.rotation.z, -0.2, delta * 3)
        }

        // Knees buckled
        if (leftKneeRef.current) {
          leftKneeRef.current.rotation.x = lerp(leftKneeRef.current.rotation.x, 0.8, delta * 3)
        }
        if (rightKneeRef.current) {
          rightKneeRef.current.rotation.x = lerp(rightKneeRef.current.rotation.x, 0.8, delta * 3)
        }

        // Cape draped
        if (capeRef.current) {
          capeRef.current.rotation.x = lerp(capeRef.current.rotation.x, 0.2, delta * 3)
        }
        break
    }
  })

  // Enhanced colors and materials
  const skinColor = '#ffdbac'
  const hairColor = '#3d2817'
  const helmetColor = equippedHelmet ? getEquipmentColor(equippedHelmet, '#5a6a7f') : null
  const chestColor = equippedChest ? getEquipmentColor(equippedChest, '#3d5a80') : '#8b7355'
  const legsColor = equippedLegs ? getEquipmentColor(equippedLegs, '#4a4a4a') : '#5a4a3a'
  const bootsColor = equippedBoots ? getEquipmentColor(equippedBoots, '#2c2c2c') : '#3a3a3a'
  const glovesColor = equippedGloves ? getEquipmentColor(equippedGloves, '#8b7355') : skinColor
  const capeColor = equippedChest ? getDarkerShade(getEquipmentColor(equippedChest, '#7a1c1c')) : '#7a1c1c'

  return (
    <group ref={groupRef} position={[0, -0.5, 0]} scale={scale}>
      {/* Head Group */}
      <group ref={headRef} position={[0, 0.55, 0]}>
        {/* Neck */}
        <mesh castShadow position={[0, -0.1, 0]}>
          <cylinderGeometry args={[0.06, 0.07, 0.12, 16]} />
          <meshStandardMaterial color={skinColor} roughness={0.8} metalness={0.1} />
        </mesh>

        {/* Head */}
        <mesh castShadow>
          <sphereGeometry args={[0.13, 32, 32]} />
          <meshStandardMaterial
            color={helmetColor || skinColor}
            roughness={helmetColor ? 0.5 : 0.9}
            metalness={helmetColor ? 0.4 : 0.05}
          />
        </mesh>

        {/* Hair (if no helmet) */}
        {!equippedHelmet && (
          <>
            {/* Top of head */}
            <mesh castShadow position={[0, 0.08, 0]}>
              <sphereGeometry args={[0.11, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
              <meshStandardMaterial color={hairColor} roughness={0.95} />
            </mesh>
            {/* Bangs */}
            <mesh castShadow position={[0, 0.04, 0.12]}>
              <boxGeometry args={[0.2, 0.08, 0.04]} />
              <meshStandardMaterial color={hairColor} roughness={0.95} />
            </mesh>
          </>
        )}

        {/* Helmet details */}
        {equippedHelmet && (
          <>
            {/* Visor */}
            <mesh castShadow position={[0, -0.02, 0.125]}>
              <boxGeometry args={[0.14, 0.05, 0.02]} />
              <meshStandardMaterial
                color={getRarityColor(equippedHelmet)}
                metalness={0.9}
                roughness={0.2}
                emissive={getRarityColor(equippedHelmet)}
                emissiveIntensity={isLegendary(equippedHelmet) ? 0.4 : 0.15}
              />
            </mesh>

            {/* Helmet crest */}
            <mesh castShadow position={[0, 0.13, -0.02]} rotation={[0.2, 0, 0]}>
              <coneGeometry args={[0.04, 0.15, 8]} />
              <meshStandardMaterial
                color={getRarityColor(equippedHelmet)}
                metalness={0.8}
                roughness={0.3}
              />
            </mesh>

            {/* Side guards */}
            <mesh castShadow position={[-0.11, -0.03, 0]}>
              <boxGeometry args={[0.04, 0.12, 0.12]} />
              <meshStandardMaterial
                color={getDarkerShade(getRarityColor(equippedHelmet))}
                metalness={0.7}
                roughness={0.4}
              />
            </mesh>
            <mesh castShadow position={[0.11, -0.03, 0]}>
              <boxGeometry args={[0.04, 0.12, 0.12]} />
              <meshStandardMaterial
                color={getDarkerShade(getRarityColor(equippedHelmet))}
                metalness={0.7}
                roughness={0.4}
              />
            </mesh>
          </>
        )}

        {/* Face features (if no helmet) */}
        {!equippedHelmet && (
          <>
            {/* Eyes */}
            <mesh position={[-0.04, 0.02, 0.115]}>
              <sphereGeometry args={[0.015, 16, 16]} />
              <meshStandardMaterial color="#1a1a1a" />
            </mesh>
            <mesh position={[0.04, 0.02, 0.115]}>
              <sphereGeometry args={[0.015, 16, 16]} />
              <meshStandardMaterial color="#1a1a1a" />
            </mesh>

            {/* Nose */}
            <mesh position={[0, -0.01, 0.12]}>
              <coneGeometry args={[0.015, 0.04, 8]} />
              <meshStandardMaterial color={skinColor} roughness={0.9} />
            </mesh>

            {/* Mouth */}
            <mesh position={[0, -0.04, 0.11]}>
              <boxGeometry args={[0.03, 0.008, 0.01]} />
              <meshStandardMaterial color="#8b4545" roughness={0.7} />
            </mesh>
          </>
        )}
      </group>

      {/* Torso Group */}
      <group ref={torsoRef} position={[0, 0.22, 0]}>
        {/* Main torso */}
        <mesh castShadow>
          <capsuleGeometry args={[0.16, 0.4, 16, 32]} />
          <meshStandardMaterial
            color={chestColor}
            roughness={equippedChest ? 0.4 : 0.7}
            metalness={equippedChest ? 0.5 : 0.1}
            emissive={equippedChest && isLegendary(equippedChest) ? getRarityColor(equippedChest) : '#000000'}
            emissiveIntensity={0.15}
          />
        </mesh>

        {/* Chest armor plates */}
        {equippedChest && (
          <>
            {/* Chest plate */}
            <mesh castShadow position={[0, 0.12, 0.15]}>
              <boxGeometry args={[0.24, 0.18, 0.04]} />
              <meshStandardMaterial
                color={getRarityColor(equippedChest)}
                metalness={0.9}
                roughness={0.2}
              />
            </mesh>

            {/* Shoulder pads base */}
            <mesh castShadow position={[-0.18, 0.18, 0]}>
              <sphereGeometry args={[0.08, 24, 24]} />
              <meshStandardMaterial
                color={getRarityColor(equippedChest)}
                metalness={0.85}
                roughness={0.25}
              />
            </mesh>
            <mesh castShadow position={[0.18, 0.18, 0]}>
              <sphereGeometry args={[0.08, 24, 24]} />
              <meshStandardMaterial
                color={getRarityColor(equippedChest)}
                metalness={0.85}
                roughness={0.25}
              />
            </mesh>

            {/* Abs plates */}
            <mesh castShadow position={[0, -0.05, 0.14]}>
              <boxGeometry args={[0.2, 0.12, 0.03]} />
              <meshStandardMaterial
                color={getDarkerShade(getRarityColor(equippedChest))}
                metalness={0.8}
                roughness={0.3}
              />
            </mesh>

            {/* Side plates */}
            <mesh castShadow position={[-0.14, 0.05, 0.08]}>
              <boxGeometry args={[0.06, 0.25, 0.12]} />
              <meshStandardMaterial
                color={getDarkerShade(getRarityColor(equippedChest))}
                metalness={0.75}
                roughness={0.35}
              />
            </mesh>
            <mesh castShadow position={[0.14, 0.05, 0.08]}>
              <boxGeometry args={[0.06, 0.25, 0.12]} />
              <meshStandardMaterial
                color={getDarkerShade(getRarityColor(equippedChest))}
                metalness={0.75}
                roughness={0.35}
              />
            </mesh>
          </>
        )}

        {/* Belt */}
        <mesh castShadow position={[0, -0.22, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.06, 24]} />
          <meshStandardMaterial color="#654321" roughness={0.8} metalness={0.2} />
        </mesh>

        {/* Belt buckle */}
        <mesh castShadow position={[0, -0.22, 0.16]}>
          <boxGeometry args={[0.08, 0.06, 0.02]} />
          <meshStandardMaterial color="#c9a553" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* Left Arm (Shoulder -> Elbow -> Hand) */}
      <group ref={leftShoulderRef} position={[-0.22, 0.35, 0]}>
        {/* Upper arm */}
        <mesh castShadow position={[0, -0.13, 0]}>
          <capsuleGeometry args={[0.055, 0.22, 12, 24]} />
          <meshStandardMaterial
            color={chestColor}
            roughness={0.6}
            metalness={equippedChest ? 0.4 : 0.1}
          />
        </mesh>

        {/* Forearm group (with elbow joint) */}
        <group ref={leftElbowRef} position={[0, -0.25, 0]}>
          {/* Forearm */}
          <mesh castShadow position={[0, -0.12, 0]}>
            <capsuleGeometry args={[0.05, 0.2, 12, 24]} />
            <meshStandardMaterial
              color={glovesColor}
              roughness={0.7}
              metalness={equippedGloves ? 0.35 : 0.1}
            />
          </mesh>

          {/* Hand */}
          <mesh castShadow position={[0, -0.26, 0]}>
            <boxGeometry args={[0.06, 0.08, 0.04]} />
            <meshStandardMaterial
              color={glovesColor}
              roughness={0.8}
              metalness={equippedGloves ? 0.25 : 0.05}
            />
          </mesh>

          {/* Fingers */}
          <mesh castShadow position={[0, -0.31, 0.01]}>
            <boxGeometry args={[0.05, 0.04, 0.03]} />
            <meshStandardMaterial
              color={glovesColor}
              roughness={0.85}
              metalness={equippedGloves ? 0.2 : 0.05}
            />
          </mesh>
        </group>
      </group>

      {/* Right Arm (Shoulder -> Elbow -> Hand + Weapon) */}
      <group ref={rightShoulderRef} position={[0.22, 0.35, 0]}>
        {/* Upper arm */}
        <mesh castShadow position={[0, -0.13, 0]}>
          <capsuleGeometry args={[0.055, 0.22, 12, 24]} />
          <meshStandardMaterial
            color={chestColor}
            roughness={0.6}
            metalness={equippedChest ? 0.4 : 0.1}
          />
        </mesh>

        {/* Forearm group (with elbow joint) */}
        <group ref={rightElbowRef} position={[0, -0.25, 0]}>
          {/* Forearm */}
          <mesh castShadow position={[0, -0.12, 0]}>
            <capsuleGeometry args={[0.05, 0.2, 12, 24]} />
            <meshStandardMaterial
              color={glovesColor}
              roughness={0.7}
              metalness={equippedGloves ? 0.35 : 0.1}
            />
          </mesh>

          {/* Hand */}
          <mesh castShadow position={[0, -0.26, 0]}>
            <boxGeometry args={[0.06, 0.08, 0.04]} />
            <meshStandardMaterial
              color={glovesColor}
              roughness={0.8}
              metalness={equippedGloves ? 0.25 : 0.05}
            />
          </mesh>

          {/* Weapon - Professional Sword */}
          {equippedWeapon && (
            <group ref={weaponRef} position={[0, -0.3, 0]} rotation={[0, 0, 0]}>
              {/* Blade */}
              <mesh castShadow position={[0, -0.3, 0]}>
                <boxGeometry args={[0.05, 0.55, 0.012]} />
                <meshStandardMaterial
                  color="#d0d0d0"
                  metalness={0.98}
                  roughness={0.1}
                  emissive={getRarityColor(equippedWeapon)}
                  emissiveIntensity={isLegendary(equippedWeapon) ? 0.5 : isEpic(equippedWeapon) ? 0.3 : 0.1}
                />
              </mesh>

              {/* Blade fuller (blood groove) */}
              <mesh castShadow position={[0, -0.3, 0.008]}>
                <boxGeometry args={[0.015, 0.5, 0.008]} />
                <meshStandardMaterial
                  color="#a0a0a0"
                  metalness={0.95}
                  roughness={0.15}
                />
              </mesh>

              {/* Sharp edge highlight */}
              <mesh castShadow position={[0.025, -0.3, 0]}>
                <boxGeometry args={[0.003, 0.54, 0.01]} />
                <meshStandardMaterial
                  color="#ffffff"
                  metalness={1}
                  roughness={0.05}
                  emissive={getRarityColor(equippedWeapon)}
                  emissiveIntensity={0.4}
                />
              </mesh>

              {/* Blade tip */}
              <mesh castShadow position={[0, -0.58, 0]}>
                <coneGeometry args={[0.025, 0.08, 4]} />
                <meshStandardMaterial
                  color="#d0d0d0"
                  metalness={0.98}
                  roughness={0.1}
                />
              </mesh>

              {/* Cross guard */}
              <mesh castShadow position={[0, -0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
                <capsuleGeometry args={[0.02, 0.18, 8, 16]} />
                <meshStandardMaterial
                  color={getRarityColor(equippedWeapon)}
                  metalness={0.85}
                  roughness={0.25}
                />
              </mesh>

              {/* Cross guard ornaments */}
              <mesh castShadow position={[-0.09, -0.02, 0]}>
                <sphereGeometry args={[0.025, 16, 16]} />
                <meshStandardMaterial
                  color={getRarityColor(equippedWeapon)}
                  metalness={0.9}
                  roughness={0.2}
                />
              </mesh>
              <mesh castShadow position={[0.09, -0.02, 0]}>
                <sphereGeometry args={[0.025, 16, 16]} />
                <meshStandardMaterial
                  color={getRarityColor(equippedWeapon)}
                  metalness={0.9}
                  roughness={0.2}
                />
              </mesh>

              {/* Handle/Grip */}
              <mesh castShadow position={[0, 0.04, 0]}>
                <cylinderGeometry args={[0.018, 0.022, 0.12, 16]} />
                <meshStandardMaterial color="#3d2817" roughness={0.95} metalness={0.05} />
              </mesh>

              {/* Handle wrap detail */}
              {[...Array(5)].map((_, i) => (
                <mesh key={i} castShadow position={[0, 0.01 + i * 0.02, 0]}>
                  <torusGeometry args={[0.02, 0.004, 8, 16]} />
                  <meshStandardMaterial color="#2d1a0f" roughness={0.9} />
                </mesh>
              ))}

              {/* Pommel */}
              <mesh castShadow position={[0, 0.12, 0]}>
                <sphereGeometry args={[0.032, 20, 20]} />
                <meshStandardMaterial
                  color={getRarityColor(equippedWeapon)}
                  metalness={0.9}
                  roughness={0.2}
                  emissive={getRarityColor(equippedWeapon)}
                  emissiveIntensity={0.2}
                />
              </mesh>

              {/* Pommel gem (legendary) */}
              {isLegendary(equippedWeapon) && (
                <mesh castShadow position={[0, 0.12, 0.025]}>
                  <sphereGeometry args={[0.012, 16, 16]} />
                  <meshStandardMaterial
                    color="#ff6b00"
                    metalness={0.1}
                    roughness={0.1}
                    emissive="#ff6b00"
                    emissiveIntensity={1}
                    transparent
                    opacity={0.9}
                  />
                </mesh>
              )}

              {/* Legendary weapon glow */}
              {isLegendary(equippedWeapon) && (
                <pointLight
                  position={[0, -0.3, 0]}
                  color={getRarityColor(equippedWeapon)}
                  intensity={1.2}
                  distance={2}
                  decay={2}
                />
              )}

              {/* Epic weapon glow */}
              {isEpic(equippedWeapon) && (
                <pointLight
                  position={[0, -0.3, 0]}
                  color={getRarityColor(equippedWeapon)}
                  intensity={0.8}
                  distance={1.5}
                  decay={2}
                />
              )}
            </group>
          )}
        </group>
      </group>

      {/* Left Leg (Hip -> Knee -> Foot) */}
      <group ref={leftHipRef} position={[-0.1, -0.05, 0]}>
        {/* Thigh */}
        <mesh castShadow position={[0, -0.17, 0]}>
          <capsuleGeometry args={[0.07, 0.28, 12, 24]} />
          <meshStandardMaterial
            color={legsColor}
            roughness={0.7}
            metalness={equippedLegs ? 0.35 : 0.1}
          />
        </mesh>

        {/* Knee group */}
        <group ref={leftKneeRef} position={[0, -0.32, 0]}>
          {/* Knee cap */}
          <mesh castShadow>
            <sphereGeometry args={[0.06, 20, 20]} />
            <meshStandardMaterial
              color={legsColor}
              roughness={0.6}
              metalness={equippedLegs ? 0.4 : 0.1}
            />
          </mesh>

          {/* Shin */}
          <mesh castShadow position={[0, -0.18, 0]}>
            <capsuleGeometry args={[0.06, 0.28, 12, 24]} />
            <meshStandardMaterial
              color={legsColor}
              roughness={0.7}
              metalness={equippedLegs ? 0.35 : 0.1}
            />
          </mesh>

          {/* Ankle */}
          <mesh castShadow position={[0, -0.34, 0]}>
            <sphereGeometry args={[0.055, 16, 16]} />
            <meshStandardMaterial
              color={bootsColor}
              roughness={0.8}
              metalness={equippedBoots ? 0.25 : 0.1}
            />
          </mesh>

          {/* Boot */}
          <mesh castShadow position={[0, -0.41, 0.025]}>
            <boxGeometry args={[0.09, 0.1, 0.16]} />
            <meshStandardMaterial
              color={bootsColor}
              roughness={0.85}
              metalness={equippedBoots ? 0.2 : 0.05}
            />
          </mesh>

          {/* Boot toe */}
          <mesh castShadow position={[0, -0.42, 0.1]}>
            <boxGeometry args={[0.08, 0.08, 0.04]} />
            <meshStandardMaterial
              color={getDarkerShade(bootsColor)}
              roughness={0.9}
              metalness={equippedBoots ? 0.15 : 0.05}
            />
          </mesh>
        </group>
      </group>

      {/* Right Leg (Hip -> Knee -> Foot) */}
      <group ref={rightHipRef} position={[0.1, -0.05, 0]}>
        {/* Thigh */}
        <mesh castShadow position={[0, -0.17, 0]}>
          <capsuleGeometry args={[0.07, 0.28, 12, 24]} />
          <meshStandardMaterial
            color={legsColor}
            roughness={0.7}
            metalness={equippedLegs ? 0.35 : 0.1}
          />
        </mesh>

        {/* Knee group */}
        <group ref={rightKneeRef} position={[0, -0.32, 0]}>
          {/* Knee cap */}
          <mesh castShadow>
            <sphereGeometry args={[0.06, 20, 20]} />
            <meshStandardMaterial
              color={legsColor}
              roughness={0.6}
              metalness={equippedLegs ? 0.4 : 0.1}
            />
          </mesh>

          {/* Shin */}
          <mesh castShadow position={[0, -0.18, 0]}>
            <capsuleGeometry args={[0.06, 0.28, 12, 24]} />
            <meshStandardMaterial
              color={legsColor}
              roughness={0.7}
              metalness={equippedLegs ? 0.35 : 0.1}
            />
          </mesh>

          {/* Ankle */}
          <mesh castShadow position={[0, -0.34, 0]}>
            <sphereGeometry args={[0.055, 16, 16]} />
            <meshStandardMaterial
              color={bootsColor}
              roughness={0.8}
              metalness={equippedBoots ? 0.25 : 0.1}
            />
          </mesh>

          {/* Boot */}
          <mesh castShadow position={[0, -0.41, 0.025]}>
            <boxGeometry args={[0.09, 0.1, 0.16]} />
            <meshStandardMaterial
              color={bootsColor}
              roughness={0.85}
              metalness={equippedBoots ? 0.2 : 0.05}
            />
          </mesh>

          {/* Boot toe */}
          <mesh castShadow position={[0, -0.42, 0.1]}>
            <boxGeometry args={[0.08, 0.08, 0.04]} />
            <meshStandardMaterial
              color={getDarkerShade(bootsColor)}
              roughness={0.9}
              metalness={equippedBoots ? 0.15 : 0.05}
            />
          </mesh>
        </group>
      </group>

      {/* Cape/Cloak */}
      {equippedChest && (
        <mesh
          ref={capeRef}
          castShadow
          position={[0, 0.35, -0.18]}
          rotation={[-0.1, 0, 0]}
        >
          <boxGeometry args={[0.35, 0.8, 0.02]} />
          <meshStandardMaterial
            color={capeColor}
            roughness={0.9}
            metalness={0.05}
            side={THREE.DoubleSide}
            emissive={isLegendary(equippedChest) ? getRarityColor(equippedChest) : '#000000'}
            emissiveIntensity={0.1}
          />
        </mesh>
      )}

      {/* Lighting effects based on equipment rarity */}
      {/* Legendary aura */}
      {(isLegendary(equippedHelmet) || isLegendary(equippedChest) || isLegendary(equippedWeapon)) && (
        <>
          <pointLight position={[0, 0.5, 0]} color="#ffd700" intensity={0.8} distance={2} decay={2} />
          <pointLight position={[0, 0.2, 0]} color="#ffd700" intensity={0.5} distance={1.5} decay={2} />
          <pointLight position={[0, -0.2, 0]} color="#ffd700" intensity={0.3} distance={1} decay={2} />
        </>
      )}

      {/* Epic glow */}
      {(isEpic(equippedHelmet) || isEpic(equippedChest)) && (
        <>
          <pointLight position={[0, 0.4, 0]} color="#a855f7" intensity={0.6} distance={1.5} decay={2} />
          <pointLight position={[0, 0.1, 0]} color="#a855f7" intensity={0.4} distance={1} decay={2} />
        </>
      )}

      {/* Rare shimmer */}
      {(isRare(equippedHelmet) || isRare(equippedChest)) && (
        <pointLight position={[0, 0.3, 0]} color="#3b82f6" intensity={0.4} distance={1} decay={2} />
      )}

      {/* Particle effects */}
      {isLegendary(equippedHelmet) && (
        <ParticleSystem
          position={[0, 0.55, 0]}
          color="#ffd700"
          count={30}
          size={0.012}
          spread={0.2}
          speed={0.3}
        />
      )}

      {isLegendary(equippedChest) && (
        <ParticleSystem
          position={[0, 0.25, 0]}
          color="#ffd700"
          count={40}
          size={0.015}
          spread={0.25}
          speed={0.4}
        />
      )}

      {isLegendary(equippedWeapon) && (
        <ParticleSystem
          position={[0.22, 0.05, 0]}
          color="#ffd700"
          count={25}
          size={0.01}
          spread={0.15}
          speed={0.5}
        />
      )}

      {isEpic(equippedChest) && (
        <ParticleSystem
          position={[0, 0.25, 0]}
          color="#a855f7"
          count={25}
          size={0.012}
          spread={0.2}
          speed={0.35}
        />
      )}

      {isRare(equippedChest) && (
        <ParticleSystem
          position={[0, 0.25, 0]}
          color="#3b82f6"
          count={18}
          size={0.01}
          spread={0.18}
          speed={0.3}
        />
      )}
    </group>
  )
}

// Helper functions
function getEquipmentColor(equippedItem: EquippedItemWithDetails, baseColor: string): string {
  const item = Array.isArray(equippedItem.item) ? equippedItem.item[0] : equippedItem.item

  switch (item.rarity) {
    case 'legendary':
      return '#d4af37' // Gold
    case 'epic':
      return '#9333ea' // Purple
    case 'rare':
      return '#2563eb' // Blue
    case 'uncommon':
      return '#059669' // Green
    default:
      return baseColor
  }
}

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
      return '#6b7280'
  }
}

function getDarkerShade(color: string): string {
  // Simple darkening by reducing brightness
  const hex = color.replace('#', '')
  const r = Math.max(0, parseInt(hex.substring(0, 2), 16) - 40)
  const g = Math.max(0, parseInt(hex.substring(2, 4), 16) - 40)
  const b = Math.max(0, parseInt(hex.substring(4, 6), 16) - 40)
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
