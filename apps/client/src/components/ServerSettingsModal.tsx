import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store';
import { X, Camera, Shield, Smile, Hash } from 'lucide-react';

interface ServerSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ServerSettingsModal: React.FC<ServerSettingsModalProps> = ({ isOpen, onClose }) => {
    const { currentGuild, updateGuild } = useStore();
    const [name, setName] = useState('');
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        if (currentGuild) {
            setName(currentGuild.name);
        }
    }, [currentGuild, isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !currentGuild) return null;

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (currentGuild && name.trim()) {
            updateGuild(currentGuild.id, { name: name.trim() });
            onClose();
        }
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: <Hash size={20} /> },
        { id: 'roles', label: 'Roles', icon: <Shield size={20} />, disabled: true },
        { id: 'emoji', label: 'Emoji', icon: <Smile size={20} />, disabled: true },
    ];

    const modalContent = (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            {/* Backdrop click handler */}
            <div className="absolute inset-0" onClick={onClose} />

            <div className="relative flex h-[80vh] w-full max-w-4xl overflow-hidden rounded-xl bg-gray-900 border border-white/10 shadow-2xl z-10" onClick={e => e.stopPropagation()}>

                {/* Sidebar */}
                <div className="w-60 bg-black/40 p-4 border-r border-white/5 flex flex-col">
                    <h2 className="mb-4 px-2 text-xs font-bold uppercase text-gray-500">Server Settings</h2>
                    <div className="space-y-1 flex-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                disabled={tab.disabled}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex w-full items-center space-x-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${activeTab === tab.id
                                    ? 'bg-indigo-600 text-white'
                                    : tab.disabled
                                        ? 'cursor-not-allowed opacity-50 text-gray-500'
                                        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                                    }`}
                            >
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col bg-gray-800/50 relative">
                    <div className="absolute top-4 right-4">
                        <button
                            onClick={onClose}
                            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-500 text-gray-500 transition-colors hover:border-gray-200 hover:text-gray-200"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-10 max-w-2xl">
                        <h1 className="mb-8 text-xl font-bold text-white">Server Overview</h1>

                        <div className="flex items-start gap-8">
                            {/* Icon Placeholder */}
                            <div className="relative group cursor-pointer">
                                <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-600 flex flex-col items-center justify-center text-gray-500 hover:border-indigo-500 hover:text-indigo-400 transition-all bg-black/20 overflow-hidden">
                                    <Camera size={32} className="mb-1" />
                                    <span className="text-[10px] uppercase font-bold text-center px-2">Upload</span>
                                </div>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSave} className="flex-1 space-y-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Server Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full rounded bg-black/20 p-2 text-white border border-black/20 focus:border-indigo-500 outline-none transition-all"
                                    />
                                </div>

                                <div className="flex justify-end pt-10">
                                    <button
                                        type="submit"
                                        className="rounded bg-indigo-600 px-6 py-2 text-sm font-bold text-white transition-all hover:bg-indigo-700 shadow-lg shadow-indigo-600/20"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return null;

    return createPortal(modalContent, modalRoot);
};

export default ServerSettingsModal;
