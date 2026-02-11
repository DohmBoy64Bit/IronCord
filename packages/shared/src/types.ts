// ── Entity Types ──────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  irc_nick: string;
  avatar_url?: string;
  created_at?: string;
}

export interface Guild {
  id: string;
  name: string;
  owner_id: string;
  irc_namespace_prefix: string;
  created_at?: string;
}

export interface Channel {
  id: string;
  guild_id: string;
  name: string;
  irc_channel_name: string;
  topic?: string;
  created_at?: string;
}

export interface GuildMember {
  guild_id: string;
  user_id: string;
  joined_at?: string;
}

export interface Message {
  id: string;
  channel: string;
  author: string;
  content: string;
  timestamp: number;
}

// ── API Request / Response Types ──────────────────────────────

export interface RegisterRequest {
  email: string;
  password: string;
  irc_nick?: string;
  ircNick?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
  message?: string;
}

export interface CreateGuildRequest {
  name: string;
  ownerId: string;
}

export interface CreateChannelRequest {
  name: string;
  topic?: string;
}

// ── IRC Types ────────────────────────────────────────────────

export interface IRCConfig {
  host: string;
  port: number;
  nick: string;
  username?: string;
  realname?: string;
  password?: string;
}

export interface IRCMessage {
  author: string;
  channel: string;
  content: string;
  id?: string;
  timestamp?: number;
}
