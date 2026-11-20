const clients = new Set()

export function addSseClient(res) {
  clients.add(res)
  res.on('close', () => {
    clients.delete(res)
  })
}

export function broadcastEvent(eventName, payload) {
  const serialized = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`
  for (const res of clients) {
    try {
      res.write(serialized)
    } catch {
      clients.delete(res)
    }
  }
}
