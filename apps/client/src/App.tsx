import React, { useState, useEffect } from 'react';
import { useStore } from './store';
import Login from './components/Login';
import Register from './components/Register';
import Sidebar from './components/Sidebar';
import ChannelList from './components/ChannelList';
import Chat from './components/Chat';

const App: React.FC = () => {
  const [view, setView] = useState<'login' | 'register'>('login');
  const { user, setUser, setGuilds, addMessage } = useStore();

  useEffect(() => {
    if (user) {
      // 1. Fetch guilds
      window.ironcord.getMyGuilds(user.id).then((guilds) => {
        setGuilds(guilds);
      });

      // 2. Connect to IRC via Gateway
      window.ironcord.connectIRC(user.id, {
        host: 'localhost',
        port: 6667,
        nick: user.irc_nick,
      });

      // 3. Setup event listeners
      window.ironcord.onIRCMessage((msg) => {
        addMessage(msg.channel, {
          id: msg.id || Math.random().toString(36),
          channel: msg.channel,
          author: msg.author,
          content: msg.content,
          timestamp: msg.timestamp || Date.now(),
        });
      });

      window.ironcord.onIRCError((err) => {
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
