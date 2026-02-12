import * as net from 'net';
import * as crypto from 'crypto';
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
  private batchMessages: Map<string, Array<{ id: string; author: string; channel: string; content: string; timestamp?: string }>> = new Map();

  // Channel member tracking
  private channelMembers: Map<string, Set<string>> = new Map();

  constructor(private config: IRCConfig, reconnectOptions?: Partial<ReconnectOptions>) {
    super();
    this.reconnectOptions = { ...DEFAULT_RECONNECT, ...reconnectOptions };
  }

  public connect(): void {
    this.intentionalDisconnect = false;
    this.socket = new net.Socket();

    this.socket.on('data', (data) => {
      this.buffer += data.toString();
      // Handle both \r\n and \n for robustness
      const lines = this.buffer.split(/\r?\n/);
      this.buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          this.handleLine(line);
        }
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

    // Proper IRC param parsing
    const params: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].startsWith(':')) {
        params.push(parts.slice(i).join(' ').substring(1));
        break;
      }
      params.push(parts[i]);
    }

    // Handle PING
    if (command === 'PING') {
      this.send(`PONG :${params[0]}`);
      return;
    }

    // Handle CAP
    if (command === 'CAP') {
      const subcommand = params[1];
      if (subcommand === 'LS') {
        const availableCaps = params[params.length - 1].split(' ');
        const requestedCaps = [];

        if (availableCaps.includes('sasl') && this.config.password) requestedCaps.push('sasl');
        if (availableCaps.includes('echo-message')) requestedCaps.push('echo-message');
        if (availableCaps.includes('server-time')) requestedCaps.push('server-time');
        if (availableCaps.includes('message-tags')) requestedCaps.push('message-tags');
        if (availableCaps.includes('batch')) requestedCaps.push('batch');
        if (availableCaps.includes('draft/chathistory') || availableCaps.includes('chathistory')) {
          requestedCaps.push(availableCaps.includes('draft/chathistory') ? 'draft/chathistory' : 'chathistory');
        }

        if (requestedCaps.length > 0) {
          this.send(`CAP REQ :${requestedCaps.join(' ')}`);
        } else if (params[1] !== '*' && params[2] !== '*') { // Check if multiline CAP LS
          this.send('CAP END');
        }
      } else if (subcommand === 'ACK') {
        const ackedCaps = params[params.length - 1].split(' ');
        if (ackedCaps.includes('sasl')) {
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

    // Handle RPL_NAMREPLY (353)
    if (command === '353') {
      // params: [nick, type, channel, names]
      const channel = params[2];
      const names = params[params.length - 1].split(' ');

      if (!this.channelMembers.has(channel)) {
        this.channelMembers.set(channel, new Set());
      }

      const memberSet = this.channelMembers.get(channel)!;
      for (const name of names) {
        // Remove prefixes like @, +, etc.
        const cleanName = name.replace(/^[@+~&%]/, '');
        if (cleanName) memberSet.add(cleanName);
      }

      this.emit('members', { channel, members: Array.from(memberSet) });
    }

    // Handle JOIN
    if (command === 'JOIN') {
      const channel = params[0];
      const nick = prefix?.split('!')[0] || '';

      if (!this.channelMembers.has(channel)) {
        this.channelMembers.set(channel, new Set());
      }

      this.channelMembers.get(channel)!.add(nick);
      this.emit('members', { channel, members: Array.from(this.channelMembers.get(channel)!) });
    }

    // Handle PART
    if (command === 'PART') {
      const channel = params[0];
      const nick = prefix?.split('!')[0] || '';

      const memberSet = this.channelMembers.get(channel);
      if (memberSet) {
        memberSet.delete(nick);
        this.emit('members', { channel, members: Array.from(memberSet) });
      }
    }

    // Handle QUIT
    if (command === 'QUIT') {
      const nick = prefix?.split('!')[0] || '';

      for (const [channel, memberSet] of this.channelMembers.entries()) {
        if (memberSet.has(nick)) {
          memberSet.delete(nick);
          this.emit('members', { channel, members: Array.from(memberSet) });
        }
      }
    }

    // Handle KICK
    if (command === 'KICK') {
      const channel = params[0];
      const kickedNick = params[1];

      const memberSet = this.channelMembers.get(channel);
      if (memberSet) {
        memberSet.delete(kickedNick);
        this.emit('members', { channel, members: Array.from(memberSet) });
      }
    }

    // Handle NICK
    if (command === 'NICK') {
      const oldNick = prefix?.split('!')[0] || '';
      const newNick = params[0];

      for (const [channel, memberSet] of this.channelMembers.entries()) {
        if (memberSet.has(oldNick)) {
          memberSet.delete(oldNick);
          memberSet.add(newNick);
          this.emit('members', { channel, members: Array.from(memberSet) });
        }
      }
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
      const contentParts = params.slice(1).join(' ');
      let content = contentParts.startsWith(':') ? contentParts.substring(1) : contentParts;

      const msgData = {
        id: crypto.randomUUID(),
        author,
        channel,
        content,
        timestamp: tags['time'] || undefined
      };

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

  public setPresence(status: 'online' | 'idle' | 'dnd' | 'invisible'): void {
    if (this.socket && this.socket.writable) {
      if (status === 'online') {
        this.send('AWAY'); // Unset away
      } else if (status === 'idle') {
        this.send('AWAY :Idle');
      } else if (status === 'dnd') {
        this.send('AWAY :Do Not Disturb');
      } else if (status === 'invisible') {
        // IRC doesn't really support invisible without disconnecting or +i which is limited.
        // For now, we'll treat it as extended away or just local state.
        this.send('AWAY :Invisible');
      }
    }
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
