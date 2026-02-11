import * as net from 'net';
import { EventEmitter } from 'events';

export interface IRCConfig {
  host: string;
  port: number;
  nick: string;
  username: string;
  realname: string;
  password?: string; // SASL Password
}

export interface ReconnectOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
}

const DEFAULT_RECONNECT: ReconnectOptions = {
  maxRetries: 10,
  initialDelay: 1000,
  maxDelay: 30000,
};

export class IRCClient extends EventEmitter {
  private socket: net.Socket | null = null;
  private buffer: string = '';
  private intentionalDisconnect: boolean = false;
  private reconnectAttempts: number = 0;
  private reconnectOptions: ReconnectOptions;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // CHATHISTORY / BATCH state
  private capsSent: boolean = false;
  private batchMessages: Map<string, Array<{ author: string; channel: string; content: string; timestamp?: string }>> = new Map();

  constructor(private config: IRCConfig, reconnectOptions?: Partial<ReconnectOptions>) {
    super();
    this.reconnectOptions = { ...DEFAULT_RECONNECT, ...reconnectOptions };
  }

  public connect(): void {
    this.intentionalDisconnect = false;
    this.socket = new net.Socket();

    this.socket.on('data', (data) => {
      this.buffer += data.toString();
      const lines = this.buffer.split('\r\n');
      this.buffer = lines.pop() || '';

      for (const line of lines) {
        this.handleLine(line);
      }
    });

    this.socket.on('connect', () => {
      console.log('TCP Connected to', this.config.host, ':', this.config.port);
      this.reconnectAttempts = 0;
      this.send('CAP LS 302');
      this.send(`NICK ${this.config.nick}`);
      const username = this.config.username || this.config.nick;
      const realname = this.config.realname || this.config.nick;
      this.send(`USER ${username} 0 * :${realname}`);
    });

    this.socket.on('error', (err) => {
      console.error('Socket error:', err.message);
      this.emit('error', err);
    });

    this.socket.on('close', () => {
      console.log('Socket closed');
      this.emit('close');

      if (!this.intentionalDisconnect) {
        this.attemptReconnect();
      }
    });

    this.socket.connect(this.config.port, this.config.host);
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.reconnectOptions.maxRetries) {
      console.error(`IRC: Max reconnection attempts (${this.reconnectOptions.maxRetries}) reached`);
      this.emit('reconnect_failed');
      return;
    }

    const delay = Math.min(
      this.reconnectOptions.initialDelay * Math.pow(2, this.reconnectAttempts),
      this.reconnectOptions.maxDelay
    );
    this.reconnectAttempts++;

    console.log(`IRC: Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.reconnectOptions.maxRetries})`);
    this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private send(data: string): void {
    if (this.socket && this.socket.writable) {
      console.log('>>>', data);
      this.socket.write(data + '\r\n');
    }
  }

  private handleLine(line: string): void {
    console.log('<<<', line);

    // Simple parsing to handle optional IRCv3 tags
    let rawLine = line;
    let tags: Record<string, string> = {};
    if (rawLine.startsWith('@')) {
      const spaceIdx = rawLine.indexOf(' ');
      const tagsStr = rawLine.substring(1, spaceIdx);
      rawLine = rawLine.substring(spaceIdx + 1);
      // Parse tags
      for (const tag of tagsStr.split(';')) {
        const [key, value] = tag.split('=');
        tags[key] = value || '';
      }
    }

    const parts = rawLine.split(' ');
    const prefix = parts[0].startsWith(':') ? parts.shift()?.substring(1) : null;
    const command = parts.shift()?.toUpperCase();
    const params = parts;

    // Handle PING
    if (command === 'PING') {
      this.send(`PONG ${params[0]}`);
      return;
    }

    // Handle CAP
    if (command === 'CAP') {
      const subcommand = params[1];
      if (subcommand === 'LS') {
        const caps = line;
        const requestedCaps = [];
        if (caps.includes('sasl') && this.config.password) requestedCaps.push('sasl');
        if (caps.includes('echo-message')) requestedCaps.push('echo-message');
        if (caps.includes('server-time')) requestedCaps.push('server-time');
        if (caps.includes('message-tags')) requestedCaps.push('message-tags');
        if (caps.includes('batch')) requestedCaps.push('batch');
        if (caps.includes('draft/chathistory') || caps.includes('chathistory')) requestedCaps.push('draft/chathistory');

        if (requestedCaps.length > 0) {
          this.send(`CAP REQ :${requestedCaps.join(' ')}`);
        } else if (!params.includes('*')) {
          this.send('CAP END');
        }
      } else if (subcommand === 'ACK') {
        if (line.includes('sasl')) {
          this.send('AUTHENTICATE PLAIN');
        } else {
          this.send('CAP END');
        }
      }
    }

    // Handle AUTHENTICATE
    if (command === 'AUTHENTICATE' && params[0] === '+') {
      const authStr = `${this.config.nick}\0${this.config.nick}\0${this.config.password}`;
      const base64Auth = Buffer.from(authStr).toString('base64');
      this.send(`AUTHENTICATE ${base64Auth}`);
    }

    // Numerics
    if (command === '903') { // SASL Success
      console.log('SASL Authentication Successful');
      this.send('CAP END');
    }

    if (command === '904' || command === '905') { // SASL Failure
      if (line.includes('Account does not exist')) {
        console.log('Account does not exist, attempting to register...');
        this.send(`REGISTER ${this.config.nick} ${this.config.password}`);
      } else {
        console.error('SASL Authentication Failed');
        this.emit('error', new Error('SASL Authentication Failed'));
      }
    }

    if (command === '900' || line.includes('Account successfully registered')) { // Registered/Logged in
      console.log('Registration/Login successful');
      this.send('CAP END');
    }

    if (command === '907') { // Already logged in
      this.send('CAP END');
    }

    if (command === '001') { // Welcome
      console.log('Connected to IRC network');
      this.emit('registered');
    }

    // Handle BATCH start/end
    if (command === 'BATCH') {
      const batchRef = params[0];
      if (batchRef.startsWith('+')) {
        // Batch start
        const batchId = batchRef.substring(1);
        this.batchMessages.set(batchId, []);
      } else if (batchRef.startsWith('-')) {
        // Batch end — emit collected messages
        const batchId = batchRef.substring(1);
        const messages = this.batchMessages.get(batchId);
        if (messages && messages.length > 0) {
          this.emit('history', messages);
        }
        this.batchMessages.delete(batchId);
      }
    }

    // Handle incoming messages
    if (command === 'PRIVMSG') {
      const author = prefix?.split('!')[0] || '';
      const channel = params[0];
      let content = params.slice(1).join(' ');
      if (content.startsWith(':')) content = content.substring(1);

      const msgData = { author, channel, content, timestamp: tags['time'] || undefined };

      // Check if this message is part of a batch
      const batchTag = tags['batch'];
      if (batchTag && this.batchMessages.has(batchTag)) {
        this.batchMessages.get(batchTag)!.push(msgData);
      } else {
        this.emit('message', msgData);
      }
    }
  }

  public join(channel: string): void {
    this.send(`JOIN ${channel}`);
  }

  public privmsg(target: string, message: string): void {
    this.send(`PRIVMSG ${target} :${message}`);
  }

  public fetchHistory(channel: string, limit: number = 50): void {
    this.send(`CHATHISTORY LATEST ${channel} * ${limit}`);
  }

  public disconnect(): void {
    this.intentionalDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.end();
    }
  }
}
