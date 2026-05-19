import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zyltfrvtgvacodbhzmhr.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_u5oH85wRHyNEuDjfJzjWbQ_5SAeSzOV'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function createOp() {
  console.log('Registrando usuario...')
  const email = 'operador@essmar.gov.co'
  const password = 'Password123!'

  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email,
    password
  })

  if (authErr) {
    console.error('Error creando usuario Auth:', authErr)
    return
  }

  console.log('Usuario creado en Auth:', authData.user?.id)

  // Esperar un momento para que el trigger de Postgres cree el perfil
  await new Promise(r => setTimeout(r, 2000))

  console.log('Actualizando rol a operator en profiles...')
  const { data: profileData, error: profileErr } = await supabase
    .from('profiles')
    .update({ role: 'operator', full_name: 'Jefe de Cuadrilla' })
    .eq('id', authData.user.id)

  if (profileErr) {
    console.error('Error actualizando perfil:', profileErr)
  } else {
    console.log('Usuario Operador creado y configurado exitosamente!')
    console.log(`Email: ${email}`)
    console.log(`Password: ${password}`)
  }
}

createOp()
