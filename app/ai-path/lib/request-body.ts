export type BoundedJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; error: 'invalid_json' | 'request_too_large'; status: 400 | 413 }

/** Reads a request body without ever buffering more than the configured limit. */
export async function readBoundedJson(request: Request, maximumBytes: number): Promise<BoundedJsonResult> {
  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    return { ok: false, error: 'request_too_large', status: 413 }
  }
  if (!request.body) return { ok: false, error: 'invalid_json', status: 400 }

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    totalBytes += value.byteLength
    if (totalBytes > maximumBytes) {
      await reader.cancel('request body limit exceeded')
      return { ok: false, error: 'request_too_large', status: 413 }
    }
    chunks.push(value)
  }

  const bytes = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) }
  } catch {
    return { ok: false, error: 'invalid_json', status: 400 }
  }
}
