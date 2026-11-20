import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { pool } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'essmar_dev_only_change_in_prod'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h'

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derived = crypto.scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${derived}`
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.startsWith('scrypt$')) return false
  const [, salt, originalHex] = storedHash.split('$')
  if (!salt || !originalHex) return false
  const derived = crypto.scryptSync(password, salt, 64)
  const original = Buffer.from(originalHex, 'hex')
  if (derived.length !== original.length) return false
  return crypto.timingSafeEqual(derived, original)
}

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET)
}

function extractBearerToken(req) {
  const header = req.headers.authorization || ''
  if (header.startsWith('Bearer ')) {
    return header.slice(7).trim()
  }
  if (typeof req.query.token === 'string' && req.query.token.trim()) {
    return req.query.token.trim()
  }
  return null
}

async function resolveUserFromRequest(req) {
  const token = extractBearerToken(req)
  if (!token) return null
  try {
    const decoded = verifyToken(token)
    const { rows } = await pool.query(
      'SELECT id, email, full_name, phone, role, zone_id, crew_id, is_active FROM public.users WHERE id = $1',
      [decoded.sub]
    )
    const user = rows[0]
    if (!user || !user.is_active) return null
    return user
  } catch {
    return null
  }
}

export async function optionalAuth(req, _res, next) {
  req.user = await resolveUserFromRequest(req)
  next()
}

export async function requireAuth(req, res, next) {
  const user = await resolveUserFromRequest(req)
  if (!user) {
    return res.status(401).json({ error: 'No autenticado o sesión expirada.' })
  }
  req.user = user
  next()
}

export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado.' })
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tienes permisos para realizar esta acción.' })
    }
    next()
  }
}
