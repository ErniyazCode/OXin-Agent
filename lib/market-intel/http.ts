type FetchOptions = {
  method?: string
  headers?: Record<string, string>
  body?: string
  timeoutMs?: number
}

export async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 7000)

  try {
    const response = await fetch(url, {
      method: options.method ?? (options.body ? "POST" : "GET"),
      headers: options.headers,
      body: options.body,
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }

    return (await response.json()) as T
  } finally {
    clearTimeout(timeout)
  }
}
