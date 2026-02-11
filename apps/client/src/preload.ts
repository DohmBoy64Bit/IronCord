import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('ironcord', {
  // Auth
  register: (data: any) => ipcRenderer.invoke('auth:register', data),
  login: (data: any) => ipcRenderer.invoke('auth:login', data),

  // IRC
  connectIRC: (userId: string, config: any) => ipcRenderer.invoke('irc:connect', { userId, config }),
  sendMessage: (channel: string, message: string) => ipcRenderer.invoke('irc:send-message', { channel, message }),

  // Guilds
  getMyGuilds: () => ipcRenderer.invoke('guilds:get-mine'),
  getChannels: (guildId: string) => ipcRenderer.invoke('guilds:get-channels', guildId),
  createGuild: (name: string) => ipcRenderer.invoke('guilds:create', { name }),

  // Events
  onIRCRegistered: (callback: any) => ipcRenderer.on('irc:registered', () => callback()),
  onIRCMessage: (callback: any) => ipcRenderer.on('irc:message', (event, msg) => callback(msg)),
  onIRCHistory: (callback: any) => ipcRenderer.on('irc:history', (event, data) => callback(data)),
  onIRCError: (callback: any) => ipcRenderer.on('irc:error', (event, err) => callback(err)),
});
