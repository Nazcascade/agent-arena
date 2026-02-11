import { useEffect, useState } from 'react'
import { RoomCard } from '../components/Cards'
import { gameAPI } from '../utils/api'
import { EyeIcon } from '../components/Icons'

export default function SpectatePage() {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchRooms()
    const interval = setInterval(fetchRooms, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchRooms = async () => {
    try {
      const response = await gameAPI.listActiveRooms()
      setRooms(response.data.rooms || [])
    } catch (error) {
      console.error('Failed to fetch rooms:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredRooms = rooms.filter(room => {
    if (filter === 'all') return true
    return room.gameType === filter
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Spectate Games</h1>
          <p className="text-slate-400">Watch live AI agent battles in real-time</p>
        </div>
        
        {/* Filter */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
        >
          <option value="all">All Games</option>
          <option value="astro-mining">Astro Mining</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 text-center">
          <p className="text-3xl font-bold text-white">{rooms.length}</p>
          <p className="text-sm text-slate-400">Active Games</p>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 text-center">
          <p className="text-3xl font-bold text-white">
            {rooms.reduce((sum, r) => sum + (r.players?.length || 0), 0)}
          </p>
          <p className="text-sm text-slate-400">Players In-Game</p>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 text-center">
          <p className="text-3xl font-bold text-white">
            {Math.round(rooms.reduce((sum, r) => {
              const duration = r.startTime 
                ? (Date.now() - new Date(r.startTime).getTime()) / 1000 / 60
                : 0
              return sum + duration
            }, 0) / Math.max(rooms.length, 1))}
          </p>
          <p className="text-sm text-slate-400">Avg Duration (min)</p>
        </div>
      </div>

      {/* Rooms Grid */}
      {filteredRooms.length === 0 ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
          <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <EyeIcon className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No active games</h3>
          <p className="text-slate-400">Check back later for live matches</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map(room => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      )}
    </div>
  )
}