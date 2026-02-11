import React, { useState } from 'react';
import { useStore } from '../store';
import { Hash, Plus } from 'lucide-react';
import CreateGuildModal from './CreateGuildModal';

const Sidebar: React.FC = () => {
  const { guilds, currentGuild, setCurrentGuild } = useStore();
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <>
      <div className="flex w-20 flex-col items-center space-y-4 bg-gray-950 py-3">
        <div
          onClick={() => {
            const event = new CustomEvent('show-toast', { detail: 'Direct Messages' });
            window.dispatchEvent(event);
          }}
          className="group relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-3xl bg-gray-800 text-indigo-500 transition-all duration-200 hover:rounded-2xl hover:bg-indigo-600 hover:text-white"
        >
          <Hash size={28} />
          <div className="absolute left-16 z-50 scale-0 rounded-md bg-gray-900 p-2 text-xs font-bold text-white shadow-md transition-all duration-100 group-hover:scale-100">
            Direct Messages
          </div>
        </div>

        <div className="h-[2px] w-8 rounded-full bg-gray-800" />

        {guilds.map((guild) => (
          <div
            key={guild.id}
            onClick={() => setCurrentGuild(guild)}
            className={`group relative flex h-12 w-12 cursor-pointer items-center justify-center transition-all duration-200 ${currentGuild?.id === guild.id
              ? 'rounded-2xl bg-indigo-600 text-white'
              : 'rounded-3xl bg-gray-800 text-gray-400 hover:rounded-2xl hover:bg-indigo-600 hover:text-white'
              }`}
          >
            {currentGuild?.id === guild.id && (
              <div className="absolute -left-3 h-10 w-2 rounded-r-full bg-white" />
            )}
            <span className="text-sm font-bold uppercase">{guild.name.substring(0, 2).toUpperCase()}</span>
            <div className="absolute left-16 z-50 scale-0 rounded-md bg-gray-900 p-2 text-xs font-bold text-white shadow-md transition-all duration-100 group-hover:scale-100">
              {guild.name}
            </div>
          </div>
        ))}

        <div
          onClick={() => setShowCreateModal(true)}
          className="group relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-3xl bg-gray-800 text-emerald-500 transition-all duration-200 hover:rounded-2xl hover:bg-emerald-600 hover:text-white"
        >
          <Plus data-testid="Plus" size={28} />
          <div className="absolute left-16 z-50 scale-0 rounded-md bg-gray-900 p-2 text-xs font-bold text-white shadow-md transition-all duration-100 group-hover:scale-100">
            Add a Server
          </div>
        </div>
      </div>

      <CreateGuildModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </>
  );
};

export default Sidebar;
