// Cache en memoria de proceso con TTL manual. Las hojas de asientos pesan más
// de 2 MB serializadas, así que no sirve un cache de plataforma con ese límite.
// Las promesas en vuelo se comparten para no leer la misma hoja dos veces.
const store = new Map()

export async function memo(key, ttlMs, loader) {
  const hit = store.get(key)
  const now = Date.now()
  if (hit && hit.expires > now) return hit.promise

  const promise = loader().catch((err) => {
    // No dejar un error cacheado: el próximo request reintenta.
    if (store.get(key)?.promise === promise) store.delete(key)
    throw err
  })
  store.set(key, { promise, expires: now + ttlMs })
  return promise
}

export function clearCache() {
  store.clear()
}
