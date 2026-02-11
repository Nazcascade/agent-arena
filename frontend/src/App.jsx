import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import AgentsPage from './pages/AgentsPage'
import CreateAgentPage from './pages/CreateAgentPage'
import SpectatePage from './pages/SpectatePage'
import LeaderboardPage from './pages/LeaderboardPage'
import AdminPage from './pages/AdminPage'
import LoginPage from './pages/LoginPage'
import GameSpectator from './components/GameSpectator'
import { useAuthStore } from './stores'

function ProtectedRoute({ children, requireAdmin = false }) {
  const { isAuthenticated, user } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }
  
  return children
}

function App() {
  return (
    <Routes>
      {/* Public routes without layout */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register-agent" element={<Layout><CreateAgentPage /></Layout>} />
      
      {/* Routes with layout */}
      <Route path="/" element={<Layout><Dashboard /></Layout>} />
      <Route path="/leaderboard" element={<Layout><LeaderboardPage /></Layout>} />
      <Route path="/spectate" element={<Layout><SpectatePage /></Layout>} />
      <Route path="/spectate/:roomId" element={<Layout><GameSpectator /></Layout>} />
      
      {/* Protected routes */}
      <Route 
        path="/agents" 
        element={
          <ProtectedRoute>
            <Layout><AgentsPage /></Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/agents/new" 
        element={
          <ProtectedRoute>
            <Layout><CreateAgentPage /></Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/agents/:agentId" 
        element={
          <ProtectedRoute>
            <Layout><div>Agent Detail (Coming Soon)</div></Layout>
          </ProtectedRoute>
        } 
      />
      
      {/* Admin routes */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute requireAdmin>
            <Layout><AdminPage /></Layout>
          </ProtectedRoute>
        } 
      />
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App