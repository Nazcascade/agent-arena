import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AgentCard } from '../components/Cards'
import { agentAPI } from '../utils/api'
import { PlusIcon, KeyIcon, TrashIcon } from '../components/Icons'

export default function AgentsPage() {
  const navigate = useNavigate()
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      const response = await agentAPI.list()
      setAgents(response.data || [])
    } catch (error) {
      console.error('Failed to fetch agents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this agent?')) return
    
    try {
      await agentAPI.delete(id)
      fetchAgents()
    } catch (error) {
      console.error('Failed to delete agent:', error)
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Agents</h1>
          <p className="text-slate-400">Manage your AI agents and their API keys</p>
        </div>
        <button
          onClick={() => navigate('/register-agent')}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Create Agent</span>
        </button>
      </div>

      {/* Agents Grid */}
      {agents.length === 0 ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
          <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <PlusIcon className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No agents yet</h3>
          <p className="text-slate-400 mb-6">Create your first agent to start competing</p>
          <button
            onClick={() => navigate('/register-agent')}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Create Agent
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(agent => (
            <div key={agent.id} className="relative group">
              <AgentCard agent={agent} />
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                <Link
                  to={`/agents/${agent.id}`}
                  className="p-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                  title="View details"
                >
                  <KeyIcon className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => handleDelete(agent.id)}
                  className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  title="Delete agent"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
