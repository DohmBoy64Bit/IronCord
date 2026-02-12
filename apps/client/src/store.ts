import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  irc_nick: string;
  avatar_url?: string;
}

interface Guild {
  id: string;
  name: string;
  irc_namespace_prefix: string;
}

interface Channel {
  id: string;
  guild_id: string;
  name: string;
  irc_channel_name: string;
}

interface Message {
  id: string;
  channel: string;
  author: string;
  content: string;
  timestamp: number;
}

interface AppState {
  user: User | null;
  guilds: Guild[];
  channels: Record<string, Channel[]>;
  currentGuild: Guild | null;
  currentChannel: Channel | null;
  messages: Record<string, Message[]>;
  members: Record<string, string[]>;
  userStatus: 'online' | 'idle' | 'dnd' | 'invisible';
  setUser: (user: User | null) => void;
  setGuilds: (guilds: Guild[]) => void;
  setChannels: (guildId: string, channels: Channel[]) => void;
  setCurrentGuild: (guild: Guild | null) => void;
  setCurrentChannel: (channel: Channel | null) => void;
  addMessage: (channel: string, message: Message) => void;
  setMessages: (channel: string, messages: Message[]) => void;
  setMembers: (channel: string, members: string[]) => void;
  setUserStatus: (status: 'online' | 'idle' | 'dnd' | 'invisible') => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  guilds: [],
  channels: {},
  currentGuild: null,
  currentChannel: null,
  messages: {},
  members: {},
  userStatus: 'online',
  setUser: (user) => set({ user }),
  setGuilds: (guilds) => set({ guilds }),
  setChannels: (guildId, guildChannels) =>
    set((state) => ({
      channels: { ...state.channels, [guildId]: guildChannels }
    })),
  setCurrentGuild: (guild) => set({ currentGuild: guild, currentChannel: null }),
  setCurrentChannel: (channel) => set({ currentChannel: channel }),
  addMessage: (channel, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [channel]: [...(state.messages[channel] || []), message]
      }
    })),
  setMessages: (channel, messages) =>
    set((state) => ({
      messages: { ...state.messages, [channel]: messages }
    })),
  setMembers: (channel, channelMembers) =>
    set((state) => ({
      members: { ...state.members, [channel]: channelMembers }
    })),
  setUserStatus: (status) => set({ userStatus: status }),
}));
