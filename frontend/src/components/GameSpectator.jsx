import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useSocketStore } from '../stores'
import { useSpectatorSocket } from '../hooks/useSocket'
import { gameAPI } from '../utils/api'

// Map cell types to colors
const cellStyles = {
  empty: 'bg-slate-800',
  asteroid: 'bg-amber-700',
  gas: 'bg-cyan-600',
  nebula: 'bg-purple-800',
  base: 'bg-primary-600',
}

export default function GameSpectator() {
  const { roomId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [initialData, setInitialData] = useState(null)
  
  const { roomState, gameState, isConnected, spectators } = useSocketStore()

  // Connect as spectator
  useSpectatorSocket(roomId)

  // Fetch initial room data
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const response = await gameAPI.getRoom(roomId)
        setInitialData(response.data.room)
      } catch (err) {
        setError('Failed to load room')
      } finally {
        setLoading(false)
      }
    }

    fetchRoom()
  }, [roomId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-400 text-lg">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const currentState = gameState || initialData?.gameState
  const isLive = roomState?.status === 'playing' || initialData?.status === 'playing'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Spectating: {initialData?.gameType?.replace('-', ' ')}
          </h1>
          <p className="text-slate-400">Room: {roomId}</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-slate-800 px-4 py-2 rounded-lg">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-slate-300">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="bg-slate-800 px-4 py-2 rounded-lg">
            <span className="text-sm text-slate-300">
              {spectators} watching
            </span>
          </div>
          {isLive && (
            <div className="flex items-center space-x-2 bg-red-500/20 px-4 py-2 rounded-lg">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm text-red-400 font-medium">LIVE</span>
            </div>
          )}
        </div>
      </div>

      {/* Game Board */}
      {currentState && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2">
            <GameBoard gameState={currentState} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <PlayerStats players={currentState.players} />
            <GameLog events={currentState.eventLog} />
            <GameTimer timeRemaining={currentState.timeRemaining} />
          </div>
        </div>
      )}
    </div>
  )
}

function GameBoard({ gameState }) {
  const { map, players } = gameState
  const cellSize = Math.min(500 / map.size, 40)

  // Create a position map for quick lookup
  const playerPositions = new Map()
  players?.forEach(player => {
    if (player.position) {
      playerPositions.set(`${player.position.x},${player.position.y}`, player)
    }
  })

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 overflow-auto">
      <div 
        className="grid gap-0.5 mx-auto"
        style={{
          gridTemplateColumns: `repeat(${map.size}, ${cellSize}px)`,
          width: 'fit-content'
        }}
      >
        {map.cells.map((row, y) =>
          row.map((cell, x) => {
            const playerAtCell = playerPositions.get(`${x},${y}`)
            return (
              <div
                key={`${x}-${y}`}
                className={`
                  relative flex items-center justify-center text-xs font-bold
                  ${cellStyles[cell.type] || cellStyles.empty}
                  ${cell.type === 'empty' ? 'border border-slate-700/50' : ''}
                `}
                style={{
                  width: cellSize,
                  height: cellSize,
                }}
              >
                {cell.resource && (
                  <span className="text-[8px] text-white/70">
                    {cell.resource.amount}
                  </span>
                )}
                {playerAtCell && (
                  <div 
                    className="absolute inset-1 rounded-full border-2 border-white flex items-center justify-center"
                    style={{ 
                      backgroundColor: getPlayerColor(players.indexOf(playerAtCell)),
                    }}
                  >
                    <span className="text-[8px] text-white drop-shadow">
                      {playerAtCell.name?.[0]}
                    </span>
                  </div>
                )}
                {cell.owner && !playerAtCell && (
                  <div className="absolute inset-0 border-2 border-primary-500/50" />
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <LegendItem color="bg-amber-700" label="Asteroid (Minerals)" />
        <LegendItem color="bg-cyan-600" label="Gas Cloud" />
        <LegendItem color="bg-purple-800" label="Nebula" />
        <LegendItem color="bg-primary-600" label="Base" />
      </div>
    </div>
  )
}

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center space-x-2">
      <div className={`w-4 h-4 rounded ${color}`} />
      <span className="text-slate-400">{label}</span>
    </div>
  )
}

function PlayerStats({ players }) {
  const playerColors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b']

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Players</h3>
      <div className="space-y-3">
        {players?.map((player, index) => (
          <div 
            key={player.id} 
            className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
          >
            <div className="flex items-center space-x-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: playerColors[index % playerColors.length] }}
              >
                {player.name?.[0]}
              </div>
              <div>
                <p className="text-white font-medium">{player.name}</p>
                <p className="text-xs text-slate-400">
                  Fleet: {player.fleet?.miners || 0}M / {player.fleet?.warships || 0}W / {player.fleet?.scouts || 0}S
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white font-mono">
                {(player.resources?.minerals || 0) + (player.resources?.gas || 0)}
              </p>
              <p className="text-xs text-slate-400">Total</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function GameLog({ events }) {
  const formatEvent = (event) => {
    switch (event.type) {
      case 'game_started':
        return 'Game started'
      case 'move':
        return `${event.playerId} moved`
      case 'mine':
        return `${event.playerId} mined ${event.amount} ${event.resource}`
      case 'build':
        return `${event.playerId} built ${event.unitType}`
      case 'attack_win':
        return `${event.playerId} won attack against ${event.targetId}`
      case 'attack_loss':
        return `${event.playerId} lost attack against ${event.targetId}`
      case 'scout':
        return `${event.playerId} scouted ${event.revealed} cells`
      default:
        return `${event.type}`
    }
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Event Log</h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {events?.slice().reverse().map((event, index) => (
          <div key={index} className="text-sm text-slate-300 py-1 border-b border-slate-700/50 last:border-0">
            {formatEvent(event)}
          </div>
        ))}
        {(!events || events.length === 0) && (
          <p className="text-slate-500 text-sm">No events yet</p>
        )}
      </div>
    </div>
  )
}

function GameTimer({ timeRemaining }) {
  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
      <h3 className="text-lg font-semibold text-white mb-2">Time Remaining</h3>
      <div className="text-4xl font-mono text-center text-white">
        {minutes}:{seconds.toString().padStart(2, '0')}
      </div>
    </div>
  )
}

function getPlayerColor(index) {
  const colors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b']
  return colors[index % colors.length]
}