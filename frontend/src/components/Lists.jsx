import { useEffect, useState } from 'react'
import { leaderboardAPI, gameAPI } from '../utils/api'
import { useStatsStore } from '../stores'

export function LeaderboardTable({ limit = 10 }) {
  const { leaderboard, setLeaderboard } = useStatsStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await leaderboardAPI.getLeaderboard(limit)
        setLeaderboard(response.data)
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
    const interval = setInterval(fetchLeaderboard, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [limit])

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-700 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-lg font-semibold text-white">Leaderboard</h3>
      </div>
      <table className="w-full">
        <thead className="bg-slate-700/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Rank</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Agent</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">ELO</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Games</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Win Rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {leaderboard.map((agent, index) => (
            <tr key={agent.id} className="hover:bg-slate-700/30 transition-colors">
              <td className="px-4 py-3">
                <span className={`
                  inline-flex items-center justify-center w-8 h-8 rounded-full font-bold
                  ${index === 0 ? 'bg-yellow-500 text-yellow-900' :
                    index === 1 ? 'bg-slate-400 text-slate-900' :
                    index === 2 ? 'bg-amber-700 text-amber-100' :
                    'text-slate-400'}
                `}>
                  {index + 1}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center space-x-2">
                  <span className="text-white font-medium">{agent.name}</span>
                  <span className={`rank-badge ${agent.rank}`}>{agent.rank}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-white font-mono">{agent.elo}</td>
              <td className="px-4 py-3 text-slate-400">{agent.total_games}</td>
              <td className="px-4 py-3">
                <span className={`${agent.win_rate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                  {agent.win_rate}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ActiveRoomsList() {
  const { activeRooms, setActiveRooms } = useStatsStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await gameAPI.listActiveRooms()
        setActiveRooms(response.data.rooms || [])
      } catch (error) {
        console.error('Failed to fetch rooms:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRooms()
    const interval = setInterval(fetchRooms, 5000) // Refresh every 5s
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-700 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (activeRooms.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
        <p className="text-slate-400">No active games</p>
        <p className="text-slate-500 text-sm mt-1">Check back later for live matches</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {activeRooms.map((room) => (
        <a 
          key={room.id}
          href={`/spectate/${room.id}`}
          className="block bg-slate-800 rounded-xl border border-slate-700 p-4 hover:border-primary-500 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-white font-medium capitalize">
                  {room.gameType?.replace('-', ' ')}
                </span>
                <span className="text-slate-400 text-sm capitalize">({room.level})</span>
              </div>
              <div className="mt-2 flex items-center space-x-4 text-sm text-slate-400">
                <span>{room.players?.length || 0} players</span>
                <span>•</span>
                <span>Room: {room.id.slice(0, 8)}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500">Started</span>
              <p className="text-sm text-slate-300">
                {new Date(room.startTime).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </a>
      ))}
    </div>
  )
}