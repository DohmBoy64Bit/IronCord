import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { Hash, ChevronDown, Settings } from 'lucide-react';

// Generate a consistent color from a username
function nickColor(nick: string): string {
  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
    'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
    'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
  ];
  let hash = 0;
  for (let i = 0; i < nick.length; i++) {
    hash = nick.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const ChannelList: React.FC = () => {
  const { currentGuild, channels, setChannels, currentChannel, setCurrentChannel, user, userStatus, setUserStatus } = useStore();
  const [isConnected, setIsConnected] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  useEffect(() => {
    // Listen for real-time connection events
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    window.ironcord.onIRCConnected(onConnect);
    window.ironcord.onIRCDisconnected(onDisconnect);
    window.ironcord.onIRCRegistered(onConnect); // Also treat registered as connected

    // Initial check (if already connected before listener attached)
    // In a real app we might need a synchronous check or replay
    setIsConnected(true); // Optimistic initial state, will correct if disconnect event fires

    // Cleanup not strictly necessary for singleton listeners in this architecture but good practice
  }, []);

  useEffect(() => {
    if (currentGuild && !channels[currentGuild.id]) {
      window.ironcord.getChannels(currentGuild.id).then((guildChannels: any) => {
        setChannels(currentGuild.id, guildChannels);
      });
    }
  }, [currentGuild]);

  const handleStatusChange = async (status: 'online' | 'idle' | 'dnd' | 'invisible') => {
    setUserStatus(status);
    setShowStatusMenu(false);
    try {
      await window.ironcord.setPresence(status);
    } catch (err) {
      console.error('Failed to set presence:', err);
    }
  };

  const guildChannels = currentGuild ? channels[currentGuild.id] || [] : [];
  const userNick = user?.irc_nick || 'Unknown User';

  const statusColors = {
    online: 'bg-emerald-500',
    idle: 'bg-amber-500',
    dnd: 'bg-red-500',
    invisible: 'bg-gray-500',
  };

  const statusLabels = {
    online: 'Online',
    idle: 'Idle',
    dnd: 'Do Not Disturb',
    invisible: 'Invisible',
  };

  return (
    <div className="glass-panel flex w-60 flex-col bg-black/20 backdrop-blur-lg border-x-0 my-1 h-[calc(100vh-8px)]">
      <div className="flex h-12 cursor-pointer items-center justify-between border-b border-black/20 px-4 font-bold text-white shadow-sm transition-colors hover:bg-white/5">
        {currentGuild ? currentGuild.name : 'Direct Messages'}
        {currentGuild && <ChevronDown size={20} />}
      </div>

      <div className="mt-4 flex-1 space-y-[2px] px-2 overflow-y-auto">
        {guildChannels.map((channel: any) => (
          <div
            key={channel.id}
            onClick={() => setCurrentChannel(channel)}
            className={`group flex cursor-pointer items-center rounded-md px-2 py-1 transition-all duration-200 ${currentChannel?.id === channel.id
              ? 'bg-white/10 text-white shadow-inner'
              : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }`}
          >
            <Hash size={20} className="mr-2 text-gray-500" />
            <span className="font-medium">{channel.name}</span>
          </div>
        ))}
      </div>

      {/* User Area */}
      <div className="relative flex items-center bg-black/40 p-2">
        <div
          className={`flex items-center space-x-2 overflow-hidden rounded p-1 transition-colors flex-1 ${isConnected ? 'cursor-pointer hover:bg-white/5' : 'cursor-not-allowed opacity-75'}`}
          onClick={() => isConnected && setShowStatusMenu(!showStatusMenu)}
        >
          <div className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${nickColor(userNick)}`}>
            <span className="text-xs font-bold text-white uppercase">{userNick.charAt(0)}</span>
            <div className={`absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-gray-900 ${isConnected ? statusColors[userStatus] : 'bg-red-500'}`} />
          </div>
          <div className="flex flex-col truncate">
            <span className="text-xs font-bold text-white truncate">{userNick}</span>
            <span className="text-[10px] text-gray-400">{isConnected ? statusLabels[userStatus] : 'Disconnected'}</span>
          </div>
        </div>

        <div className="ml-auto flex items-center space-x-1 text-gray-400">
          <div
            className="cursor-pointer rounded-md p-1 hover:bg-gray-800"
            onClick={(e) => {
              e.stopPropagation();
              const event = new CustomEvent('show-toast', { detail: 'Settings' });
              window.dispatchEvent(event);
            }}
          >
            <Settings data-testid="Settings" size={16} />
          </div>
        </div>

        {/* Status Menu */}
        {showStatusMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowStatusMenu(false)} />
            <div className="glass-panel absolute bottom-14 left-2 z-50 w-56 rounded-lg bg-black/80 backdrop-blur-xl p-2 shadow-xl border-white/10 ring-1 ring-black/50">
              <div className="space-y-1">
                {(['online', 'idle', 'dnd', 'invisible'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className="flex w-full items-center space-x-2 rounded px-2 py-1.5 text-left text-sm text-gray-300 hover:bg-indigo-500 hover:text-white transition-colors"
                  >
                    <div className={`h-2 w-2 rounded-full ${statusColors[status]}`} />
                    <span>{statusLabels[status]}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChannelList;
