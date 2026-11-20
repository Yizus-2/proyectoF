const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const TOKEN_STORAGE_KEY = 'essmar_auth_token'

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setAuthToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token)
    else localStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    // Ignore storage errors in restricted environments
  }
}

export function getAssetUrl(assetPath: string | null | undefined): string | null {
  if (!assetPath) return null
  if (/^https?:\/\//i.test(assetPath)) return assetPath
  const normalized = assetPath.startsWith('/') ? assetPath : `/${assetPath}`
  return `${API_BASE}${normalized}`
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {})
  const token = getAuthToken()
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const isFormData = options.body instanceof FormData
  if (!isFormData && options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  })

  const contentType = res.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await res.json().catch(() => null)
    : await res.text().catch(() => '')

  if (!res.ok) {
    const message =
      (payload && typeof payload === 'object' && 'error' in payload && String((payload as any).error)) ||
      (typeof payload === 'string' && payload) ||
      `Error HTTP ${res.status}`
    throw new Error(message)
  }

  return payload as T
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined
    }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  download: async (
    path: string,
    { method = 'GET', body, fallbackFilename = 'documento.pdf' }: { method?: 'GET' | 'POST'; body?: unknown; fallbackFilename?: string } = {}
  ) => {
    const headers = new Headers()
    const token = getAuthToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
    if (body !== undefined) headers.set('Content-Type', 'application/json')

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    })

    if (!res.ok) {
      const errPayload = await res.json().catch(() => null)
      throw new Error(errPayload?.error || `Error HTTP ${res.status}`)
    }

    const blob = await res.blob()
    const disposition = res.headers.get('Content-Disposition') || ''
    const match = disposition.match(/filename="?([^"]+)"?/i)
    const fileName = match?.[1] || fallbackFilename

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)

    return {
      fileName,
      sha256: res.headers.get('X-Document-SHA256'),
      s3Key: res.headers.get('X-S3-Key'),
      documentId: res.headers.get('X-Document-Id')
    }
  },
  eventsUrl: () => {
    const token = getAuthToken()
    const query = token ? `?token=${encodeURIComponent(token)}` : ''
    return `${API_BASE}/api/events${query}`
  }
}
