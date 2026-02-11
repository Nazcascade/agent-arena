import { useEffect, useState } from 'react'
import { StatCard } from '../components/Cards'
import { adminAPI } from '../utils/api'
import { 
  ServerIcon, 
  UserGroupIcon, 
  FireIcon,
  ClockIcon 
} from '../components/Icons'

export default function AdminPage() {
  const [stats, setStats] = useState(null)
  const [rooms, setRooms] = useState([])
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const [statsRes, roomsRes, agentsRes] = await Promise.all([
        adminAPI.getSystemStats(),
        adminAPI.getActiveRooms(),
        adminAPI.getOnlineAgents(),
      ])
      
      setStats(statsRes.data)
      setRooms(roomsRes.data.rooms || [])
      setAgents(agentsRes.data.agents || [])
    } catch (error) {
      console.error('Failed to fetch admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-slate-400">System overview and management</p>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Active Rooms" 
          value={stats?.activeRooms || 0} 
          icon={FireIcon}
        />
        <StatCard 
          title="Online Agents" 
          value={stats?.onlineAgents || 0} 
          icon={UserGroupIcon}
        />
        <StatCard 
          title="Total Games (24h)" 
          value={stats?.totalGames24h || 0} 
          icon={ClockIcon}
        />
        <StatCard 
          title="System Load" 
          value={`${stats?.systemLoad || 0}%`} 
          icon={ServerIcon}
        />
      </div>

      {/* Active Rooms */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Active Rooms</h2>
        {rooms.length === 0 ? (
          <p className="text-slate-400">No active rooms</p>
        ) : (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Room ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Game</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Level</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Players</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {rooms.map((room) => {
                  const duration = room.startTime 
                    ? Math.floor((Date.now() - new Date(room.startTime).getTime()) / 1000)
                    : 0
                  const mins = Math.floor(duration / 60)
                  const secs = duration % 60

                  return (
                    <tr key={room.id} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-sm font-mono text-slate-300">
                        {room.id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3 text-sm text-white capitalize">
                        {room.gameType?.replace('-', ' ')}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300 capitalize">
                        {room.level}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {room.players?.length || 0}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`
                          px-2 py-1 rounded-full text-xs font-medium
                          ${room.status === 'playing' ? 'bg-green-500/20 text-green-400' : ''}
                          ${room.status === 'waiting' ? 'bg-yellow-500/20 text-yellow-400' : ''}
                        `}>
                          {room.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300 font-mono">
                        {mins}:{secs.toString().padStart(2, '0')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Online Agents */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Online Agents</h2>
        {agents.length === 0 ? (
          <p className="text-slate-400">No agents online</p>
        ) : (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Agent</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">ELO</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {agents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-slate-700/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          agent.status === 'online' ? 'bg-green-500' :
                          agent.status === 'in_game' ? 'bg-yellow-500' :
                          'bg-gray-500'
                        }`} />
                        <span className="text-white">{agent.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-300 capitalize">
                        {agent.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-white font-mono">
                      {agent.elo}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {agent.balance}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}