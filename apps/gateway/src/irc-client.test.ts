import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import { IRCClient } from './irc-client';

// Mock net.Socket
const mockSocket = {
    on: vi.fn(),
    write: vi.fn(),
    connect: vi.fn(),
    end: vi.fn(),
    writable: true,
};

vi.mock('net', () => {
    return {
        Socket: function () {
            return mockSocket;
        },
    };
});

describe('IRCClient', () => {
    let client: IRCClient;
    const config = {
        host: 'localhost',
        port: 6667,
        nick: 'TestUser',
        username: 'testuser',
        realname: 'Test User',
        password: 'testpass',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset mockSocket writable
        mockSocket.writable = true;
        mockSocket.on.mockImplementation(() => mockSocket);
        mockSocket.write.mockImplementation(() => true);
        mockSocket.connect.mockImplementation(() => mockSocket);
        mockSocket.end.mockImplementation(() => { });

        client = new IRCClient(config, { maxRetries: 0 }); // Disable reconnect in tests
    });

    describe('connect', () => {
        it('should create a socket and connect to host:port', () => {
            client.connect();
            // Socket events should be registered
            expect(mockSocket.on).toHaveBeenCalledWith('data', expect.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith('close', expect.any(Function));
            expect(mockSocket.connect).toHaveBeenCalledWith(6667, 'localhost');
        });

        it('should send CAP LS, NICK, and USER on connect', () => {
            client.connect();

            // Simulate connect event
            const connectHandler = mockSocket.on.mock.calls.find(([event]: string[]) => event === 'connect')?.[1];
            connectHandler?.();

            const writes = mockSocket.write.mock.calls.map(([data]: string[]) => data.trim());
            expect(writes).toContain('CAP LS 302');
            expect(writes).toContain('NICK TestUser');
            expect(writes).toContain('USER testuser 0 * :Test User');
        });
    });

    describe('handleLine - PING', () => {
        it('should reply with PONG on PING', () => {
            client.connect();
            const dataHandler = mockSocket.on.mock.calls.find(([event]: string[]) => event === 'data')?.[1];

            dataHandler?.(Buffer.from('PING :server.example.com\r\n'));

            const writes = mockSocket.write.mock.calls.map(([data]: string[]) => data.trim());
            expect(writes).toContain('PONG :server.example.com');
        });
    });

    describe('handleLine - CAP', () => {
        it('should request sasl and other caps from CAP LS', () => {
            client.connect();
            const dataHandler = mockSocket.on.mock.calls.find(([event]: string[]) => event === 'data')?.[1];

            dataHandler?.(Buffer.from(':server CAP * LS :sasl echo-message server-time message-tags batch\r\n'));

            const writes = mockSocket.write.mock.calls.map(([data]: string[]) => data.trim());
            const reqCall = writes.find((w: string) => w.startsWith('CAP REQ'));
            expect(reqCall).toBeDefined();
            expect(reqCall).toContain('sasl');
            expect(reqCall).toContain('echo-message');
            expect(reqCall).toContain('server-time');
        });

        it('should handle multiline CAP LS with continuations', () => {
            client.connect();
            const dataHandler = mockSocket.on.mock.calls.find(([event]: string[]) => event === 'data')?.[1];

            // First line of multiline CAP LS
            dataHandler?.(Buffer.from(':server CAP * LS * :sasl echo-message\r\n'));
            // Second line (final)
            dataHandler?.(Buffer.from(':server CAP * LS :server-time batch\r\n'));

            const writes = mockSocket.write.mock.calls.map(([data]: string[]) => data.trim());
            const reqCalls = writes.filter((w: string) => w.startsWith('CAP REQ'));
            expect(reqCalls).toHaveLength(2);
            expect(reqCalls[0]).toContain('sasl');
            expect(reqCalls[0]).toContain('echo-message');
            expect(reqCalls[1]).toContain('server-time');
            expect(reqCalls[1]).toContain('batch');
        });

        it('should not request sasl if password is missing', () => {
            const configNoPass = { ...config, password: undefined };
            const clientNoPass = new IRCClient(configNoPass);
            clientNoPass.connect();
            const dataHandler = mockSocket.on.mock.calls.find(([event]: string[]) => event === 'data')?.[1];

            dataHandler?.(Buffer.from(':server CAP * LS :sasl echo-message\r\n'));

            const writes = mockSocket.write.mock.calls.map(([data]: string[]) => data.trim());
            const reqCall = writes.find((w: string) => w.startsWith('CAP REQ'));
            expect(reqCall).not.toContain('sasl');
            expect(reqCall).toContain('echo-message');
        });

        it('should start SASL auth on CAP ACK with sasl', () => {
            client.connect();
            const dataHandler = mockSocket.on.mock.calls.find(([event]: string[]) => event === 'data')?.[1];

            dataHandler?.(Buffer.from(':server CAP * ACK :sasl\r\n'));

            const writes = mockSocket.write.mock.calls.map(([data]: string[]) => data.trim());
            expect(writes).toContain('AUTHENTICATE PLAIN');
        });
    });

    describe('handleLine - AUTHENTICATE', () => {
        it('should send base64 auth on AUTHENTICATE +', () => {
            client.connect();
            const dataHandler = mockSocket.on.mock.calls.find(([event]: string[]) => event === 'data')?.[1];

            dataHandler?.(Buffer.from('AUTHENTICATE +\r\n'));

            const writes = mockSocket.write.mock.calls.map(([data]: string[]) => data.trim());
            const authCall = writes.find((w: string) => w.startsWith('AUTHENTICATE') && w !== 'AUTHENTICATE PLAIN');
            expect(authCall).toBeDefined();
            // Verify it's base64 encoded
            const base64 = authCall!.split(' ')[1];
            const decoded = Buffer.from(base64, 'base64').toString();
            expect(decoded).toBe('TestUser\0TestUser\0testpass');
        });
    });

    describe('handleLine - PRIVMSG', () => {
        it('should emit message event with parsed data', () => {
            const messageHandler = vi.fn();
            client.on('message', messageHandler);
            client.connect();
            const dataHandler = mockSocket.on.mock.calls.find(([event]: string[]) => event === 'data')?.[1];

            dataHandler?.(Buffer.from(':SomeUser!user@host PRIVMSG #channel :Hello World\r\n'));

            expect(messageHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    author: 'SomeUser',
                    channel: '#channel',
                    content: 'Hello World',
                })
            );
        });
    });

    describe('handleLine - Numerics', () => {
        it('should emit registered on 001', () => {
            const registeredHandler = vi.fn();
            client.on('registered', registeredHandler);
            client.connect();
            const dataHandler = mockSocket.on.mock.calls.find(([event]: string[]) => event === 'data')?.[1];

            dataHandler?.(Buffer.from(':server 001 TestUser :Welcome to the IRC network\r\n'));

            expect(registeredHandler).toHaveBeenCalled();
        });

        it('should send CAP END on 903 (SASL Success)', () => {
            client.connect();
            const dataHandler = mockSocket.on.mock.calls.find(([event]: string[]) => event === 'data')?.[1];

            dataHandler?.(Buffer.from(':server 903 TestUser :SASL authentication successful\r\n'));

            const writes = mockSocket.write.mock.calls.map(([data]: string[]) => data.trim());
            expect(writes).toContain('CAP END');
        });

        it('should emit error on SASL failure (904)', () => {
            const errorHandler = vi.fn();
            client.on('error', errorHandler);
            client.connect();
            const dataHandler = mockSocket.on.mock.calls.find(([event]: string[]) => event === 'data')?.[1];

            dataHandler?.(Buffer.from(':server 904 TestUser :SASL authentication failed\r\n'));

            expect(errorHandler).toHaveBeenCalledWith(expect.objectContaining({ message: 'SASL Authentication Failed' }));
        });

        it('should attempt registration on SASL failure if account does not exist', () => {
            client.connect();
            const dataHandler = mockSocket.on.mock.calls.find(([event]: string[]) => event === 'data')?.[1];

            dataHandler?.(Buffer.from(':server 904 TestUser :Account does not exist\r\n'));

            const writes = mockSocket.write.mock.calls.map(([data]: string[]) => data.trim());
            expect(writes).toContain('REGISTER TestUser testpass');
        });
    });

    describe('join', () => {
        it('should send JOIN command', () => {
            client.connect();
            // Trigger connect so socket is set
            const connectHandler = mockSocket.on.mock.calls.find(([event]: string[]) => event === 'connect')?.[1];
            connectHandler?.();

            client.join('#test-channel');

            const writes = mockSocket.write.mock.calls.map(([data]: string[]) => data.trim());
            expect(writes).toContain('JOIN #test-channel');
        });
    });

    describe('privmsg', () => {
        it('should send PRIVMSG command', () => {
            client.connect();
            const connectHandler = mockSocket.on.mock.calls.find(([event]: string[]) => event === 'connect')?.[1];
            connectHandler?.();

            client.privmsg('#test-channel', 'Hello!');

            const writes = mockSocket.write.mock.calls.map(([data]: string[]) => data.trim());
            expect(writes).toContain('PRIVMSG #test-channel :Hello!');
        });
    });

    describe('fetchHistory', () => {
        it('should send CHATHISTORY LATEST command', () => {
            client.connect();
            const connectHandler = mockSocket.on.mock.calls.find(([event]: string[]) => event === 'connect')?.[1];
            connectHandler?.();

            client.fetchHistory('#test-channel', 25);

            const writes = mockSocket.write.mock.calls.map(([data]: string[]) => data.trim());
            expect(writes).toContain('CHATHISTORY LATEST #test-channel * 25');
        });
    });

    describe('disconnect', () => {
        it('should end the socket', () => {
            client.connect();
            client.disconnect();
            expect(mockSocket.end).toHaveBeenCalled();
        });
    });

    describe('Member Tracking', () => {
        it('should emit members event on 353 (RPL_NAMREPLY)', () => {
            const membersHandler = vi.fn();
            client.on('members', membersHandler);
            client.connect();
            const dataHandler = mockSocket.on.mock.calls.find(([event]: string[]) => event === 'data')?.[1];

            dataHandler?.(Buffer.from(':server 353 TestUser = #channel :alice @bob +charlie\r\n'));

            expect(membersHandler).toHaveBeenCalledWith({
                channel: '#channel',
                members: expect.arrayContaining(['alice', 'bob', 'charlie'])
            });
        });

        it('should add member and emit on JOIN', () => {
            const membersHandler = vi.fn();
            client.on('members', membersHandler);
            client.connect();
            const dataHandler = mockSocket.on.mock.calls.find(([event]: string[]) => event === 'data')?.[1];

            dataHandler?.(Buffer.from(':alice!user@host JOIN #channel\r\n'));

            expect(membersHandler).toHaveBeenCalledWith({
                channel: '#channel',
                members: ['alice']
            });
        });

        it('should remove member and emit on PART', () => {
            const membersHandler = vi.fn();
            client.on('members', membersHandler);
            client.connect();
            const dataHandler = mockSocket.on.mock.calls.find(([event]: string[]) => event === 'data')?.[1];

            // Join first
            dataHandler?.(Buffer.from(':alice!user@host JOIN #channel\r\n'));
            dataHandler?.(Buffer.from(':bob!user@host JOIN #channel\r\n'));
            membersHandler.mockClear();

            dataHandler?.(Buffer.from(':alice!user@host PART #channel\r\n'));

            expect(membersHandler).toHaveBeenCalledWith({
                channel: '#channel',
                members: ['bob']
            });
        });

        it('should remove member from all channels on QUIT', () => {
            const membersHandler = vi.fn();
            client.on('members', membersHandler);
            client.connect();
            const dataHandler = mockSocket.on.mock.calls.find(([event]: string[]) => event === 'data')?.[1];

            dataHandler?.(Buffer.from(':alice!user@host JOIN #chan1\r\n'));
            dataHandler?.(Buffer.from(':alice!user@host JOIN #chan2\r\n'));
            membersHandler.mockClear();

            dataHandler?.(Buffer.from(':alice!user@host QUIT :Bye\r\n'));

            expect(membersHandler).toHaveBeenCalledWith({
                channel: '#chan1',
                members: []
            });
            expect(membersHandler).toHaveBeenCalledWith({
                channel: '#chan2',
                members: []
            });
        });

        it('should update member list on NICK change', () => {
            const membersHandler = vi.fn();
            client.on('members', membersHandler);
            client.connect();
            const dataHandler = mockSocket.on.mock.calls.find(([event]: string[]) => event === 'data')?.[1];

            dataHandler?.(Buffer.from(':alice!user@host JOIN #channel\r\n'));
            membersHandler.mockClear();

            dataHandler?.(Buffer.from(':alice!user@host NICK alice_new\r\n'));

            expect(membersHandler).toHaveBeenCalledWith({
                channel: '#channel',
                members: ['alice_new']
            });
        });

        it('should remove member on KICK', () => {
            const membersHandler = vi.fn();
            client.on('members', membersHandler);
            client.connect();
            const dataHandler = mockSocket.on.mock.calls.find(([event]: string[]) => event === 'data')?.[1];

            dataHandler?.(Buffer.from(':alice!user@host JOIN #channel\r\n'));
            membersHandler.mockClear();

            dataHandler?.(Buffer.from(':op!user@host KICK #channel alice :Get out!\r\n'));

            expect(membersHandler).toHaveBeenCalledWith({
                channel: '#channel',
                members: []
            });
        });
    });

    describe('Batch Processing', () => {
        it('should collect and emit history messages in a batch', () => {
            const historyHandler = vi.fn();
            client.on('history', historyHandler);
            client.connect();
            const dataHandler = mockSocket.on.mock.calls.find(([event]: string[]) => event === 'data')?.[1];

            dataHandler?.(Buffer.from('BATCH +batch1 chathistory\r\n'));
            dataHandler?.(Buffer.from('@time=2024-01-01T00:00:00.000Z;batch=batch1 :user PRIVMSG #chan :msg1\r\n'));
            dataHandler?.(Buffer.from('@time=2024-01-01T00:00:01.000Z;batch=batch1 :user PRIVMSG #chan :msg2\r\n'));
            dataHandler?.(Buffer.from('BATCH -batch1\r\n'));

            expect(historyHandler).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({ content: 'msg1', timestamp: '2024-01-01T00:00:00.000Z' }),
                expect.objectContaining({ content: 'msg2', timestamp: '2024-01-01T00:00:01.000Z' })
            ]));
        });

        it('should not emit if batch is empty', () => {
            const historyHandler = vi.fn();
            client.on('history', historyHandler);
            client.connect();
            const dataHandler = mockSocket.on.mock.calls.find(([event]: string[]) => event === 'data')?.[1];

            dataHandler?.(Buffer.from('BATCH +batch1 chathistory\r\n'));
            dataHandler?.(Buffer.from('BATCH -batch1\r\n'));

            expect(historyHandler).not.toHaveBeenCalled();
        });
    });

    describe('Reconnection Logic', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should attempt reconnect on close if not intentional', () => {
            const clientWithReconnect = new IRCClient(config, { maxRetries: 2, initialDelay: 100 });
            clientWithReconnect.connect();
            const closeHandler = mockSocket.on.mock.calls.find(([event]: string[]) => event === 'close')?.[1];

            // Simulate socket closing unexpectedly
            closeHandler?.();

            expect(vi.getTimerCount()).toBe(1);
            vi.advanceTimersByTime(100);

            // Should have called connect again (mockSocket.connect will be called by new net.Socket instance)
            expect(mockSocket.connect).toHaveBeenCalledTimes(2);
        });

        it('should emit reconnect_failed after max retries', () => {
            const failedHandler = vi.fn();
            const clientWithReconnect = new IRCClient(config, { maxRetries: 1, initialDelay: 100 });
            clientWithReconnect.on('reconnect_failed', failedHandler);
            clientWithReconnect.connect();
            const closeHandler = mockSocket.on.mock.calls.find(([event]: string[]) => event === 'close')?.[1];

            // First failure
            closeHandler?.();
            vi.advanceTimersByTime(100);

            // Second failure (reaches maxRetries=1)
            closeHandler?.();

            expect(failedHandler).toHaveBeenCalled();
        });

        it('should not reconnect if disconnect was intentional', () => {
            client.connect();
            client.disconnect();
            const closeHandler = mockSocket.on.mock.calls.find(([event]: string[]) => event === 'close')?.[1];

            closeHandler?.();

            expect(vi.getTimerCount()).toBe(0);
        });
    });
});
