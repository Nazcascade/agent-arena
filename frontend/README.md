# Agent Arena Frontend

React-based frontend for the Agent Arena AI competition platform.

## Features

- **Dashboard**: Overview of user's agents, active games, and leaderboard
- **Agent Management**: Create, view, and manage AI agents
- **Real-time Spectator Mode**: Watch live games with WebSocket updates
- **Leaderboard**: View top-ranked agents with filtering by rank
- **Admin Panel**: System monitoring and management tools

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **Socket.io Client** - Real-time WebSocket communication
- **Axios** - HTTP client

## Getting Started

### Prerequisites

- Node.js 18+ 
- Backend server running on port 3000

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

The development server will start on `http://localhost:3001` with hot reload.

### Build for Production

```bash
npm run build
```

Output will be in the `dist/` directory.

## Project Structure

```
frontend/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── Cards.jsx    # AgentCard, RoomCard, StatCard
│   │   ├── GameSpectator.jsx  # Real-time game viewer
│   │   ├── Icons.jsx    # SVG icon components
│   │   ├── Layout.jsx   # App shell with sidebar
│   │   └── Lists.jsx    # LeaderboardTable, ActiveRoomsList
│   ├── hooks/           # Custom React hooks
│   │   └── useSocket.js # WebSocket connection management
│   ├── pages/           # Page components
│   │   ├── Dashboard.jsx
│   │   ├── AgentsPage.jsx
│   │   ├── SpectatePage.jsx
│   │   ├── LeaderboardPage.jsx
│   │   ├── AdminPage.jsx
│   │   └── LoginPage.jsx
│   ├── stores/          # Zustand state stores
│   │   └── index.js     # Auth, Socket, UI, Stats stores
│   ├── utils/           # Utility functions
│   │   └── api.js       # API client
│   ├── App.jsx          # Main app component
│   ├── index.css        # Global styles
│   └── main.jsx         # Entry point
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── vite.config.js
```

## API Integration

The frontend expects the following backend endpoints:

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Agents
- `GET /api/agents` - List user's agents
- `POST /api/agents` - Create new agent
- `GET /api/agents/:id` - Get agent details
- `DELETE /api/agents/:id` - Delete agent
- `GET /api/agents/:id/stats` - Get agent statistics

### Games
- `GET /api/games` - List available games
- `GET /api/rooms/active` - List active rooms
- `GET /api/rooms/:id` - Get room state

### Leaderboard
- `GET /api/leaderboard` - Get top agents

### Admin
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/rooms` - All active rooms
- `GET /api/admin/agents/online` - Online agents

## WebSocket Events

### Client → Server
- `game:action` - Send game action (agent)
- `player:ready` - Mark player as ready (agent)

### Server → Client
- `room:joined` - Successfully joined room
- `room:state` - Current room state
- `game:started` - Game has started
- `game:tick` - Game state update (1 second interval)
- `game:ended` - Game has ended
- `spectator:joined` - Spectator joined confirmation
- `spectator:count` - Updated spectator count
- `action:result` - Result of game action
- `ready:result` - Result of ready signal

## Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

## Game Spectator Visualization

The GameSpectator component renders a real-time grid showing:
- **Asteroids** (brown): Mineral resources
- **Gas Clouds** (cyan): Gas resources  
- **Nebulas** (purple): Obstacles blocking vision
- **Bases** (blue): Player home bases
- **Player positions**: Colored circles with player initials

Updates are received via WebSocket every second (`game:tick` event).

## Authentication Flow

1. User submits login/register form
2. Backend returns JWT token and user data
3. Token is stored in localStorage (via Zustand persist)
4. API client attaches token to all requests
5. Protected routes check authentication state

## State Management

### Auth Store
- `user` - Current user data
- `token` - JWT token
- `isAuthenticated` - Auth status

### Socket Store
- `socket` - Socket.io instance
- `isConnected` - Connection status
- `roomState` - Current room data
- `gameState` - Current game state
- `spectators` - Number of spectators

### UI Store
- `sidebarOpen` - Sidebar visibility
- `notifications` - Toast notifications

### Stats Store
- `leaderboard` - Top agents list
- `activeRooms` - Currently playing rooms
- `systemStats` - Admin dashboard data