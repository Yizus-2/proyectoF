#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SERVER_DIR = path.join(ROOT, 'server')
const ENV_PATH = path.join(ROOT, '.env')
const IS_WIN = process.platform === 'win32'
const IS_LINUX = process.platform === 'linux'

const cmd = process.argv[2] || 'up'

function log(prefix, msg) {
  console.log(`[${prefix}] ${msg}`)
}

function fail(msg) {
  console.error(`\n[ERROR] ${msg}`)
  process.exit(1)
}

function runSync(bin, args, opts = {}) {
  return spawnSync(bin, args, {
    cwd: ROOT,
    stdio: opts.capture ? 'pipe' : 'inherit',
    encoding: 'utf8',
    shell: IS_WIN && (bin === 'npm' || bin === 'npx'),
    ...opts
  })
}

function commandExists(bin, testArgs = ['--version']) {
  const res = spawnSync(bin, testArgs, { stdio: 'ignore', shell: false })
  return res.status === 0
}

function detectContainerRuntime() {
  if (commandExists('docker', ['compose', 'version'])) {
    return { engine: 'docker', compose: ['docker', ['compose']] }
  }
  if (commandExists('docker-compose', ['--version'])) {
    return { engine: 'docker', compose: ['docker-compose', []] }
  }
  if (commandExists('podman', ['compose', 'version'])) {
    return { engine: 'podman', compose: ['podman', ['compose']] }
  }
  if (commandExists('podman-compose', ['--version'])) {
    return { engine: 'podman', compose: ['podman-compose', []] }
  }
  if (commandExists('docker', ['--version'])) {
    return { engine: 'docker', compose: null }
  }
  if (commandExists('podman', ['--version'])) {
    return { engine: 'podman', compose: null }
  }
  return null
}

function parseEnvFile(filePath) {
  const env = {}
  if (!fs.existsSync(filePath)) return env
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let val = line.slice(idx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    env[key] = val
  }
  return env
}

function ensureEnvFile() {
  if (fs.existsSync(ENV_PATH)) {
    return parseEnvFile(ENV_PATH)
  }

  log('SETUP', 'No existe .env — generando configuración local lista para usar...')
  const jwtSecret = crypto.randomBytes(32).toString('hex')
  const content = [
    '# Generado automáticamente por scripts/cli.mjs para desarrollo local',
    'POSTGRES_DB=essmar_sigvi',
    'POSTGRES_USER=essmar_app',
    'POSTGRES_PASSWORD=essmar_local_dev_2026',
    'POSTGRES_PORT=5432',
    'DATABASE_URL=postgres://essmar_app:essmar_local_dev_2026@127.0.0.1:5432/essmar_sigvi',
    '',
    'S3_ENDPOINT=http://127.0.0.1:9000',
    'S3_REGION=us-east-1',
    'S3_BUCKET=essmar-sigvi',
    'S3_ACCESS_KEY=essmar_minio_admin',
    'S3_SECRET_KEY=EssmarMinio2026!',
    'S3_FORCE_PATH_STYLE=true',
    'S3_PORT=9000',
    'S3_CONSOLE_PORT=9001',
    '',
    'MAIL_PROVIDER=mailpit',
    'MAILPIT_HOST=127.0.0.1',
    'MAILPIT_PORT=1025',
    'MAILPIT_UI_PORT=8025',
    'GMAIL_USER=',
    'GMAIL_APP_PASSWORD=',
    'GMAIL_CLIENT_ID=',
    'GMAIL_CLIENT_SECRET=',
    'GMAIL_REFRESH_TOKEN=',
    'SMTP_HOST=127.0.0.1',
    'SMTP_PORT=1025',
    'SMTP_SECURE=false',
    'SMTP_USER=',
    'SMTP_PASS=',
    'SMTP_FROM="ESSMAR SIGVI <notificaciones@essmar.local>"',
    'PUBLIC_APP_URL=http://127.0.0.1:5173',
    '',
    'API_PORT=3001',
    `JWT_SECRET=${jwtSecret}`,
    'CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173',
    '',
    'SEED_ADMIN_EMAIL=admin@essmar.gov.co',
    'SEED_ADMIN_PASSWORD=AdminEssmar2026!',
    'SEED_SUPERVISOR_EMAIL=supervisor@essmar.gov.co',
    'SEED_SUPERVISOR_PASSWORD=SupervisorEssmar2026!',
    'SEED_OPERATOR_PASSWORD=OperarioEssmar2026!',
    '',
    'VITE_API_BASE_URL='
  ].join('\n') + '\n'

  fs.writeFileSync(ENV_PATH, content, 'utf8')
  log('SETUP', '.env creado con JWT_SECRET aleatorio.')
  return parseEnvFile(ENV_PATH)
}

