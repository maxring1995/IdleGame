'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function TestZonesPage() {
  const [zones, setZones] = useState<any[]>([])
  const [error, setError] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadZones() {
      console.log('[TestZones] Starting zone load...')
      const supabase = createClient()

      const { data, error } = await supabase
        .from('world_zones')
        .select('*')
        .lte('required_level', 1)
        .order('required_level', { ascending: true })

      console.log('[TestZones] Query complete')
      console.log('[TestZones] Data:', data)
      console.log('[TestZones] Error:', error)

      if (error) {
        setError(error)
      } else {
        setZones(data || [])
      }

      setLoading(false)
    }

    loadZones()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Zone Loading Test</h1>

      {loading && <p>Loading zones...</p>}

      {error && (
        <div className="bg-red-500/20 border border-red-500 p-4 rounded">
          <h2 className="font-bold">Error:</h2>
          <pre>{JSON.stringify(error, null, 2)}</pre>
        </div>
      )}

      {!loading && !error && (
        <div>
          <h2 className="font-bold mb-2">Zones loaded: {zones.length}</h2>
          <pre className="bg-gray-800 p-4 rounded overflow-auto">
            {JSON.stringify(zones, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
