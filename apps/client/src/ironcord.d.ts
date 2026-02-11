interface IronCordAPI {
  // Auth
  register: (data: { email: string; password: string; irc_nick: string }) => Promise<any>;
  login: (data: { email: string; password: string }) => Promise<any>;

  // IRC
  connectIRC: (userId: string, config: any) => Promise<void>;
  sendMessage: (channel: string, message: string) => Promise<void>;

  // Guilds
  getMyGuilds: () => Promise<any[]>;
  getChannels: (guildId: string) => Promise<any[]>;
  createGuild: (name: string) => Promise<any>;

  // Events
  onIRCRegistered: (callback: () => void) => void;
  onIRCMessage: (callback: (msg: any) => void) => void;
  onIRCHistory: (callback: (messages: any[]) => void) => void;
  onIRCMembers: (callback: (data: { channel: string; members: string[] }) => void) => void;
  onIRCError: (callback: (err: any) => void) => void;
}

declare global {
  interface Window {
    ironcord: IronCordAPI;
  }
}

export { };
