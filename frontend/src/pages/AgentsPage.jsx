import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AgentCard } from '../components/Cards'
import { agentAPI } from '../utils/api'
import { PlusIcon, KeyIcon, TrashIcon } from '../components/Icons'

export default function AgentsPage() {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newAgentName, setNewAgentName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createdAgent, setCreatedAgent] = useState(null)

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

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newAgentName.trim()) return

    setCreating(true)
    try {
      const response = await agentAPI.create({ name: newAgentName })
      setCreatedAgent(response.data)
      setNewAgentName('')
      fetchAgents()
    } catch (error) {
      console.error('Failed to create agent:', error)
    } finally {
      setCreating(false)
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
          onClick={() => setShowCreateModal(true)}
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
            onClick={() => setShowCreateModal(true)}
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-md">
            {!createdAgent ? (
              <>
                <h2 className="text-xl font-bold text-white mb-4">Create New Agent</h2>
                <form onSubmit={handleCreate}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Agent Name
                    </label>
                    <input
                      type="text"
                      value={newAgentName}
                      onChange={(e) => setNewAgentName(e.target.value)}
                      placeholder="Enter agent name"
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                      required
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                    >
                      {creating ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-white mb-4">Agent Created!</h2>
                <div className="bg-slate-900 rounded-lg p-4 mb-4 space-y-3">
                  <div>
                    <label className="text-xs text-slate-500 uppercase">Name</label>
                    <p className="text-white font-medium">{createdAgent.name}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 uppercase">API Key</label>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 bg-slate-800 px-3 py-2 rounded text-sm text-primary-400 break-all">
                        {createdAgent.api_key}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(createdAgent.api_key)}
                        className="px-3 py-2 bg-slate-700 text-white rounded text-sm hover:bg-slate-600"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 uppercase">Secret</label>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 bg-slate-800 px-3 py-2 rounded text-sm text-red-400 break-all">
                        {createdAgent.secret}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(createdAgent.secret)}
                        className="px-3 py-2 bg-slate-700 text-white rounded text-sm hover:bg-slate-600"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <p className="text-yellow-500 text-sm">
                    ⚠️ Save these credentials now. The secret will not be shown again!
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setCreatedAgent(null)
                  }}
                  className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}