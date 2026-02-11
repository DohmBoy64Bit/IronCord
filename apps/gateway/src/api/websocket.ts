import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { IRCClient } from '../irc-client';
import { dbService } from '../services/db.service';

export class WebSocketServer {
  private io: SocketServer;
  private userIRCConnections: Map<string, IRCClient> = new Map();

  constructor(server: HttpServer) {
    this.io = new SocketServer(server, {
      cors: {
        origin: '*', // For development
      },
    });

    this.io.on('connection', (socket: Socket) => {
      console.log('Client connected:', socket.id);

      socket.on('irc:connect', (payload: { userId: string, config: any }) => {
        this.connectToIRC(socket, payload.userId, payload.config);
      });

      socket.on('irc:message', (payload: { channel: string; message: string }) => {
        const client = this.userIRCConnections.get(socket.id);
        if (client) {
          client.privmsg(payload.channel, payload.message);
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        const client = this.userIRCConnections.get(socket.id);
        if (client) {
          client.disconnect();
          this.userIRCConnections.delete(socket.id);
        }
      });
    });
  }

  private async connectToIRC(socket: Socket, userId: string, config: any) {
    const client = new IRCClient(config);
    
    client.on('registered', async () => {
      socket.emit('irc:registered');
      
      // Auto-join user's channels
      try {
        const result = await dbService.query(
          `SELECT c.irc_channel_name FROM channels c
           JOIN guilds g ON c.guild_id = g.id
           JOIN guild_members gm ON g.id = gm.guild_id
           WHERE gm.user_id = $1`,
          [userId]
        );
        
        for (const row of result.rows) {
          console.log(`Auto-joining ${row.irc_channel_name} for user ${userId}`);
          client.join(row.irc_channel_name);
        }
      } catch (err) {
        console.error('Error auto-joining channels:', err);
      }
    });

    client.on('message', (msg) => {
      socket.emit('irc:message', msg);
    });

    client.on('error', (err) => {
      socket.emit('irc:error', err.message);
    });

    client.connect();
    this.userIRCConnections.set(socket.id, client);
  }
}
