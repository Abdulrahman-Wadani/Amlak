/**
 * The one way the web app calls the API with an access token.
 *
 * Access tokens live 15 minutes. When a request comes back 401, authFetch
 * gets a new token from the refresh cookie (AuthProvider's refresh, which
 * shares one refresh between parallel requests), stores it and sends the
 * request again, once. If the refresh fails, the session is over: the
 * provider logs the user out and goes to /signin.
 */

type SessionHandlers = {
  /** Resolves with a new access token, or rejects when the session is over. */
  refresh: () => Promise<string>
  /** Logs out and leaves the authenticated pages. */
  expire: () => void
}

let handlers: SessionHandlers | null = null
let latestToken: string | null = null

/** AuthProvider registers how to refresh and how to end the session. */
export function setSessionHandlers(next: SessionHandlers | null): void {
  handlers = next
}

/** Keeps the newest token, so a request sent with an older one can retry with it. */
export function rememberAccessToken(token: string | null): void {
  latestToken = token
}

function send(
  path: string,
  token: string | null,
  init: RequestInit,
): Promise<Response> {
  const headers = new Headers(init.headers)
  if (token) headers.set("Authorization", `Bearer ${token}`)
  // JSON bodies are strings. FormData must not get a Content-Type: the
  // browser sets multipart/form-data with its boundary.
  if (typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  return fetch(`/api/v1${path}`, {
    ...init,
    headers,
    credentials: "same-origin",
  })
}

/**
 * fetch for `/api/v1${path}` with the access token. Returns the Response,
 * so callers keep their own parsing. Retries once after a 401.
 */
export async function authFetch(
  path: string,
  token: string | null,
  init: RequestInit = {},
): Promise<Response> {
  const res = await send(path, token, init)
  if (res.status !== 401 || !token || !handlers) return res

  let fresh: string
  try {
    // Another request may already have refreshed while this one was in flight.
    fresh =
      latestToken && latestToken !== token
        ? latestToken
        : await handlers.refresh()
  } catch {
    handlers.expire()
    return res
  }
  return send(path, fresh, init)
}
