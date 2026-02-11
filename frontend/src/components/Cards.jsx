import { Link } from 'react-router-dom'
import { BoltIcon, TrophyIcon, CurrencyDollarIcon } from './Icons'

export function AgentCard({ agent }) {
  const winRate = agent.total_games > 0 
    ? Math.round((agent.wins / agent.total_games) * 100) 
    : 0

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-500',
    in_game: 'bg-yellow-500 animate-pulse',
    matching: 'bg-blue-500 animate-pulse',
  }

  return (
    <Link 
      to={`/agents/${agent.id}`}
      className="block bg-slate-800 rounded-xl border border-slate-700 p-6 card-hover"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
          <span className={`rank-badge ${agent.rank} mt-1 inline-block`}>
            {agent.rank}
          </span>
        </div>
        <div className={`w-3 h-3 rounded-full ${statusColors[agent.status] || 'bg-gray-500'}`} />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center text-primary-400 mb-1">
            <BoltIcon className="w-4 h-4 mr-1" />
            <span className="text-xl font-bold text-white">{agent.elo}</span>
          </div>
          <span className="text-xs text-slate-400">ELO</span>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center text-yellow-400 mb-1">
            <TrophyIcon className="w-4 h-4 mr-1" />
            <span className="text-xl font-bold text-white">{agent.wins || 0}</span>
          </div>
          <span className="text-xs text-slate-400">Wins</span>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center text-green-400 mb-1">
            <CurrencyDollarIcon className="w-4 h-4 mr-1" />
            <span className="text-xl font-bold text-white">{agent.balance}</span>
          </div>
          <span className="text-xs text-slate-400">Balance</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>{agent.total_games || 0} games played</span>
        <span className={winRate >= 50 ? 'text-green-400' : 'text-red-400'}>
          {winRate}% win rate
        </span>
      </div>
    </Link>
  )
}

export function RoomCard({ room }) {
  const duration = room.startTime 
    ? Math.floor((Date.now() - new Date(room.startTime).getTime()) / 1000)
    : 0
  
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60

  return (
    <Link 
      to={`/spectate/${room.id}`}
      className="block bg-slate-800 rounded-xl border border-slate-700 p-6 card-hover"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white capitalize">
            {room.gameType?.replace('-', ' ')}
          </h3>
          <span className="text-sm text-slate-400 capitalize">{room.level} Level</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm text-red-400 font-medium">LIVE</span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {room.players?.map((player, idx) => (
          <div key={player.id} className="flex items-center space-x-2">
            <span className="text-slate-500 text-sm">#{idx + 1}</span>
            <span className="text-white">{player.name}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">
          {room.players?.length || 0} players
        </span>
        <span className="text-slate-400 font-mono">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
      </div>
    </Link>
  )
}

export function StatCard({ title, value, subtitle, icon: Icon, trend }) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-400 text-sm font-medium">{title}</h3>
        {Icon && <Icon className="w-5 h-5 text-slate-500" />}
      </div>
      <div className="space-y-1">
        <p className="text-3xl font-bold text-white">{value}</p>
        {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
        {trend && (
          <p className={`text-sm ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend > 0 ? '+' : ''}{trend}% from last hour
          </p>
        )}
      </div>
    </div>
  )
}