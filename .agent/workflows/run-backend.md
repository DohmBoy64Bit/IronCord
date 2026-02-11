---
description: how to run the IronCord backend
---

To run the IronCord backend, you need to start the infrastructure containers first, then the Gateway service.

### 1. Start Infrastructure

Open two terminals and run these commands to start the database and IRC server:

**PostgreSQL (Database)**
```pwsh
cd infra/db
podman-compose up -d
```

**Ergo (IRC Server)**
```pwsh
cd infra/ircd
podman-compose up -d
```

> [!NOTE]
> If you are using Docker instead of Podman, use `docker-compose up -d` instead.

### 2. Start Gateway Service

In a third terminal, start the Gateway backend:

**Development Mode (Live Reload)**
```pwsh
cd apps/gateway
npm run dev
```

**Production Mode (Built Version)**
```pwsh
cd apps/gateway
npm start
```

### 3. Verify Connectivity

You can verify the Gateway is running by visiting `http://localhost:3000` (it should return a 404 with a JSON error, which means the server is reachable).
