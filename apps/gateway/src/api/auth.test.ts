import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRouter from './auth';
import { dbService } from '../services/db.service';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock dbService
vi.mock('../services/db.service', () => ({
    dbService: {
        query: vi.fn(),
    },
}));

// Mock bcrypt
vi.mock('bcryptjs', () => ({
    default: {
        hash: vi.fn(),
        compare: vi.fn(),
    },
}));

// Mock jwt
vi.mock('jsonwebtoken', () => ({
    default: {
        sign: vi.fn(),
    },
}));

const app = express();
app.use(express.json());
app.use('/auth', authRouter);

describe('Auth Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /auth/register', () => {
        it('should register a new user and return a token', async () => {
            const mockUser = { id: 'user123', email: 'test@example.com', irc_nick: 'tester' };
            (bcrypt.hash as any).mockResolvedValue('hashedPassword');
            (dbService.query as any).mockResolvedValue({ rows: [mockUser] });
            (jwt.sign as any).mockReturnValue('mockToken');

            const res = await request(app)
                .post('/auth/register')
                .send({ email: 'test@example.com', password: 'password123', irc_nick: 'tester' });

            expect(res.status).toBe(201);
            expect(res.body).toEqual({
                success: true,
                user: mockUser,
                token: 'mockToken',
            });
            expect(dbService.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO users'),
                ['test@example.com', 'hashedPassword', 'tester']
            );
        });

        it('should return 400 if required fields are missing', async () => {
            const res = await request(app)
                .post('/auth/register')
                .send({ email: 'test@example.com' });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Missing required fields');
        });

        it('should return 500 if database query fails', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => { });
            (bcrypt.hash as any).mockResolvedValue('hashedPassword');
            (dbService.query as any).mockRejectedValue(new Error('DB Error'));

            const res = await request(app)
                .post('/auth/register')
                .send({ email: 'test@example.com', password: 'password123', irc_nick: 'tester' });

            expect(res.status).toBe(500);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Failed to register user');
        });
    });

    describe('POST /auth/login', () => {
        it('should login and return a token for valid credentials', async () => {
            const mockUser = {
                id: 'user123',
                email: 'test@example.com',
                irc_nick: 'tester',
                password_hash: 'hashedPassword',
            };
            (dbService.query as any).mockResolvedValue({ rows: [mockUser] });
            (bcrypt.compare as any).mockResolvedValue(true);
            (jwt.sign as any).mockReturnValue('mockToken');

            const res = await request(app)
                .post('/auth/login')
                .send({ email: 'test@example.com', password: 'password123' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.token).toBe('mockToken');
            expect(res.body.user).not.toHaveProperty('password_hash');
            expect(res.body.user.id).toBe('user123');
        });

        it('should return 401 for invalid credentials', async () => {
            (dbService.query as any).mockResolvedValue({ rows: [] });

            const res = await request(app)
                .post('/auth/login')
                .send({ email: 'test@example.com', password: 'wrongpassword' });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Invalid email or password');
        });

        it('should return 500 if login process fails', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => { });
            (dbService.query as any).mockRejectedValue(new Error('DB Error'));

            const res = await request(app)
                .post('/auth/login')
                .send({ email: 'test@example.com', password: 'password123' });

            expect(res.status).toBe(500);
            expect(res.body.success).toBe(false);
        });
    });
});
