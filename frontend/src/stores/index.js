import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      login: (user, token) => set({ 
        user, 
        token, 
        isAuthenticated: true 
      }),
      
      logout: () => set({ 
        user: null, 
        token: null, 
        isAuthenticated: false 
      }),
      
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),
    }),
    {
      name: 'auth-storage',
    }
  )
)

export const useSocketStore = create((set, get) => ({
  socket: null,
  isConnected: false,
  roomState: null,
  gameState: null,
  spectators: 0,
  
  setSocket: (socket) => set({ socket }),
  setConnected: (isConnected) => set({ isConnected }),
  setRoomState: (roomState) => set({ roomState }),
  setGameState: (gameState) => set({ gameState }),
  setSpectators: (spectators) => set({ spectators }),
  
  reset: () => set({
    socket: null,
    isConnected: false,
    roomState: null,
    gameState: null,
    spectators: 0,
  }),
}))

export const useUIStore = create((set) => ({
  sidebarOpen: true,
  theme: 'dark',
  notifications: [],
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
  
  addNotification: (notification) => set((state) => ({
    notifications: [...state.notifications, { 
      id: Date.now(), 
      ...notification 
    }]
  })),
  
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),
}))

export const useStatsStore = create((set) => ({
  leaderboard: [],
  activeRooms: [],
  systemStats: null,
  
  setLeaderboard: (leaderboard) => set({ leaderboard }),
  setActiveRooms: (activeRooms) => set({ activeRooms }),
  setSystemStats: (systemStats) => set({ systemStats }),
  
  updateRoom: (roomId, updates) => set((state) => ({
    activeRooms: state.activeRooms.map(room =>
      room.id === roomId ? { ...room, ...updates } : room
    )
  })),
}))