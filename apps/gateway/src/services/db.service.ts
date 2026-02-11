import { Pool, QueryResult, QueryResultRow } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

export class DatabaseService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER || 'ironcord',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'ironcord',
      password: process.env.DB_PASSWORD || 'ironcord_password',
      port: parseInt(process.env.DB_PORT || '5432', 10),
    });
  }

  public async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  public async initializeSchema(): Promise<void> {
    const schemaPath = path.join(__dirname, '../db/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    try {
      await this.pool.query(schemaSql);
      console.log('Database schema initialized successfully');
    } catch (err) {
      console.error('Error initializing database schema:', err);
      throw err;
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}

export const dbService = new DatabaseService();
