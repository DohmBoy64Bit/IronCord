import React, { useEffect } from 'react';
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
  const { currentGuild, channels, setChannels, currentChannel, setCurrentChannel, user } = useStore();

  useEffect(() => {
    if (currentGuild && !channels[currentGuild.id]) {
      window.ironcord.getChannels(currentGuild.id).then((guildChannels: any) => {
        setChannels(currentGuild.id, guildChannels);
      });
    }
  }, [currentGuild]);

  const guildChannels = currentGuild ? channels[currentGuild.id] || [] : [];
  const userNick = user?.irc_nick || 'User';

  return (
    <div className="flex w-60 flex-col bg-gray-900">
      <div className="flex h-12 cursor-pointer items-center justify-between border-b border-gray-950 px-4 font-bold text-white shadow-xs transition-colors hover:bg-gray-800">
        {currentGuild ? currentGuild.name : 'Direct Messages'}
        {currentGuild && <ChevronDown size={20} />}
      </div>

      <div className="mt-4 flex-1 space-y-[2px] px-2 overflow-y-auto">
        {guildChannels.map((channel: any) => (
          <div
            key={channel.id}
            onClick={() => setCurrentChannel(channel)}
            className={`group flex cursor-pointer items-center rounded-md px-2 py-1 transition-colors ${currentChannel?.id === channel.id
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'
              }`}
          >
            <Hash size={20} className="mr-2 text-gray-500" />
            <span className="font-medium">{channel.name}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center bg-gray-950/50 p-2">
        <div className="flex items-center space-x-2 overflow-hidden">
          <div className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${nickColor(userNick)}`}>
            <span className="text-xs font-bold text-white uppercase">{userNick.charAt(0)}</span>
            <div className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-gray-900 bg-emerald-500" />
          </div>
          <div className="flex flex-col truncate">
            <span className="text-xs font-bold text-white truncate">{userNick}</span>
            <span className="text-[10px] text-gray-400">Online</span>
          </div>
        </div>
        <div className="ml-auto flex items-center space-x-1 text-gray-400">
          <div className="cursor-pointer rounded-md p-1 hover:bg-gray-800">
            <Settings size={16} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChannelList;
