import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import guildsRouter from './guilds';
import { dbService } from '../services/db.service';

// Mock authMiddleware before importing it or mock the module
vi.mock('../middleware/auth.middleware', () => ({
    authMiddleware: (req: any, res: any, next: any) => {
        req.user = { userId: 'user123' };
        next();
    },
}));

// Mock dbService
vi.mock('../services/db.service', () => ({
    dbService: {
        query: vi.fn(),
    },
}));

const app = express();
app.use(express.json());
app.use('/guilds', guildsRouter);

describe('Guilds Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /guilds', () => {
        it('should create a new guild', async () => {
            const mockGuild = { id: 'guild123', name: 'Test Guild', owner_id: 'user123', irc_namespace_prefix: '#testguild-' };
            (dbService.query as any)
                .mockResolvedValueOnce({ rows: [mockGuild] }) // Insert guild
                .mockResolvedValueOnce({ rows: [] }); // Add member

            const res = await request(app)
                .post('/guilds')
                .send({ name: 'Test Guild' });

            expect(res.status).toBe(201);
            expect(res.body).toEqual(mockGuild);
            expect(dbService.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO guilds'),
                ['Test Guild', 'user123', '#testguild-']
            );
        });

        it('should return 500 if guild creation fails', async () => {
            (dbService.query as any).mockRejectedValue(new Error('DB Error'));

            const res = await request(app)
                .post('/guilds')
                .send({ name: 'Test Guild' });

            expect(res.status).toBe(500);
            expect(res.body.error).toBe('Failed to create guild');
        });
    });

    describe('POST /guilds/:guildId/channels', () => {
        it('should create a new channel in a guild', async () => {
            const mockChannel = { id: 'chan123', guild_id: 'guild123', name: 'general', irc_channel_name: '#testguild-general' };
            (dbService.query as any)
                .mockResolvedValueOnce({ rows: [{ irc_namespace_prefix: '#testguild-' }] }) // Check guild
                .mockResolvedValueOnce({ rows: [mockChannel] }); // Insert channel

            const res = await request(app)
                .post('/guilds/guild123/channels')
                .send({ name: 'general', topic: 'Main channel' });

            expect(res.status).toBe(201);
            expect(res.body).toEqual(mockChannel);
        });

        it('should return 404 if guild not found', async () => {
            (dbService.query as any).mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .post('/guilds/invalid/channels')
                .send({ name: 'general' });

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Guild not found');
        });
    });

    describe('GET /guilds/mine', () => {
        it('should return user guilds', async () => {
            const mockGuilds = [{ id: 'guild1', name: 'Guild 1' }];
            (dbService.query as any).mockResolvedValue({ rows: mockGuilds });

            const res = await request(app).get('/guilds/mine');

            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockGuilds);
            expect(dbService.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE gm.user_id = $1'),
                ['user123']
            );
        });
    });

    describe('GET /guilds/:guildId/channels', () => {
        it('should return guild channels', async () => {
            const mockChannels = [{ id: 'chan1', name: 'Channel 1' }];
            (dbService.query as any).mockResolvedValue({ rows: mockChannels });

            const res = await request(app).get('/guilds/guild123/channels');

            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockChannels);
            expect(dbService.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE guild_id = $1'),
                ['guild123']
            );
        });
    });
});
