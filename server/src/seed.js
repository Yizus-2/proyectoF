import { pool } from './db.js'
import { hashPassword } from './auth.js'

export async function seedDatabase() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@essmar.gov.co'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'AdminEssmar2026!'
  const supervisorEmail = process.env.SEED_SUPERVISOR_EMAIL || 'supervisor@essmar.gov.co'
  const supervisorPassword = process.env.SEED_SUPERVISOR_PASSWORD || 'SupervisorEssmar2026!'
  const operatorPassword = process.env.SEED_OPERATOR_PASSWORD || 'OperarioEssmar2026!'

  // 1. Admin
  await pool.query(
    `INSERT INTO public.users (email, password_hash, full_name, role)
     VALUES ($1, $2, 'Administrador ESSMAR', 'admin')
     ON CONFLICT (email) DO NOTHING`,
    [adminEmail, hashPassword(adminPassword)]
  )

  // 2. Supervisor
  await pool.query(
    `INSERT INTO public.users (email, password_hash, full_name, role)
     VALUES ($1, $2, 'Supervisor de Campo ESSMAR', 'supervisor')
     ON CONFLICT (email) DO NOTHING`,
    [supervisorEmail, hashPassword(supervisorPassword)]
  )

  // 3. 10 Operarios vinculados a sus cuadrillas
  const { rows: crews } = await pool.query('SELECT id, name, zone_id FROM public.crews ORDER BY id ASC LIMIT 10')
  let idx = 1
  for (const crew of crews) {
    const email = `operador${idx}@essmar.co`
    await pool.query(
      `INSERT INTO public.users (email, password_hash, full_name, role, zone_id, crew_id)
       VALUES ($1, $2, $3, 'operator', $4, $5)
       ON CONFLICT (email) DO UPDATE SET
         zone_id = COALESCE(public.users.zone_id, EXCLUDED.zone_id),
         crew_id = COALESCE(public.users.crew_id, EXCLUDED.crew_id)`,
      [email, hashPassword(operatorPassword), `Operario - ${crew.name}`, crew.zone_id, crew.id]
    )
    idx++
  }

  // 4. Reportes de demostración solo si la tabla está vacía
  const { rows: countRows } = await pool.query('SELECT COUNT(*)::int AS total FROM public.reports')
  if (countRows[0].total === 0) {
    const { rows: zones } = await pool.query('SELECT id, code FROM public.zones')
    const zoneByCode = Object.fromEntries(zones.map(z => [z.code, z.id]))

    const demoReports = [
      {
        reporter_name: 'María Fernanda López',
        reporter_phone: '3005551001',
        reporter_email: 'maria.demo@example.com',
        category: 'tuberia_rota',
        priority: 'CRITICA',
        description: 'Ruptura de tubería matriz con gran fuga de agua potable sobre la vía principal.',
        address: 'Calle 15 # 4-28, Centro Histórico',
        sector: 'Centro Histórico',
        zone_id: zoneByCode['ZONA-01'],
        lat: 11.2442,
        lng: -74.2121,
        source: 'WEB',
        autoAssign: true
      },
      {
        reporter_name: 'Carlos Eduardo Méndez',
        reporter_phone: '3015551002',
        reporter_email: 'carlos.demo@example.com',
        category: 'fuga_alcantarillado',
        priority: 'ALTA',
        description: 'Rebose de alcantarillado frente a locales comerciales.',
        address: 'Carrera 2 # 11-40, El Rodadero',
        sector: 'El Rodadero',
        zone_id: zoneByCode['ZONA-02'],
        lat: 11.2035,
        lng: -74.2271,
        source: 'WHATSAPP',
        autoAssign: true
      },
      {
        reporter_name: 'Ana Lucía Ríos',
        reporter_phone: '3105551003',
        reporter_email: null,
        category: 'fuga_agua',
        priority: 'MEDIA',
        description: 'Fuga constante en registro domiciliario en la esquina.',
        address: 'Diagonal 32 # 8-15, Mamatoco',
        sector: 'Mamatoco',
        zone_id: zoneByCode['ZONA-03'],
        lat: 11.2265,
        lng: -74.1801,
        source: 'APP_MOVIL',
        autoAssign: false
      },
      {
        reporter_name: 'Jorge Eliécer Torres',
        reporter_phone: '3155551004',
        reporter_email: 'jorge.demo@example.com',
        category: 'dano_pavimento',
        priority: 'BAJA',
        description: 'Hundimiento leve de calzada tras reparación anterior.',
        address: 'Calle 9 # 18-22, Pescaíto',
        sector: 'Pescaíto',
        zone_id: zoneByCode['ZONA-09'],
        lat: 11.2504,
        lng: -74.2119,
        source: 'TELEFONO',
        autoAssign: false
      }
    ]

    for (const r of demoReports) {
      const { rows } = await pool.query(
        `INSERT INTO public.reports (
          reporter_name, reporter_phone, reporter_email,
          category, priority, description, address, sector, zone_id, lat, lng, source
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING id`,
        [
          r.reporter_name,
          r.reporter_phone,
          r.reporter_email,
          r.category,
          r.priority,
          r.description,
          r.address,
          r.sector,
          r.zone_id,
          r.lat,
          r.lng,
          r.source
        ]
      )
      if (r.autoAssign && rows[0]) {
        await pool.query('SELECT public.assign_crew_automatically($1)', [rows[0].id])
      }
    }
  }

  console.log('Seed completado correctamente.')
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error en seed:', err)
      process.exit(1)
    })
}
