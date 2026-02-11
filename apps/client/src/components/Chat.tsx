import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { Hash, Bell, Pin, Users, Search, Inbox, HelpCircle, PlusCircle, Gift, Sticker, Smile } from 'lucide-react';

const Chat: React.FC = () => {
  const { currentChannel, messages, addMessage, user } = useStore();
  const [input, setInput] = useState('');
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
      {/* Header */}
      <div className="flex h-12 items-center justify-between border-b border-gray-950 px-4 shadow-xs">
        <div className="flex items-center">
          <Hash size={24} className="mr-2 text-gray-500" />
          <span className="font-bold text-white">{currentChannel.name}</span>
        </div>
        <div className="flex items-center space-x-4 text-gray-400">
          <Bell size={20} className="cursor-pointer hover:text-gray-200" />
          <Pin size={20} className="cursor-pointer hover:text-gray-200" />
          <Users size={20} className="cursor-pointer hover:text-gray-200" />
          <div className="flex h-6 w-36 items-center rounded bg-gray-950 px-1 text-xs">
            <input type="text" placeholder="Search" className="w-full bg-transparent px-1 outline-hidden" />
            <Search size={14} />
          </div>
          <Inbox size={20} className="cursor-pointer hover:text-gray-200" />
          <HelpCircle size={20} className="cursor-pointer hover:text-gray-200" />
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
            <div className="h-10 w-10 shrink-0 rounded-full bg-indigo-500 mt-1" />
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
          <PlusCircle size={24} className="mr-4 cursor-pointer text-gray-400 hover:text-gray-200" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message #${currentChannel.name}`}
            className="flex-1 bg-transparent py-2 text-gray-200 outline-hidden"
          />
          <div className="ml-4 flex items-center space-x-3 text-gray-400">
            <Gift size={24} className="cursor-pointer hover:text-gray-200" />
            <Sticker size={24} className="cursor-pointer hover:text-gray-200" />
            <Smile size={24} className="cursor-pointer hover:text-gray-200" />
          </div>
        </form>
      </div>
    </div>
  );
};

export default Chat;
