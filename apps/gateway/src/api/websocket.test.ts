import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import jwt from 'jsonwebtoken';

// Use vi.hoisted for the shared emitter
const { mockIRCEmitter } = vi.hoisted(() => {
    const { EventEmitter } = require('events');
    const emitter = new EventEmitter();
    (emitter as any).connect = vi.fn();
    (emitter as any).disconnect = vi.fn();
    (emitter as any).join = vi.fn();
    (emitter as any).privmsg = vi.fn();
    (emitter as any).fetchHistory = vi.fn();
    return { mockIRCEmitter: emitter };
});

// Mock IRCClient
vi.mock('../irc-client', () => {
    return {
        IRCClient: vi.fn().mockImplementation(function () {
            return mockIRCEmitter;
        }),
    };
});

import { IRCClient } from '../irc-client';
import { WebSocketServer } from './websocket';
import { Server as SocketServer } from 'socket.io';
import { dbService } from '../services/db.service';

// Mock socket.io
vi.mock('socket.io', () => {
    const mockOn = vi.fn();
    const mockUse = vi.fn();
    const MockServer = vi.fn(function () {
        return {
            on: mockOn,
            use: mockUse,
        };
    });
    return { Server: MockServer };
});

// Mock jwt
vi.mock('jsonwebtoken', () => ({
    default: {
        verify: vi.fn(),
    },
}));

// Mock dbService
vi.mock('../services/db.service', () => ({
    dbService: {
        query: vi.fn(),
    },
}));

describe('WebSocketServer', () => {
    let server: any;
    let mockHttpServer: any;
    let io: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockHttpServer = {};
        server = new WebSocketServer(mockHttpServer);
        io = (server as any).io;
    });

    describe('Authentication Middleware', () => {
        it('should allow connection with valid token', () => {
            const authMiddleware = io.use.mock.calls[0][0];
            const mockSocket = { handshake: { auth: { token: 'valid' } } };
            const next = vi.fn();
            (jwt.verify as any).mockReturnValue({ userId: 'user123' });

            authMiddleware(mockSocket, next);

            expect(next).toHaveBeenCalledWith();
            expect((mockSocket as any).userId).toBe('user123');
        });

        it('should reject connection without token', () => {
            const authMiddleware = io.use.mock.calls[0][0];
            const mockSocket = { handshake: { auth: {} } };
            const next = vi.fn();

            authMiddleware(mockSocket, next);

            expect(next).toHaveBeenCalledWith(expect.any(Error));
            expect(next.mock.calls[0][0].message).toBe('Authentication required');
        });

        it('should reject connection with invalid token', () => {
            const authMiddleware = io.use.mock.calls[0][0];
            const mockSocket = { handshake: { auth: { token: 'invalid' } } };
            const next = vi.fn();
            (jwt.verify as any).mockImplementation(() => { throw new Error('invalid'); });

            authMiddleware(mockSocket, next);

            expect(next).toHaveBeenCalledWith(expect.any(Error));
            expect(next.mock.calls[0][0].message).toBe('Invalid or expired token');
        });
    });

    describe('Connection events', () => {
        let mockSocket: any;
        let onConnection: any;

        beforeEach(() => {
            onConnection = io.on.mock.calls.find((c: any) => c[0] === 'connection')[1];
            mockSocket = new EventEmitter();
            (mockSocket as any).id = 'socket123';
            (mockSocket as any).userId = 'user123';
            mockSocket.emit = vi.fn(mockSocket.emit.bind(mockSocket));
            mockSocket.on = vi.fn(mockSocket.on.bind(mockSocket));

            // Re-capture onConnection handler in case it changed
            onConnection = (io.on as any).mock.calls.find((c: any) => c[0] === 'connection')[1];
        });

        it('should handle irc:connect', async () => {
            onConnection(mockSocket);
            const config = { host: 'irc.example.com', nick: 'test' };

            mockSocket.emit('irc:connect', { config });

            // Helper to wait for event propagation without sleep loops
            await new Promise(resolve => process.nextTick(resolve));

            expect(IRCClient).toHaveBeenCalledWith(config);
            const client = (server as any).userIRCConnections.get('socket123');
            expect(client).toBeDefined();
            expect(mockIRCEmitter.connect).toHaveBeenCalled();
        });

        it('should handle irc:message', async () => {
            onConnection(mockSocket);
            mockSocket.emit('irc:connect', { config: {} });

            await new Promise(resolve => process.nextTick(resolve));
            const client = (server as any).userIRCConnections.get('socket123');
            expect(client).toBeDefined();

            mockSocket.emit('irc:message', { channel: '#test', message: 'hello' });

            expect(mockIRCEmitter.privmsg).toHaveBeenCalledWith('#test', 'hello');
        });

        it('should auto-join channels on registered event', async () => {
            onConnection(mockSocket);
            mockSocket.emit('irc:connect', { config: {} });

            await new Promise(resolve => setImmediate(resolve));
            const client = (server as any).userIRCConnections.get('socket123');

            (dbService.query as any).mockResolvedValue({
                rows: [{ irc_channel_name: '#chan1' }]
            });

            // Simulate registered event
            mockIRCEmitter.emit('registered');

            // Wait for async query in handler
            await new Promise(resolve => process.nextTick(resolve));

            expect(mockSocket.emit).toHaveBeenCalledWith('irc:registered');
            expect(dbService.query).toHaveBeenCalled();
            expect(mockIRCEmitter.join).toHaveBeenCalledWith('#chan1');
        });

        it('should emit irc:error on auto-join failure', async () => {
            onConnection(mockSocket);
            mockSocket.emit('irc:connect', { config: {} });

            await new Promise(resolve => process.nextTick(resolve));
            (dbService.query as any).mockRejectedValue(new Error('db down'));

            mockIRCEmitter.emit('registered');
            await new Promise(resolve => process.nextTick(resolve));

            expect(mockSocket.emit).toHaveBeenCalledWith('irc:error', 'Failed to auto-join some channels');
        });

        it('should relay IRC messages to socket', async () => {
            onConnection(mockSocket);
            mockSocket.emit('irc:connect', { config: {} });

            await new Promise(resolve => setImmediate(resolve));
            const client = (server as any).userIRCConnections.get('socket123');

            const msg = { author: 'someone', content: 'hi' };
            mockIRCEmitter.emit('message', msg);

            expect(mockSocket.emit).toHaveBeenCalledWith('irc:message', msg);
        });

        it('should disconnect IRC on socket disconnect', async () => {
            onConnection(mockSocket);
            mockSocket.emit('irc:connect', { config: {} });

            await new Promise(resolve => setImmediate(resolve));
            const client = (server as any).userIRCConnections.get('socket123');

            mockSocket.emit('disconnect');

            expect(mockIRCEmitter.disconnect).toHaveBeenCalled();
            expect((server as any).userIRCConnections.has('socket123')).toBe(false);
        });
    });

    describe('Production Environment', () => {
        it('should use CLIENT_ORIGIN in production', () => {
            const originalNodeEnv = process.env.NODE_ENV;
            const originalClientOrigin = process.env.CLIENT_ORIGIN;
            process.env.NODE_ENV = 'production';
            process.env.CLIENT_ORIGIN = 'https://ironcord.chat';

            new WebSocketServer({} as any);

            expect(SocketServer).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
                cors: expect.objectContaining({
                    origin: 'https://ironcord.chat'
                })
            }));

            // Restore
            process.env.NODE_ENV = originalNodeEnv;
            process.env.CLIENT_ORIGIN = originalClientOrigin;
        });
    });
});
