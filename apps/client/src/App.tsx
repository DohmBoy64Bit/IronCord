import React, { useState, useEffect } from 'react';
import { useStore } from './store';
import Login from './components/Login';
import Register from './components/Register';
import Sidebar from './components/Sidebar';
import ChannelList from './components/ChannelList';
import Chat from './components/Chat';
import TitleBar from './components/TitleBar';

const App: React.FC = () => {
  const [view, setView] = useState<'login' | 'register'>('login');
  const { user, setUser, setGuilds, addMessage, setMessages, setMembers } = useStore();

  useEffect(() => {
    if (user) {
      // 1. Fetch guilds (no userId needed — token-based)
      window.ironcord.getMyGuilds().then((guilds: any) => {
        setGuilds(guilds);
      });

      // 2. Connect to IRC via Gateway
      const ircHost = process.env.VITE_IRC_HOST || 'localhost';
      const ircPort = parseInt(process.env.VITE_IRC_PORT || '6667', 10);

      window.ironcord.connectIRC(user.id, {
        host: ircHost,
        port: ircPort,
        nick: user.irc_nick,
        username: user.irc_nick,
        realname: user.irc_nick,
      });

      // 3. Setup event listeners
      window.ironcord.onIRCMessage((msg: any) => {
        addMessage(msg.channel, {
          id: msg.id, // Now provided by server
          channel: msg.channel,
          author: msg.author,
          content: msg.content,
          timestamp: msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now(),
        });
      });

      // 4. Handle chat history replay
      window.ironcord.onIRCHistory((historyMessages: any[]) => {
        if (!historyMessages || historyMessages.length === 0) return;

        const channel = historyMessages[0].channel;
        const formatted = historyMessages.map((msg: any) => ({
          id: msg.id, // Use server ID
          channel: msg.channel,
          author: msg.author,
          content: msg.content,
          timestamp: msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now(),
        }));
        setMessages(channel, formatted);
      });

      window.ironcord.onIRCError((err: any) => {
        console.error('IRC Error:', err);
      });

      window.ironcord.onIRCMembers((data: { channel: string; members: string[] }) => {
        setMembers(data.channel, data.members);
      });
    }
  }, [user]);

  return (
    <div className="flex h-screen flex-col bg-gray-900 overflow-hidden select-none">
      <TitleBar />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {!user ? (
          view === 'login' ? (
            <Login onSwitch={() => setView('register')} />
          ) : (
            <Register onSwitch={() => setView('login')} />
          )
        ) : (
          <>
            <Sidebar />
            <ChannelList />
            <Chat />
          </>
        )}
      </div>
    </div>
  );
};

export default App;
