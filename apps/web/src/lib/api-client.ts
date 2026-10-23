import { errorResponseSchema } from '@canteen/shared'
import type { z } from 'zod'
import { ApiError } from './api-error'

type ClientConfig = {
  getToken?: () => string | null
  onUnauthorized?: () => void
}

let config: ClientConfig = {}

export function configureApiClient(options: ClientConfig): void {
  config = { ...options }
}

export type RequestOptions<T> = {
  schema: z.ZodType<T>
  body?: unknown
  query?: Record<string, string | number | undefined>
  authRedirect?: boolean
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

function buildUrl(path: string, query: RequestOptions<unknown>['query']): string {
  const url = new URL(path, window.location.origin)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }
  return url.toString()
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

export async function request<T>(
  method: Method,
  path: string,
  options: RequestOptions<T>,
): Promise<T> {
  const token = config.getToken?.() ?? null
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let body: BodyInit | undefined
  if (options.body instanceof FormData) {
    body = options.body
  } else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(options.body)
  }

  let response: Response
  try {
    response = await fetch(buildUrl(path, options.query), { method, headers, body })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Network request failed')
  }

  if (!response.ok) {
    if (response.status === 401 && token && options.authRedirect !== false) {
      config.onUnauthorized?.()
    }
    const parsed = errorResponseSchema.safeParse(await readJson(response))
    if (parsed.success) {
      const { code, message, details } = parsed.data.error
      throw new ApiError(response.status, code, message, details)
    }
    throw new ApiError(
      response.status,
      'INTERNAL_ERROR',
      `Unexpected response (${response.status})`,
    )
  }

  const payload = response.status === 204 ? null : await readJson(response)
  const result = options.schema.safeParse(payload)
  if (!result.success) {
    throw new ApiError(response.status, 'INVALID_RESPONSE', 'Response did not match the schema')
  }
  return result.data
}

export const api = {
  get: <T>(path: string, options: RequestOptions<T>) => request('GET', path, options),
  post: <T>(path: string, options: RequestOptions<T>) => request('POST', path, options),
  put: <T>(path: string, options: RequestOptions<T>) => request('PUT', path, options),
  patch: <T>(path: string, options: RequestOptions<T>) => request('PATCH', path, options),
  delete: <T>(path: string, options: RequestOptions<T>) => request('DELETE', path, options),
}
