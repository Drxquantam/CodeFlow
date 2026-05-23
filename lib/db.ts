import { Pool } from "pg";

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

export type DbSubmission = {
  id: string;
  session_id: string;
  language: string;
  code: string;
  stdin: string;
  output: string;
  runtime: string;
  memory: string;
  verdict: string;
  created_at: string;
};

export function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.DATABASE_URL.includes("localhost") ||
        process.env.DATABASE_URL.includes("127.0.0.1")
          ? false
          : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }

  return pool;
}

export async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = getPool()
      .query(
        `
        create table if not exists submissions (
          id uuid primary key,
          session_id text not null,
          language text not null,
          code text not null,
          stdin text not null default '',
          output text not null default '',
          runtime text not null default '0 ms',
          memory text not null default 'n/a',
          verdict text not null,
          created_at timestamptz not null default now()
        );

        create index if not exists submissions_session_created_idx
          on submissions (session_id, created_at desc);
        `,
      )
      .then(() => undefined);
  }

  return schemaReady;
}
