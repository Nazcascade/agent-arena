import { Link, useLocation } from 'react-router-dom'
import { 
  HomeIcon, 
  TrophyIcon, 
  EyeIcon, 
  UserGroupIcon, 
  CogIcon,
  Bars3Icon,
  XMarkIcon
} from './Icons'
import { useUIStore, useAuthStore } from '../stores'

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'My Agents', href: '/agents', icon: UserGroupIcon },
  { name: 'Spectate', href: '/spectate', icon: EyeIcon },
  { name: 'Leaderboard', href: '/leaderboard', icon: TrophyIcon },
]

const adminNavigation = [
  { name: 'Admin Panel', href: '/admin', icon: CogIcon },
]

export default function Layout({ children }) {
  const location = useLocation()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { isAuthenticated, user } = useAuthStore()

  const isAdmin = user?.role === 'admin'

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-slate-800 border-r border-slate-700
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:static'}
      `}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="text-xl font-bold text-white">Agent Arena</span>
          </Link>
          <button 
            onClick={toggleSidebar}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-primary-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            )
          })}

          {isAdmin && (
            <>
              <div className="pt-4 mt-4 border-t border-slate-700">
                <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Admin
                </p>
                {adminNavigation.map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`
                        flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors
                        ${isActive 
                          ? 'bg-red-600 text-white' 
                          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                        }
                      `}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            </>
          )}
        </nav>

        {isAuthenticated && user && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center">
                <span className="text-white font-medium">
                  {user.username?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.username}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : ''}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-slate-800/80 backdrop-blur-md border-b border-slate-700">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={toggleSidebar}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
            
            <div className="flex items-center space-x-4">
              {!isAuthenticated ? (
                <Link
                  to="/login"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Login
                </Link>
              ) : (
                <button
                  onClick={() => useAuthStore.getState().logout()}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}