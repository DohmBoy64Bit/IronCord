import '@testing-library/jest-dom/vitest';

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
    onIRCMessage: vi.fn(),
    onIRCHistory: vi.fn(),
    onIRCError: vi.fn(),
};

Object.defineProperty(window, 'ironcord', {
    value: mockIroncord,
    writable: true,
});
