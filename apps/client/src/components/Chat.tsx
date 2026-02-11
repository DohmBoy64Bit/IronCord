import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { Hash, Bell, Pin, Users, Search, Inbox, HelpCircle, PlusCircle, Gift, Sticker, Smile, X } from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [showMemberList, setShowMemberList] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const channelMessages = currentChannel ? messages[currentChannel.irc_channel_name] || [] : [];
  const filteredMessages = searchQuery
    ? channelMessages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : channelMessages;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentChannel) return;

    try {
      await window.ironcord.sendMessage(currentChannel.irc_channel_name, input);
      setInput('');
      setShowEmojiPicker(false);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setInput(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      showToast(`Uploading ${file.name}...`);
      // Mock upload logic
      setTimeout(() => {
        showToast(`${file.name} uploaded!`);
      }, 1500);
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
          <Users size={20} className={`cursor-pointer hover:text-gray-200 ${showMemberList ? 'text-white' : ''}`} onClick={() => setShowMemberList(!showMemberList)} />
          <div className="flex h-6 w-36 items-center rounded bg-gray-950 px-1 text-xs">
            <input
              type="text"
              placeholder="Search"
              className="w-full bg-transparent px-1 outline-hidden"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery ? <X size={14} className="cursor-pointer" onClick={() => setSearchQuery('')} /> : <Search size={14} />}
          </div>
          <Inbox size={20} className="cursor-pointer hover:text-gray-200" onClick={() => showToast('Inbox')} />
          <HelpCircle size={20} className="cursor-pointer hover:text-gray-200" onClick={() => showToast('Help')} />
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Main Chat Area */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Message List */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {(searchQuery ? filteredMessages : channelMessages).length === 0 && (
              <div className="mb-8 mt-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-700 text-white">
                  <Hash size={40} />
                </div>
                <h1 className="mt-4 text-3xl font-bold text-white">
                  {searchQuery ? `No results for "${searchQuery}"` : `Welcome to #${currentChannel.name}!`}
                </h1>
                <p className="text-gray-400">
                  {searchQuery ? "Try a different search term." : `This is the start of the #${currentChannel.name} channel.`}
                </p>
              </div>
            )}

            {(searchQuery ? filteredMessages : channelMessages).map((msg, i) => (
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

          {/* Input Area */}
          <div className="px-4 pb-6 relative">
            {showEmojiPicker && (
              <div className="absolute bottom-20 right-4 z-50 rounded-lg bg-gray-900 p-3 shadow-2xl border border-gray-700 w-64">
                <div className="grid grid-cols-6 gap-2">
                  {['😀', '😂', '😍', '👍', '🔥', '✨', '🚀', '🎉', '💡', '💯', '👋', '👀', '❤️', '🎉', '🤔', '😎', '🙌', '⭐'].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => handleEmojiClick(emoji)}
                      className="text-2xl hover:bg-gray-700 rounded p-1 transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-center rounded-lg bg-gray-700 px-4 py-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <PlusCircle
                size={24}
                className="mr-4 cursor-pointer text-gray-400 hover:text-gray-200"
                onClick={() => fileInputRef.current?.click()}
              />
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
                <Smile
                  size={24}
                  className={`cursor-pointer hover:text-gray-200 ${showEmojiPicker ? 'text-white' : ''}`}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                />
              </div>
            </form>
          </div>
        </div>

        {/* Member List Panel */}
        {showMemberList && (
          <div className="w-60 bg-gray-800 border-l border-gray-950 p-4 overflow-y-auto">
            <h3 className="text-xs font-bold uppercase text-gray-400 mb-4">Online — 4</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 p-2 hover:bg-gray-700 rounded-md cursor-pointer transition-colors group">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${nickColor(user?.irc_nick || 'User')}`}>
                  <span className="text-xs font-bold text-white uppercase">{user?.irc_nick?.[0] || 'U'}</span>
                </div>
                <span className="text-sm text-gray-300 group-hover:text-white font-medium">{user?.irc_nick || 'User'}</span>
              </div>

              {['Alice', 'Bob', 'Charlie'].map(name => (
                <div key={name} className="flex items-center space-x-2 p-2 hover:bg-gray-700 rounded-md cursor-pointer transition-colors group">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${nickColor(name)}`}>
                    <span className="text-xs font-bold text-white uppercase">{name[0]}</span>
                  </div>
                  <span className="text-sm text-gray-400 group-hover:text-white font-medium">{name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
