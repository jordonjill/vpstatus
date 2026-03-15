import type { Env } from '../types';
import { D1_SCHEMAS } from './schema';
import { hashPassword } from '../auth/password';
import { getAdminConfig } from '../config';

export async function ensureTablesExist(db: D1Database, env: Env): Promise<void> {
  try {
    const createTableStatements = Object.values(D1_SCHEMAS).map(sql => db.prepare(sql));
    await db.batch(createTableStatements);
  } catch {
    // Silently ignore database creation errors
  }

  await createDefaultAdmin(db, env);
  await applySchemaAlterations(db);
}

export async function applySchemaAlterations(db: D1Database): Promise<void> {
  const alterStatements = [
    'ALTER TABLE metrics ADD COLUMN uptime INTEGER DEFAULT NULL',
    'ALTER TABLE admin_credentials ADD COLUMN password_hash TEXT',
    'ALTER TABLE admin_credentials ADD COLUMN created_at INTEGER',
    'ALTER TABLE admin_credentials ADD COLUMN last_login INTEGER',
    'ALTER TABLE admin_credentials ADD COLUMN failed_attempts INTEGER DEFAULT 0',
    'ALTER TABLE admin_credentials ADD COLUMN locked_until INTEGER DEFAULT NULL',
    'ALTER TABLE admin_credentials ADD COLUMN must_change_password INTEGER DEFAULT 0',
    'ALTER TABLE admin_credentials ADD COLUMN password_changed_at INTEGER DEFAULT NULL',
    'ALTER TABLE servers ADD COLUMN is_public INTEGER DEFAULT 1',
    'ALTER TABLE monitored_sites ADD COLUMN is_public INTEGER DEFAULT 1',
  ];

  for (const alterSql of alterStatements) {
    try {
      await db.exec(alterSql);
    } catch {
      // Silently ignore duplicate column errors
    }
  }
}

export async function createDefaultAdmin(db: D1Database, env: Env): Promise<void> {
  try {
    const adminConfig = getAdminConfig(env);
    // No hardcoded default admin. Seed only when both env values are explicitly provided.
    if (!adminConfig.USERNAME || !adminConfig.PASSWORD) {
      return;
    }

    const adminExists = await db
      .prepare('SELECT username FROM admin_credentials WHERE username = ?')
      .bind(adminConfig.USERNAME)
      .first<{ username: string }>();

    if (!adminExists) {
      const adminPasswordHash = await hashPassword(adminConfig.PASSWORD);
      const now = Math.floor(Date.now() / 1000);

      await db
        .prepare(`
          INSERT INTO admin_credentials (username, password_hash, created_at, failed_attempts, must_change_password)
          VALUES (?, ?, ?, 0, 0)
        `)
        .bind(adminConfig.USERNAME, adminPasswordHash, now)
        .run();
    }
  } catch (error) {
    if (error instanceof Error && !error.message.includes('no such table')) {
      throw error;
    }
  }
}
