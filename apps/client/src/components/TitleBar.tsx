import React from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';

const TitleBar: React.FC = () => {
    const handleMinimize = () => window.ironcord.windowControls.minimize();
    const handleMaximize = () => window.ironcord.windowControls.maximize();
    const handleClose = () => window.ironcord.windowControls.close();

    return (
        <div className="flex h-8 w-full items-center justify-between bg-gray-950 px-2 text-gray-400 select-none drag-region">
            {/* App Branding */}
            <div className="flex items-center space-x-2 pl-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">IronCord</span>
            </div>

            {/* Window Controls */}
            <div className="flex h-full no-drag">
                <button
                    onClick={handleMinimize}
                    className="flex h-full w-12 items-center justify-center hover:bg-gray-800 transition-colors"
                >
                    <Minus size={14} />
                </button>
                <button
                    onClick={handleMaximize}
                    className="flex h-full w-12 items-center justify-center hover:bg-gray-800 transition-colors"
                >
                    <Square size={12} />
                </button>
                <button
                    onClick={handleClose}
                    className="flex h-full w-12 items-center justify-center hover:bg-red-600 hover:text-white transition-colors"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};

export default TitleBar;
