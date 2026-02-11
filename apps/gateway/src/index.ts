import express from 'express';
import { createServer } from 'http';
import { dbService } from './services/db.service';
import authRouter from './api/auth';
import guildsRouter from './api/guilds';
import { WebSocketServer } from './api/websocket';

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 3000;

app.use(express.json());

// Routes
app.use('/auth', authRouter);
app.use('/guilds', guildsRouter);

// Initialize DB and Start Server
async function startServer() {
  try {
    // Initialize Schema
    await dbService.initializeSchema();

    // Start WebSocket Server
    new WebSocketServer(httpServer);

    httpServer.listen(port, () => {
      console.log(`Gateway API listening at http://localhost:${port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
