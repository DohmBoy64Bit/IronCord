import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Edit2, Trash2 } from 'lucide-react';
import { useStore } from '../store';

interface ChannelContextMenuProps {
    channelId: string;
    position: { x: number; y: number };
    onClose: () => void;
}

const ChannelContextMenu: React.FC<ChannelContextMenuProps> = ({ channelId, position, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const { currentGuild, channels, updateChannel, deleteChannel } = useStore();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [newName, setNewName] = useState('');

    // Get the current channel to initialize rename with current name
    const channel = currentGuild
        ? channels[currentGuild.id]?.find((c) => c.id === channelId)
        : null;

    // Close on click outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [onClose]);

    // Initialize newName when opening rename modal
    useEffect(() => {
        if (showRenameModal && channel) {
            setNewName(channel.name);
        }
    }, [showRenameModal, channel]);

    // Adjust position to not go off-screen
    const style = {
        top: position.y,
        left: position.x,
    };

    const handleRename = () => {
        if (newName.trim()) {
            updateChannel(channelId, { name: newName.trim() });
            onClose();
        }
    };

    const handleDelete = () => {
        deleteChannel(channelId);
        onClose();
    };

    const menuContent = (
        <>
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="w-80 rounded-lg bg-gray-900 border border-red-500/20 p-4 shadow-xl">
                        <h3 className="text-lg font-bold text-white mb-2">Delete Channel?</h3>
                        <p className="text-gray-400 text-sm mb-4">Are you sure you want to delete this channel? This cannot be undone.</p>
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-3 py-1 rounded text-gray-300 hover:bg-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 font-bold"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showRenameModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="w-80 rounded-lg bg-gray-900 border border-indigo-500/20 p-4 shadow-xl">
                        <h3 className="text-lg font-bold text-white mb-2">Rename Channel</h3>
                        <input
                            autoFocus
                            type="text"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            className="w-full bg-black/20 text-white border border-gray-700 rounded p-2 mb-4 outline-none focus:border-indigo-500"
                            placeholder="New channel name"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleRename();
                                }
                            }}
                        />
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => onClose()}
                                className="px-3 py-1 rounded text-gray-300 hover:bg-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRename}
                                disabled={!newName.trim()}
                                className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 font-bold disabled:opacity-50"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {!showDeleteConfirm && !showRenameModal && (
                <div
                    ref={menuRef}
                    style={style}
                    className="fixed z-50 w-48 rounded-md bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl py-1 overflow-hidden"
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowRenameModal(true);
                        }}
                        className="flex w-full items-center justify-between px-3 py-2 text-sm text-gray-300 hover:bg-indigo-600 hover:text-white transition-colors"
                    >
                        <span>Rename Channel</span>
                        <Edit2 size={14} />
                    </button>
                    <div className="h-px bg-white/10 my-1" />
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(true);
                        }}
                        className="flex w-full items-center justify-between px-3 py-2 text-sm text-red-400 hover:bg-red-600 hover:text-white transition-colors"
                    >
                        <span>Delete Channel</span>
                        <Trash2 size={14} />
                    </button>
                </div>
            )}
        </>
    );

    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return null;

    return createPortal(menuContent, modalRoot);
};

export default ChannelContextMenu;
