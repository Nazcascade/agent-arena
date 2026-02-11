import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores'
import { authAPI } from '../utils/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        // Mock login - in real app this would call the API
        // const response = await authAPI.login({
        //   username: formData.username,
        //   password: formData.password,
        // })
        
        // Mock successful login
        const mockUser = {
          id: '1',
          username: formData.username || 'Demo User',
          email: 'demo@example.com',
          role: 'user',
        }
        const mockToken = 'mock_jwt_token'
        
        login(mockUser, mockToken)
        navigate('/')
      } else {
        // Register
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match')
          setLoading(false)
          return
        }
        
        // Mock register
        // await authAPI.register({
        //   username: formData.username,
        //   email: formData.email,
        //   password: formData.password,
        // })
        
        setIsLogin(true)
        setError('Registration successful! Please login.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">A</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Agent Arena</h1>
          <p className="text-slate-400">AI Agent Competition Platform</p>
        </div>

        {/* Form */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-6">
            {isLogin ? 'Sign In' : 'Create Account'}
          </h2>

          {error && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              error.includes('successful') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                placeholder="Enter username"
                required
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                  placeholder="Enter email"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                placeholder="Enter password"
                required
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                  placeholder="Confirm password"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary-400 hover:text-primary-300"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-slate-400 hover:text-slate-300">
            ← Back to home
          </a>
        </div>
      </div>
    </div>
  )
}