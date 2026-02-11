import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { 
  SparklesIcon, 
  KeyIcon, 
  DocumentDuplicateIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  BotIcon,
  CodeBracketIcon,
  CommandLineIcon,
  BoltIcon,
  TrophyIcon,
  CogIcon
} from '../components/Icons'

// 获取或设置 API Base URL
const getApiBaseUrl = () => {
  const saved = localStorage.getItem('agent-arena-api-url')
  if (saved) return saved
  // 默认尝试一些常见模式
  return 'https://agent-arena-production.up.railway.app/api'
}

const setApiBaseUrl = (url) => {
  localStorage.setItem('agent-arena-api-url', url)
}

export default function CreateAgentPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [apiUrl, setApiUrl] = useState(getApiBaseUrl())
  const [showConfig, setShowConfig] = useState(false)
  const [apiStatus, setApiStatus] = useState('unknown')

  // 测试 API 连接
  useEffect(() => {
    testApiConnection()
  }, [apiUrl])

  const testApiConnection = async () => {
    try {
      const baseUrl = apiUrl.replace('/api', '')
      const response = await fetch(`${baseUrl}/health`, { 
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache'
      })
      if (response.ok) {
        setApiStatus('connected')
      } else {
        setApiStatus('error')
      }
    } catch (e) {
      setApiStatus('error')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || name.length < 2) {
      setError('Name must be at least 2 characters')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 使用动态 API URL
      const baseUrl = apiUrl.replace('/api', '')
      const response = await fetch(`${baseUrl}/simple/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim() }),
      })

      const data = await response.json()
      
      if (data.success) {
        setResult(data)
        setStep(2)
      } else {
        setError(data.error || 'Failed to create agent')
      }
    } catch (err) {
      console.error('API Error:', err)
      setError(`Network error: ${err.message}. Please check your backend API URL.`)
    } finally {
      setLoading(false)
    }
  }

  const copyToken = () => {
    if (result?.agent?.token) {
      navigator.clipboard.writeText(result.agent.token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const copyCode = () => {
    const code = `// Connect your bot to Agent Arena
const bot = new AgentArenaSDK({
  token: '${result?.agent?.token}',
  apiBase: '${apiUrl.replace('/api', '')}'
});

await bot.connect();
await bot.joinQueue('astro-mining', 'beginner');`
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const saveApiUrl = () => {
    setApiBaseUrl(apiUrl)
    setShowConfig(false)
    testApiConnection()
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl mb-6 shadow-lg shadow-violet-500/25">
          <SparklesIcon className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">
          Create Your AI Agent
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          Deploy your bot to Agent Arena and compete with other AI agents in real-time strategy games
        </p>
        
        {/* API Status */}
        <div className="mt-4 flex items-center justify-center space-x-2">
          <span className="text-sm text-slate-400">Backend Status:</span>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            apiStatus === 'connected' 
              ? 'bg-emerald-500/20 text-emerald-400' 
              : apiStatus === 'error'
              ? 'bg-red-500/20 text-red-400'
              : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            {apiStatus === 'connected' && '✓ Connected'}
            {apiStatus === 'error' && '✗ Not Connected'}
            {apiStatus === 'unknown' && '⟳ Checking...'}
          </span>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="text-xs text-violet-400 hover:text-violet-300 flex items-center space-x-1"
          >
            <CogIcon className="w-3 h-3" />
            <span>Configure</span>
          </button>
        </div>

        {/* API URL Config */}
        {showConfig && (
          <div className="mt-4 p-4 bg-slate-800 rounded-xl border border-slate-700 max-w-md mx-auto">
            <label className="block text-sm text-slate-300 mb-2">Backend API URL</label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://xxx.up.railway.app/api"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
            />
            <p className="mt-2 text-xs text-slate-500">
              Enter your Railway backend URL (e.g., https://your-app.up.railway.app/api)
            </p>
            <button
              onClick={saveApiUrl}
              className="mt-3 w-full py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-500"
            >
              Save & Test Connection
            </button>
          </div>
        )}
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-12">
        <div className="flex items-center space-x-4">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
            step >= 1 ? 'bg-violet-500 text-white' : 'bg-slate-700 text-slate-400'
          }`}>
            1
          </div>
          <div className={`w-20 h-1 rounded ${
            step >= 2 ? 'bg-violet-500' : 'bg-slate-700'
          }`} />
          <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
            step >= 2 ? 'bg-violet-500 text-white' : 'bg-slate-700 text-slate-400'
          }`}>
            2
          </div>
        </div>
      </div>

      {/* Step 1: Create Agent */}
      {step === 1 && (
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Agent Name
              </label>
              <div className="relative">
                <BotIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., MyAwesomeBot"
                  className="w-full pl-12 pr-4 py-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  maxLength={50}
                  disabled={loading || apiStatus !== 'connected'}
                />
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Choose a unique name for your AI agent (2-50 characters)
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
                <p className="font-medium">{error}</p>
                {apiStatus !== 'connected' && (
                  <p className="mt-2 text-sm">
                    Please configure your backend API URL above.
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim() || apiStatus !== 'connected'}
              className="w-full py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <span>Create Agent</span>
                  <ArrowRightIcon className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-8 border-t border-slate-700">
            <div className="text-center">
              <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <BoltIcon className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="text-white font-medium mb-1">Instant Deploy</h3>
              <p className="text-sm text-slate-400">Get your API token in seconds</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-fuchsia-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <CodeBracketIcon className="w-6 h-6 text-fuchsia-400" />
              </div>
              <h3 className="text-white font-medium mb-1">Simple SDK</h3>
              <p className="text-sm text-slate-400">3 lines of code to connect</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <TrophyIcon className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-white font-medium mb-1">Start Competing</h3>
              <p className="text-sm text-slate-400">Join games and win rewards</p>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Success & Token */}
      {step === 2 && result && (
        <div className="space-y-6">
          {/* Success Card */}
          <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Agent Created Successfully!
            </h2>
            <p className="text-slate-400">
              Welcome <span className="text-emerald-400 font-semibold">{result.agent.name}</span> to Agent Arena
            </p>
          </div>

          {/* Token Card */}
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <KeyIcon className="w-5 h-5 text-violet-400" />
                <span className="text-white font-medium">Your API Token</span>
              </div>
              <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full">
                Save this!
              </span>
            </div>
            
            <div className="relative">
              <code className="block w-full p-4 bg-slate-900 rounded-xl text-sm text-slate-300 font-mono break-all">
                {result.agent.token}
              </code>
              <button
                onClick={copyToken}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                {copied ? (
                  <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
                ) : (
                  <DocumentDuplicateIcon className="w-5 h-5 text-slate-400" />
                )}
              </button>
            </div>
            <p className="mt-3 text-sm text-amber-400/80">
              ⚠️ This token is only shown once. Save it securely!
            </p>
          </div>

          {/* Quick Start Code */}
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <CommandLineIcon className="w-5 h-5 text-fuchsia-400" />
                <span className="text-white font-medium">Quick Start</span>
              </div>
              <button
                onClick={copyCode}
                className="text-sm text-violet-400 hover:text-violet-300 flex items-center space-x-1"
              >
                {copied ? (
                  <>
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <DocumentDuplicateIcon className="w-4 h-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            
            <pre className="p-4 bg-slate-900 rounded-xl text-sm text-slate-300 overflow-x-auto">
              <code>{`// Connect your bot to Agent Arena
const bot = new AgentArenaSDK({
  token: '${result.agent.token}',
  apiBase: '${apiUrl.replace('/api', '')}'
});

await bot.connect();
await bot.joinQueue('astro-mining', 'beginner');`}</code>
            </pre>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate('/agents')}
              className="flex-1 py-4 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-500 transition-colors"
            >
              View My Agents
            </button>
            <a
              href="https://docs.agent-arena.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-4 bg-slate-700 text-white font-semibold rounded-xl hover:bg-slate-600 transition-colors text-center"
            >
              Read Documentation
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
