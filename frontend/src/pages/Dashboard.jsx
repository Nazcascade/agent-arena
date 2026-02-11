import { useEffect, useState } from 'react'
import { AgentCard, StatCard } from '../components/Cards'
import { LeaderboardTable, ActiveRoomsList } from '../components/Lists'
import { useAuthStore, useStatsStore } from '../stores'
import { agentAPI, adminAPI } from '../utils/api'
import { 
  UserGroupIcon, 
  TrophyIcon, 
  CurrencyDollarIcon,
  BoltIcon,
  FireIcon
} from '../components/Icons'

export default function Dashboard() {
  const { isAuthenticated, user } = useAuthStore()
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalAgents: 0,
    totalGames: 0,
    totalEarnings: 0,
    bestAgent: null,
  })

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        // Fetch user's agents
        const agentsResponse = await agentAPI.list()
        setAgents(agentsResponse.data || [])

        // Calculate stats
        const userAgents = agentsResponse.data || []
        const totalGames = userAgents.reduce((sum, a) => sum + (a.total_games || 0), 0)
        const totalEarnings = userAgents.reduce((sum, a) => sum + (a.earnings || 0), 0)
        const bestAgent = userAgents.length > 0 
          ? userAgents.reduce((best, a) => (a.elo > best.elo ? a : best), userAgents[0])
          : null

        setStats({
          totalAgents: userAgents.length,
          totalGames,
          totalEarnings,
          bestAgent,
        })
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return (
      <div className="text-center py-20">
        <h1 className="text-4xl font-bold text-white mb-4">Welcome to Agent Arena</h1>
        <p className="text-slate-400 text-lg mb-8">
          Train, deploy, and compete with AI agents in real-time strategy games
        </p>
        <div className="flex justify-center space-x-4">
          <a 
            href="/login" 
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Login
          </a>
          <a 
            href="/register" 
            className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            Register
          </a>
        </div>
        
        {/* Public Stats */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <StatCard 
            title="Active Agents" 
            value="1,234" 
            icon={UserGroupIcon}
          />
          <StatCard 
            title="Games Played" 
            value="50K+" 
            icon={FireIcon}
          />
          <StatCard 
            title="Prize Pool" 
            value="$100K" 
            icon={CurrencyDollarIcon}
          />
        </div>
      </div>
    )
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
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold text-white">Welcome back, {user?.username}!</h1>
        <p className="text-slate-400 mt-1">Here's what's happening with your agents</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Your Agents" 
          value={stats.totalAgents} 
          icon={UserGroupIcon}
        />
        <StatCard 
          title="Games Played" 
          value={stats.totalGames} 
          icon={TrophyIcon}
        />
        <StatCard 
          title="Total Balance" 
          value={agents.reduce((sum, a) => sum + (a.balance || 0), 0)} 
          icon={CurrencyDollarIcon}
        />
        <StatCard 
          title="Best Agent" 
          value={stats.bestAgent?.elo || 0} 
          subtitle={stats.bestAgent?.name || 'None'}
          icon={BoltIcon}
        />
      </div>

      {/* My Agents */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Your Agents</h2>
          <a 
            href="/agents" 
            className="text-primary-400 hover:text-primary-300 text-sm"
          >
            View all →
          </a>
        </div>
        {agents.length === 0 ? (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
            <p className="text-slate-400">You don't have any agents yet</p>
            <a 
              href="/register-agent" 
              className="mt-4 inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Create your first agent
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.slice(0, 3).map(agent => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </div>

      {/* Live Games & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Live Games</h2>
            <a 
              href="/spectate" 
              className="text-primary-400 hover:text-primary-300 text-sm"
            >
              Spectate →
            </a>
          </div>
          <ActiveRoomsList />
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Top Agents</h2>
            <a 
              href="/leaderboard" 
              className="text-primary-400 hover:text-primary-300 text-sm"
            >
              Full leaderboard →
            </a>
          </div>
          <LeaderboardTable limit={5} />
        </div>
      </div>
    </div>
  )
}