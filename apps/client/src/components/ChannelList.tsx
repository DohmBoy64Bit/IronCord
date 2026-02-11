import React, { useEffect } from 'react';
import { useStore } from '../store';
import { Hash, ChevronDown, Settings } from 'lucide-react';

const ChannelList: React.FC = () => {
  const { currentGuild, channels, setChannels, currentChannel, setCurrentChannel, user } = useStore();

  useEffect(() => {
    if (currentGuild && !channels[currentGuild.id]) {
      window.ironcord.getChannels(currentGuild.id).then((guildChannels) => {
        setChannels(currentGuild.id, guildChannels);
      });
    }
  }, [currentGuild]);

  if (!currentGuild) {
    return (
      <div className="flex w-60 flex-col bg-gray-900">
        <div className="flex h-12 items-center border-b border-gray-950 px-4 font-bold text-white shadow-xs">
          Direct Messages
        </div>
      </div>
    );
  }

  const guildChannels = channels[currentGuild.id] || [];

  return (
    <div className="flex w-60 flex-col bg-gray-900">
      <div className="flex h-12 cursor-pointer items-center justify-between border-b border-gray-950 px-4 font-bold text-white shadow-xs transition-colors hover:bg-gray-800">
        {currentGuild.name}
        <ChevronDown size={20} />
      </div>

      <div className="mt-4 flex-1 space-y-[2px] px-2">
        {guildChannels.map((channel) => (
          <div
            key={channel.id}
            onClick={() => setCurrentChannel(channel)}
            className={`group flex cursor-pointer items-center rounded-md px-2 py-1 transition-colors ${
              currentChannel?.id === channel.id
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
        <div className="flex items-center space-x-2">
          <div className="relative h-8 w-8 rounded-full bg-indigo-500">
            <div className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-gray-900 bg-emerald-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white">{user?.irc_nick}</span>
            <span className="text-[10px] text-gray-400">#0000</span>
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
