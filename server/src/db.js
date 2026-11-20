import pg from 'pg'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const { Pool, types } = pg

// Parsear BIGINT (OID 20) y NUMERIC (OID 1700) como números JS para consistencia estricta con TypeScript
types.setTypeParser(20, (val) => (val === null ? null : Number(val)))
types.setTypeParser(1700, (val) => (val === null ? null : Number(val)))

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://essmar_app:essmar_local_dev_2026@127.0.0.1:5432/essmar_sigvi',
  max: 15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
})

/**
 * Ejecuta una transacción estableciendo variables de contexto de auditoría
 * para los triggers de PostgreSQL (app.current_user_id, app.status_change_notes).
 */
export async function withTransaction(fn, { userId = null, notes = null } = {}) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    if (userId) {
      await client.query("SELECT set_config('app.current_user_id', $1, true)", [String(userId)])
    }
    if (notes) {
      await client.query("SELECT set_config('app.status_change_notes', $1, true)", [String(notes)])
    }
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
