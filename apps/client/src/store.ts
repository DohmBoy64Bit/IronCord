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
  updateGuild: (guildId: string, updates: Partial<Guild>) => void;
  updateChannel: (channelId: string, updates: Partial<Channel>) => void;
  deleteChannel: (channelId: string) => void;
  createChannel: (guildId: string, name: string) => void;
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
  updateGuild: (guildId: string, updates: Partial<Guild>) => {
    console.log('[MOCK API] updateGuild:', { guildId, updates });
    set((state) => ({
      guilds: state.guilds.map((g) => (g.id === guildId ? { ...g, ...updates } : g)),
      currentGuild: state.currentGuild?.id === guildId ? { ...state.currentGuild, ...updates } : state.currentGuild,
    }));
  },
  updateChannel: (channelId: string, updates: Partial<Channel>) => {
    console.log('[MOCK API] updateChannel:', { channelId, updates });
    set((state) => {
      const newChannels = { ...state.channels };
      for (const guildId in newChannels) {
        newChannels[guildId] = newChannels[guildId].map((c) =>
          c.id === channelId ? { ...c, ...updates } : c
        );
      }
      return {
        channels: newChannels,
        currentChannel: state.currentChannel?.id === channelId
          ? { ...state.currentChannel, ...updates }
          : state.currentChannel,
      };
    });
  },
  deleteChannel: (channelId: string) => {
    console.log('[MOCK API] deleteChannel:', { channelId });
    set((state) => {
      // Helper to remove channel from all guilds' channel lists
      const newChannels = { ...state.channels };
      for (const guildId in newChannels) {
        newChannels[guildId] = newChannels[guildId].filter((c) => c.id !== channelId);
      }
      return {
        channels: newChannels,
        currentChannel: state.currentChannel?.id === channelId ? null : state.currentChannel,
      };
    });
  },
  createChannel: (guildId: string, name: string) => {
    console.log('[MOCK API] createChannel:', { guildId, name });
    const newChannel: Channel = {
      id: Math.random().toString(36).substr(2, 9),
      guild_id: guildId,
      name: name,
      irc_channel_name: `#${name}`, // Simple mock
    };
    set((state) => ({
      channels: {
        ...state.channels,
        [guildId]: [...(state.channels[guildId] || []), newChannel],
      },
    }));
  },
}));
