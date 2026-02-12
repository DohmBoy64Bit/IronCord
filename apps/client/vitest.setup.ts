import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock window.ironcord API globally
const mockIroncord = {
    register: vi.fn(),
    login: vi.fn(),
    connectIRC: vi.fn(),
    sendMessage: vi.fn(),
    getMyGuilds: vi.fn().mockResolvedValue([]),
    getChannels: vi.fn().mockResolvedValue([]),
    createGuild: vi.fn(),
    onIRCRegistered: vi.fn(),
    onIRCConnected: vi.fn(),
    onIRCDisconnected: vi.fn(),
    onIRCMessage: vi.fn(),
    onIRCHistory: vi.fn(),
    onIRCMembers: vi.fn(),
    onIRCError: vi.fn(),
    setPresence: vi.fn(),
    windowControls: {
        minimize: vi.fn(),
        maximize: vi.fn(),
        close: vi.fn(),
    },
};

Object.defineProperty(window, 'ironcord', {
    value: mockIroncord,
    writable: true,
});
