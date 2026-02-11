import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock pg module
const { mockPoolInstance } = vi.hoisted(() => {
    const mockQuery = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    const mockEnd = vi.fn().mockResolvedValue(undefined);
    return {
        mockPoolInstance: {
            query: mockQuery,
            end: mockEnd,
        }
    };
});

vi.mock('pg', () => {
    return {
        Pool: vi.fn().mockImplementation(function () {
            return mockPoolInstance;
        }),
    };
});

import { Pool } from 'pg';

// Mock fs module
vi.mock('fs', () => ({
    readFileSync: vi.fn().mockReturnValue('CREATE TABLE test ();'),
}));

import { DatabaseService } from './db.service';

describe('DatabaseService', () => {
    let dbService: DatabaseService;

    beforeEach(() => {
        vi.clearAllMocks();
        dbService = new DatabaseService();
    });

    describe('constructor', () => {
        it('should create a Pool with config from env or defaults', () => {
            expect(Pool).toHaveBeenCalledWith(
                expect.objectContaining({
                    user: expect.any(String),
                    host: expect.any(String),
                    database: expect.any(String),
                    password: expect.any(String),
                    port: expect.any(Number),
                })
            );
        });
    });

    describe('query', () => {
        it('should delegate to pool.query with text and params', async () => {
            const mockResult = { rows: [{ id: 1 }], rowCount: 1 };
            const pool = (dbService as any).pool;
            pool.query.mockResolvedValue(mockResult);

            const result = await dbService.query('SELECT * FROM users WHERE id = $1', ['123']);

            expect(pool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', ['123']);
            expect(result).toEqual(mockResult);
        });

        it('should delegate to pool.query without params', async () => {
            const mockResult = { rows: [], rowCount: 0 };
            const pool = (dbService as any).pool;
            pool.query.mockResolvedValue(mockResult);

            const result = await dbService.query('SELECT 1');

            expect(pool.query).toHaveBeenCalledWith('SELECT 1', undefined);
            expect(result).toEqual(mockResult);
        });

        it('should propagate errors from pool.query', async () => {
            const pool = (dbService as any).pool;
            pool.query.mockRejectedValue(new Error('connection refused'));

            await expect(dbService.query('SELECT 1')).rejects.toThrow('connection refused');
        });
    });

    describe('initializeSchema', () => {
        it('should read SQL file and execute it', async () => {
            const pool = (dbService as any).pool;
            pool.query.mockResolvedValue({});

            await dbService.initializeSchema();

            expect(pool.query).toHaveBeenCalledWith('CREATE TABLE test ();');
        });

        it('should throw if schema execution fails', async () => {
            const pool = (dbService as any).pool;
            pool.query.mockRejectedValue(new Error('syntax error'));

            await expect(dbService.initializeSchema()).rejects.toThrow('syntax error');
        });
    });

    describe('close', () => {
        it('should call pool.end()', async () => {
            const pool = (dbService as any).pool;
            pool.end.mockResolvedValue(undefined);

            await dbService.close();

            expect(pool.end).toHaveBeenCalled();
        });
    });
});
