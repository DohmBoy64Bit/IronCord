# IronCord

A high-fidelity, Discord-like desktop experience powered by an IRC backend. IronCord bridges the simplicity of IRC with the rich media and persistence of modern chat platforms.

## 🚀 Core Tech Stack

- **Frontend**: [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Zustand](https://zustand-demo.pmnd.rs/)
- **Desktop**: [Electron Forge](https://www.electronforge.io/) + [Vite](https://vitejs.dev/)
- **Gateway**: [Node.js](https://nodejs.org/) + [Express 5](https://expressjs.com/), [Socket.IO](https://socket.io/)
- **Backing Services**: [Ergo IRCd](https://ergo.chat/), [PostgreSQL 15](https://www.postgresql.org/)
- **Monorepo**: NPM Workspaces

## 🏛 Architecture

IronCord follows a **Client-Gateway-IRC** flow to maintain modern features while staying IRC-native:

1.  **Desktop Client**: Rich UI communicating via REST and WebSockets to the Gateway.
2.  **Gateway (Middleware)**: Bridges the high-level API to raw TCP IRC commands and manages persistence in PostgreSQL.
3.  **Core (IRCd)**: Ergo handles the heavy lifting of message routing, presence, and chat history (`CHATHISTORY`).

## ✨ Key Features

- **Discord-like UX**: Guilds, channels, and member lists mapped directly to IRC namespaces.
- **Persistent History**: Seamless message replay using IRCv3 extensions.
- **Modern Auth**: Secure email/password registration with JWT-based sessions.
- **Rich Interaction**: Full support for avatars, emoji pickers, and stickers.
- **IRC Interoperability**: Standard IRC clients can interact with IronCord users via the same backends.

## 🛠 Getting Started

### Prerequisites
- Node.js v20+
- Podman/Docker + podman-compose

### 1. Spin up Infrastructure
```bash
# Start Ergo IRCd and PostgreSQL
cd infra/ircd && podman-compose up -d
cd ../db && podman-compose up -d
```

### 2. Install & Run
From the root:
```bash
npm install
npm run build

# Start the Gateway and Client (separate terminals)
cd apps/gateway && npm start
cd apps/client && npm start
```

## ⚙️ Configuration

### Gateway Environment Variables
| Variable | Description | Default |
| --- | --- | --- |
| `PORT` | Gateway API port | `3000` |
| `JWT_SECRET` | Secret for token signing | `ironcord_secret...` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_NAME` | Database name | `ironcord` |

### API Endpoints (Gateway)
| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/auth/register` | User registration |
| `POST` | `/auth/login` | User authentication |
| `POST` | `/guilds` | Create a new guild |
| `GET` | `/guilds/mine` | List user's guilds |