function ensureDependencies() {
  if (!fs.existsSync(path.join(ROOT, 'node_modules'))) {
    log('SETUP', 'Instalando dependencias del frontend...')
    const r = runSync('npm', ['install', '--no-audit', '--no-fund'], { cwd: ROOT })
    if (r.status !== 0) fail('Falló npm install en el frontend.')
  }
  if (!fs.existsSync(path.join(SERVER_DIR, 'node_modules'))) {
    log('SETUP', 'Instalando dependencias del backend...')
    const r = runSync('npm', ['install', '--no-audit', '--no-fund'], { cwd: SERVER_DIR })
    if (r.status !== 0) fail('Falló npm install en server/.')
  }
}

function containerState(engine, name) {
  const res = runSync(engine, ['ps', '-a', '--filter', `name=^${name}$`, '--format', '{{.State}}'], { capture: true })
  if (res.status !== 0) return null
  return (res.stdout || '').trim().split(/\r?\n/)[0] || null
}

function ensureSingleContainer(engine, { name, runArgs }) {
  const state = containerState(engine, name)
  if (state === 'running') {
    log('INFRA', `${name}: ya está corriendo`)
    return
  }
  if (state) {
    log('INFRA', `${name}: iniciando contenedor existente...`)
    const r = runSync(engine, ['start', name])
    if (r.status !== 0) fail(`No se pudo iniciar ${name}`)
    return
  }
  log('INFRA', `${name}: creando contenedor...`)
  const r = runSync(engine, ['run', '-d', '--name', name, ...runArgs])
  if (r.status !== 0) fail(`No se pudo crear ${name}`)
}

