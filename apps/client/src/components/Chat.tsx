import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { Hash, Bell, Pin, Users, Search, Inbox, HelpCircle, PlusCircle, Gift, Sticker, Smile } from 'lucide-react';

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

const Chat: React.FC = () => {
  const { currentChannel, messages, user } = useStore();
  const [input, setInput] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const channelMessages = currentChannel ? messages[currentChannel.irc_channel_name] || [] : [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [channelMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentChannel) return;

    try {
      await window.ironcord.sendMessage(currentChannel.irc_channel_name, input);
      setInput('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const showToast = (feature: string) => {
    setToast(`${feature} — Coming soon!`);
    setTimeout(() => setToast(null), 2000);
  };

  if (!currentChannel) {
    return (
      <div className="flex flex-1 flex-col bg-gray-800">
        <div className="flex h-12 items-center border-b border-gray-950 px-4 shadow-xs">
          <Hash size={24} className="mr-2 text-gray-500" />
          <span className="font-bold text-white">Select a channel</span>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <h3 className="text-xl font-bold text-white">Welcome to IronCord</h3>
            <p className="text-gray-400">Select a channel to start chatting</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-gray-800">
      {/* Toast */}
      {toast && (
        <div className="absolute top-16 right-4 z-50 rounded-lg bg-gray-900 px-4 py-2 text-sm text-gray-300 shadow-lg border border-gray-700">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex h-12 items-center justify-between border-b border-gray-950 px-4 shadow-xs">
        <div className="flex items-center">
          <Hash size={24} className="mr-2 text-gray-500" />
          <span className="font-bold text-white">{currentChannel.name}</span>
        </div>
        <div className="flex items-center space-x-4 text-gray-400">
          <Bell size={20} className="cursor-pointer hover:text-gray-200" onClick={() => showToast('Notifications')} />
          <Pin data-testid="Pin" size={20} className="cursor-pointer hover:text-gray-200" onClick={() => showToast('Pinned Messages')} />
          <Users size={20} className="cursor-pointer hover:text-gray-200" onClick={() => showToast('Member List')} />
          <div className="flex h-6 w-36 items-center rounded bg-gray-950 px-1 text-xs">
            <input type="text" placeholder="Search" className="w-full bg-transparent px-1 outline-hidden" />
            <Search size={14} />
          </div>
          <Inbox size={20} className="cursor-pointer hover:text-gray-200" onClick={() => showToast('Inbox')} />
          <HelpCircle size={20} className="cursor-pointer hover:text-gray-200" onClick={() => showToast('Help')} />
        </div>
      </div>

      {/* Message List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {channelMessages.length === 0 && (
          <div className="mb-8 mt-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-700 text-white">
              <Hash size={40} />
            </div>
            <h1 className="mt-4 text-3xl font-bold text-white">Welcome to #{currentChannel.name}!</h1>
            <p className="text-gray-400">This is the start of the #{currentChannel.name} channel.</p>
          </div>
        )}

        {channelMessages.map((msg, i) => (
          <div key={msg.id || i} className="group flex items-start space-x-4 hover:bg-gray-900/20 -mx-4 px-4 py-1">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full mt-1 ${nickColor(msg.author)}`}>
              <span className="text-sm font-bold text-white uppercase">{msg.author.charAt(0)}</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline space-x-2">
                <span className="font-medium text-white hover:underline cursor-pointer">{msg.author}</span>
                <span className="text-[10px] text-gray-400">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-gray-300 leading-snug">{msg.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="px-4 pb-6">
        <form onSubmit={handleSendMessage} className="flex items-center rounded-lg bg-gray-700 px-4 py-2">
          <PlusCircle size={24} className="mr-4 cursor-pointer text-gray-400 hover:text-gray-200" onClick={() => showToast('Attachments')} />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message #${currentChannel.name}`}
            className="flex-1 bg-transparent py-2 text-gray-200 outline-hidden"
          />
          <div className="ml-4 flex items-center space-x-3 text-gray-400">
            <Gift size={24} className="cursor-pointer hover:text-gray-200" onClick={() => showToast('Gifts')} />
            <Sticker size={24} className="cursor-pointer hover:text-gray-200" onClick={() => showToast('Stickers')} />
            <Smile size={24} className="cursor-pointer hover:text-gray-200" onClick={() => showToast('Emoji Picker')} />
          </div>
        </form>
      </div>
    </div>
  );
};

export default Chat;
