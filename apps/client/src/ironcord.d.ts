export interface IronCordAPI {
  register: (data: any) => Promise<any>;
  login: (data: any) => Promise<any>;
  connectIRC: (userId: string, config: any) => Promise<void>;
  sendMessage: (channel: string, message: string) => Promise<void>;
  getMyGuilds: (userId: string) => Promise<any[]>;
  getChannels: (guildId: string) => Promise<any[]>;
  onIRCRegistered: (callback: () => void) => void;
  onIRCMessage: (callback: (msg: any) => void) => void;
  onIRCError: (callback: (err: string) => void) => void;
}

declare global {
  interface Window {
    ironcord: IronCordAPI;
  }
}