function startInfra(runtime, env) {
  if (!runtime) {
    fail('No se detectó Docker ni Podman. Instala Docker Desktop (Windows/macOS) o Podman/Docker (Linux).')
  }

  const expected = ['essmar-sigvi-postgres', 'essmar-sigvi-minio', 'essmar-sigvi-mailpit']
  if (expected.every((name) => containerState(runtime.engine, name) === 'running')) {
    log('INFRA', 'Postgres, MinIO S3 y Mailpit ya están corriendo.')
    return
  }

  if (runtime.compose) {
    const [bin, baseArgs] = runtime.compose
    log('INFRA', `Levantando Postgres, MinIO S3 y Mailpit con ${bin} ${baseArgs.join(' ')}...`)
    const r = runSync(bin, [...baseArgs, 'up', '-d', 'postgres', 'minio', 'mailpit'])
    if (r.status !== 0) fail('Falló el arranque de contenedores con compose.')
    return
  }

  // Fallback directo con docker/podman sin plugin compose
  const engine = runtime.engine
  const selinux = engine === 'podman' && IS_LINUX ? ',Z' : ''
  const pgPort = env.POSTGRES_PORT || '5432'
  const pgDb = env.POSTGRES_DB || 'essmar_sigvi'
  const pgUser = env.POSTGRES_USER || 'essmar_app'
  const pgPass = env.POSTGRES_PASSWORD || 'essmar_local_dev_2026'
  const s3Port = env.S3_PORT || '9000'
  const s3ConsolePort = env.S3_CONSOLE_PORT || '9001'
  const s3Key = env.S3_ACCESS_KEY || 'essmar_minio_admin'
  const s3Secret = env.S3_SECRET_KEY || 'EssmarMinio2026!'
  const smtpPort = env.MAILPIT_PORT || '1025'
  const mailUiPort = env.MAILPIT_UI_PORT || '8025'
  const initDir = path.join(ROOT, 'db', 'init')

  runSync(engine, ['volume', 'create', 'essmar_pgdata'], { capture: true })
  runSync(engine, ['volume', 'create', 'essmar_minio_data'], { capture: true })

  ensureSingleContainer(engine, {
    name: 'essmar-sigvi-postgres',
    runArgs: [
      '-e', `POSTGRES_DB=${pgDb}`,
      '-e', `POSTGRES_USER=${pgUser}`,
      '-e', `POSTGRES_PASSWORD=${pgPass}`,
      '-e', 'TZ=America/Bogota',
      '-p', `127.0.0.1:${pgPort}:5432`,
      '-v', 'essmar_pgdata:/var/lib/postgresql/data',
      '-v', `${initDir}:/docker-entrypoint-initdb.d:ro${selinux}`,
      'docker.io/library/postgres:17-alpine'
    ]
  })

  ensureSingleContainer(engine, {
    name: 'essmar-sigvi-minio',
    runArgs: [
      '-e', `MINIO_ROOT_USER=${s3Key}`,
      '-e', `MINIO_ROOT_PASSWORD=${s3Secret}`,
      '-p', `127.0.0.1:${s3Port}:9000`,
      '-p', `127.0.0.1:${s3ConsolePort}:9001`,
      '-v', 'essmar_minio_data:/data',
      'cgr.dev/chainguard/minio:latest',
      'server', '/data', '--console-address', ':9001'
    ]
  })

  ensureSingleContainer(engine, {
    name: 'essmar-sigvi-mailpit',
    runArgs: [
      '-p', `127.0.0.1:${smtpPort}:1025`,
      '-p', `127.0.0.1:${mailUiPort}:8025`,
      'docker.io/axllent/mailpit:latest'
    ]
  })
}

function stopInfra(runtime, { removeVolumes = false } = {}) {
  if (!runtime) fail('No se detectó Docker ni Podman.')

  if (runtime.compose) {
    const [bin, baseArgs] = runtime.compose
    const args = [...baseArgs, 'down', ...(removeVolumes ? ['-v'] : [])]
    log('INFRA', `Ejecutando ${bin} ${args.join(' ')}...`)
    runSync(bin, args)
    return
  }

  const engine = runtime.engine
  for (const name of ['essmar-sigvi-postgres', 'essmar-sigvi-minio', 'essmar-sigvi-mailpit']) {
    if (removeVolumes) {
      runSync(engine, ['rm', '-f', name], { capture: true })
    } else {
      runSync(engine, ['stop', name], { capture: true })
    }
  }
  if (removeVolumes) {
    runSync(engine, ['volume', 'rm', '-f', 'essmar_pgdata', 'essmar_minio_data'], { capture: true })
    log('INFRA', 'Contenedores y volúmenes eliminados.')
  } else {
    log('INFRA', 'Contenedores detenidos (datos preservados).')
  }
}

function waitForTcp(host, port, timeoutMs = 30000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const sock = net.createConnection({ host, port })
      sock.once('connect', () => {
        sock.destroy()
        resolve(true)
      })
      sock.once('error', () => {
        sock.destroy()
        if (Date.now() - start >= timeoutMs) {
          reject(new Error(`Timeout esperando ${host}:${port}`))
        } else {
          setTimeout(attempt, 500)
        }
      })
    }
    attempt()
  })
}

async function waitForHttp(url, timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return true
    } catch {
      // Retry
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Timeout esperando ${url}`)
}

async function waitForInfraReady(env) {
  const pgPort = Number(env.POSTGRES_PORT || 5432)
  const s3Port = Number(env.S3_PORT || 9000)
  const mailUiPort = Number(env.MAILPIT_UI_PORT || 8025)

  log('WAIT', 'Esperando que Postgres, MinIO S3 y Mailpit estén listos...')
  await Promise.all([
    waitForTcp('127.0.0.1', pgPort, 35000),
    waitForHttp(`http://127.0.0.1:${s3Port}/minio/health/live`, 35000),
    waitForHttp(`http://127.0.0.1:${mailUiPort}/api/v1/info`, 35000)
  ])
  log('WAIT', 'Infraestructura lista.')
}

