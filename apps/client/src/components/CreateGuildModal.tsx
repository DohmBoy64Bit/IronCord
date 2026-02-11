import React, { useState } from 'react';
import { useStore } from '../store';
import { X } from 'lucide-react';

interface CreateGuildModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CreateGuildModal: React.FC<CreateGuildModalProps> = ({ isOpen, onClose }) => {
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { setGuilds, guilds, setCurrentGuild } = useStore();

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setError('');
        setLoading(true);

        try {
            const guild = await window.ironcord.createGuild(name.trim());
            if (guild.error) {
                setError(guild.error);
            } else {
                setGuilds([...guilds, guild]);
                setCurrentGuild(guild);
                setName('');
                onClose();
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="w-full max-w-md rounded-lg bg-gray-800 p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Create a Server</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <p className="mb-6 text-sm text-gray-400">
                    Give your new server a personality with a name. You can always change it later.
                </p>

                {error && (
                    <div className="mb-4 rounded bg-red-500/10 p-3 text-sm text-red-500">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="mb-4">
                        <label htmlFor="guild-name" className="block text-xs font-bold uppercase text-gray-400 mb-2">Server Name</label>
                        <input
                            id="guild-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="My Awesome Server"
                            className="w-full rounded bg-gray-900 p-2 text-white outline-hidden focus:ring-1 focus:ring-indigo-500"
                            required
                        />
                    </div>
                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded px-4 py-2 text-sm text-gray-400 hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !name.trim()}
                            className="rounded bg-indigo-600 px-6 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateGuildModal;
