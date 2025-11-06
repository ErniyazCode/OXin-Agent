export class TTLCache<T> {
  private readonly store = new Map<string, { value: T; expiresAt: number }>()

  constructor(private readonly defaultTtlMs = 60_000) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: string, value: T, ttlMs?: number) {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs)
    this.store.set(key, { value, expiresAt })
  }

  delete(key: string) {
    this.store.delete(key)
  }
}

export const sharedCache = new TTLCache<unknown>()
