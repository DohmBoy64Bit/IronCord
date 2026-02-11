import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authMiddleware, AuthenticatedRequest } from './auth.middleware';
import jwt from 'jsonwebtoken';

// Mock jwt
vi.mock('jsonwebtoken', () => ({
    default: {
        verify: vi.fn(),
    },
}));

describe('authMiddleware', () => {
    let req: Partial<AuthenticatedRequest>;
    let res: any;
    let next: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        req = { headers: {} };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        };
        next = vi.fn();
    });

    it('should return 401 if no authorization header', () => {
        authMiddleware(req as any, res, next as any);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid authorization header' });
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if header does not start with Bearer', () => {
        req.headers = { authorization: 'Basic abc123' };
        authMiddleware(req as any, res, next as any);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', () => {
        req.headers = { authorization: 'Bearer invalidtoken' };
        (jwt.verify as ReturnType<typeof vi.fn>).mockImplementation(() => {
            throw new Error('invalid token');
        });

        authMiddleware(req as any, res, next as any);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
        expect(next).not.toHaveBeenCalled();
    });

    it('should set req.user and call next on valid token', () => {
        req.headers = { authorization: 'Bearer validtoken' };
        (jwt.verify as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 'user123' });

        authMiddleware(req as any, res, next as any);
        expect(req.user).toEqual({ userId: 'user123' });
        expect(next).toHaveBeenCalled();
    });
});
