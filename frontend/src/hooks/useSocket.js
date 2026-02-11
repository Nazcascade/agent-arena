import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { useSocketStore } from '../stores'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'

export const useSocket = (options = {}) => {
  const { type, roomId, onConnect, onDisconnect, onError } = options
  const socketRef = useRef(null)
  const { setSocket, setConnected, setRoomState, setGameState } = useSocketStore()

  useEffect(() => {
    const query = { type }
    if (roomId) query.roomId = roomId

    const socket = io(SOCKET_URL, {
      query,
      transports: ['websocket'],
    })

    socketRef.current = socket
    setSocket(socket)

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id)
      setConnected(true)
      onConnect?.(socket)
    })

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason)
      setConnected(false)
      onDisconnect?.(reason)
    })

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error)
      onError?.(error)
    })

    // Room events
    socket.on('room:joined', (data) => {
      console.log('[Socket] Room joined:', data)
      setRoomState(data)
    })

    socket.on('room:state', (data) => {
      console.log('[Socket] Room state:', data)
      setRoomState(data)
    })

    // Game events
    socket.on('game:started', (data) => {
      console.log('[Socket] Game started:', data)
      setGameState(data.initialState)
    })

    socket.on('game:tick', (data) => {
      setGameState(data.state)
    })

    socket.on('game:ended', (data) => {
      console.log('[Socket] Game ended:', data)
      setGameState((prev) => prev ? { ...prev, status: 'ended', winner: data.winnerId } : null)
    })

    // Spectator events
    socket.on('spectator:joined', (data) => {
      console.log('[Socket] Spectator joined:', data)
    })

    socket.on('spectator:count', (data) => {
      useSocketStore.getState().setSpectators(data.count)
    })

    return () => {
      socket.disconnect()
      setSocket(null)
      setConnected(false)
    }
  }, [type, roomId])

  return socketRef.current
}

export const useAgentSocket = (agentId) => {
  return useSocket({
    type: 'agent',
    agentId,
  })
}

export const useSpectatorSocket = (roomId) => {
  return useSocket({
    type: 'spectator',
    roomId,
  })
}