function spawnPrefixed(label, bin, args, cwd) {
  const child = spawn(bin, args, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: IS_WIN && (bin === 'npm' || bin === 'npx')
  })

  const forward = (stream, isErr) => {
    let buffer = ''
    stream.on('data', (chunk) => {
      buffer += chunk.toString()
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (line.trim()) {
          ;(isErr ? console.error : console.log)(`[${label}] ${line}`)
        }
      }
    })
  }

  forward(child.stdout, false)
  forward(child.stderr, true)
  return child
}

async function runDoctor() {
  const runtime = detectContainerRuntime()
  const env = fs.existsSync(ENV_PATH) ? parseEnvFile(ENV_PATH) : {}
  const check = async (name, fn) => {
    try {
      const detail = await fn()
      console.log(`  OK   ${name.padEnd(22)} ${detail}`)
    } catch (err) {
      console.log(`  FAIL ${name.padEnd(22)} ${err.message}`)
    }
  }

  console.log('\n=== ESSMAR SIGVI — Diagnóstico de Entorno ===')
  console.log(`  SO: ${process.platform} (${process.arch}) | Node: ${process.version}`)
  await check('Motor contenedores', () => {
    if (!runtime) throw new Error('Ni Docker ni Podman instalados')
    return runtime.compose ? `${runtime.engine} (con compose)` : `${runtime.engine} (CLI directo)`
  })
  await check('Archivo .env', () => {
    if (!fs.existsSync(ENV_PATH)) throw new Error('No existe (ejecuta npm run setup)')
    return `presente (MAIL_PROVIDER=${env.MAIL_PROVIDER || 'mailpit'})`
  })
  await check('Dependencias', () => {
    const okRoot = fs.existsSync(path.join(ROOT, 'node_modules'))
    const okSrv = fs.existsSync(path.join(SERVER_DIR, 'node_modules'))
    if (!okRoot || !okSrv) throw new Error('Faltan node_modules (ejecuta npm run setup)')
    return 'frontend y server instalados'
  })
  await check('PostgreSQL 17', async () => {
    await waitForTcp('127.0.0.1', Number(env.POSTGRES_PORT || 5432), 1500)
    return `127.0.0.1:${env.POSTGRES_PORT || 5432}`
  })
  await check('MinIO S3', async () => {
    await waitForHttp(`http://127.0.0.1:${env.S3_PORT || 9000}/minio/health/live`, 1500)
    return `http://127.0.0.1:${env.S3_PORT || 9000} (Consola :${env.S3_CONSOLE_PORT || 9001})`
  })
  await check('Mailpit SMTP', async () => {
    await waitForHttp(`http://127.0.0.1:${env.MAILPIT_UI_PORT || 8025}/api/v1/info`, 1500)
    return `SMTP :${env.MAILPIT_PORT || 1025} | UI http://127.0.0.1:${env.MAILPIT_UI_PORT || 8025}`
  })
  await check('Backend API', async () => {
    const res = await fetch(`http://127.0.0.1:${env.API_PORT || 3001}/api/health`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return `${data.status} | db=${data.database} | s3=${data.bucket} | mail=${data.mail}`
  })
  await check('Frontend Vite', async () => {
    const res = await fetch('http://127.0.0.1:5173/')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return 'http://127.0.0.1:5173'
  })
  console.log('')
}

async function runUp() {
  const env = ensureEnvFile()
  ensureDependencies()
  const runtime = detectContainerRuntime()
  startInfra(runtime, env)
  await waitForInfraReady(env)

  const apiPort = Number(env.API_PORT || 3001)
  const children = []

  // Verificar si la API ya está corriendo en ese puerto
  let apiAlreadyUp = false
  try {
    const res = await fetch(`http://127.0.0.1:${apiPort}/api/health`)
    apiAlreadyUp = res.ok
  } catch {
    apiAlreadyUp = false
  }

  if (apiAlreadyUp) {
    log('API', `Ya existe una instancia respondiendo en http://127.0.0.1:${apiPort}`)
  } else {
    log('API', 'Iniciando servidor Express...')
    children.push(spawnPrefixed('API', process.execPath, ['src/index.js'], SERVER_DIR))
    await waitForHttp(`http://127.0.0.1:${apiPort}/api/health`, 25000)
  }

  let webAlreadyUp = false
  try {
    const res = await fetch('http://127.0.0.1:5173/')
    webAlreadyUp = res.ok
  } catch {
    webAlreadyUp = false
  }

  if (webAlreadyUp) {
    log('WEB', 'Ya existe una instancia respondiendo en http://127.0.0.1:5173')
  } else {
    log('WEB', 'Iniciando Vite dev server...')
    const viteBin = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')
    children.push(spawnPrefixed('WEB', process.execPath, [viteBin, '--host', '127.0.0.1', '--port', '5173'], ROOT))
    await waitForHttp('http://127.0.0.1:5173/', 25000)
  }

  console.log('\n==============================================================')
  console.log('  ESSMAR SIGVI — Entorno local activo')
  console.log('==============================================================')
  console.log('  App Web:        http://127.0.0.1:5173')
  console.log(`  API / Health:   http://127.0.0.1:${apiPort}/api/health`)
  console.log(`  MinIO Consola:  http://127.0.0.1:${env.S3_CONSOLE_PORT || 9001} (${env.S3_ACCESS_KEY || 'essmar_minio_admin'})`)
  console.log(`  Mailpit Bandeja:http://127.0.0.1:${env.MAILPIT_UI_PORT || 8025}`)
  console.log(`  PostgreSQL:     127.0.0.1:${env.POSTGRES_PORT || 5432} / db=${env.POSTGRES_DB || 'essmar_sigvi'}`)
  console.log('--------------------------------------------------------------')
  console.log(`  Admin:          ${env.SEED_ADMIN_EMAIL || 'admin@essmar.gov.co'} / ${env.SEED_ADMIN_PASSWORD || 'AdminEssmar2026!'}`)
  console.log(`  Supervisor:     ${env.SEED_SUPERVISOR_EMAIL || 'supervisor@essmar.gov.co'} / ${env.SEED_SUPERVISOR_PASSWORD || 'SupervisorEssmar2026!'}`)
  console.log(`  Operarios 1-10: operador1@essmar.co .. operador10@essmar.co / ${env.SEED_OPERATOR_PASSWORD || 'OperarioEssmar2026!'}`)
  console.log('==============================================================')

  if (children.length === 0) {
    console.log('Todos los servicios ya estaban activos.')
    return
  }

  console.log('Presiona Ctrl+C para detener API y Frontend (los contenedores siguen corriendo).\n')

  const shutdown = () => {
    console.log('\nDeteniendo servicios locales...')
    for (const ch of children) {
      try {
        ch.kill('SIGTERM')
      } catch {
        // Ignore
      }
    }
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

async function main() {
  switch (cmd) {
    case 'setup': {
      ensureEnvFile()
      ensureDependencies()
      log('SETUP', 'Listo. Ejecuta "npm run up" para levantar todo el stack.')
      break
    }
    case 'infra:up': {
      const env = ensureEnvFile()
      const runtime = detectContainerRuntime()
      startInfra(runtime, env)
      await waitForInfraReady(env)
      break
    }
    case 'infra:down': {
      stopInfra(detectContainerRuntime(), { removeVolumes: false })
      break
    }
    case 'infra:reset': {
      stopInfra(detectContainerRuntime(), { removeVolumes: true })
      break
    }
    case 'doctor': {
      await runDoctor()
      break
    }
    case 'up':
    default: {
      await runUp()
      break
    }
  }
}

main().catch((err) => fail(err.message || String(err)))
