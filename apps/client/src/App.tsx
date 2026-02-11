import React, { useState, useEffect } from 'react';
import { useStore } from './store';
import Login from './components/Login';
import Register from './components/Register';
import Sidebar from './components/Sidebar';
import ChannelList from './components/ChannelList';
import Chat from './components/Chat';

const App: React.FC = () => {
  const [view, setView] = useState<'login' | 'register'>('login');
  const { user, setUser, setGuilds, addMessage, setMessages } = useStore();

  useEffect(() => {
    if (user) {
      // 1. Fetch guilds (no userId needed — token-based)
      window.ironcord.getMyGuilds().then((guilds: any) => {
        setGuilds(guilds);
      });

      // 2. Connect to IRC via Gateway
      window.ironcord.connectIRC(user.id, {
        host: process.env.VITE_IRC_HOST || 'localhost',
        port: parseInt(process.env.VITE_IRC_PORT || '6667', 10),
        nick: user.irc_nick,
      });

      // 3. Setup event listeners
      window.ironcord.onIRCMessage((msg: any) => {
        addMessage(msg.channel, {
          id: msg.id || Math.random().toString(36),
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
          id: Math.random().toString(36),
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
    }
  }, [user]);

  if (!user) {
    return view === 'login' ? (
      <Login onSwitch={() => setView('register')} />
    ) : (
      <Register onSwitch={() => setView('login')} />
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 overflow-hidden select-none">
      <Sidebar />
      <ChannelList />
      <Chat />
    </div>
  );
};

export default App;
