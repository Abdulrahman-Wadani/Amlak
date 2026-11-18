import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

import { useNavigate } from "@tanstack/react-router"
import { readApiError } from "@/lib/errors"
import type { Language, User } from "@amlak/shared"
import { rememberAccessToken, setSessionHandlers } from "@/lib/http"
import { useLanguage } from "@/lib/i18n"
import { t } from "@lingui/core/macro"
import { Spinner } from "@/components/ui/spinner"

type Auth = {
  user: User | null
  accessToken: string | null
  login: (email: string, password: string) => Promise<void>
  register: (
    email: string,
    fullname: string,
    phone: string,
    password: string,
    preferredLanguage: Language
  ) => Promise<void>
  verifyCode: (email: string, code: string) => Promise<void>
  resendCode: (email: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<Auth | null>(null)

/*
 * The session lives only in the refresh cookie (httpOnly, 30 days). Nothing
 * about it is kept in localStorage or sessionStorage: on every page load the
 * app asks /auth/refresh once, and the cookie decides. The user and the
 * access token stay in memory.
 */
let currentUser: User | null = null
let currentToken: string | null = null
let restoring: Promise<User | null> | null = null

/** The signed-in user, for route guards that run before render. */
export function storedUser(): User | null {
  return currentUser
}

/**
 * Restores the session from the refresh cookie, once per page load. Resolves
 * with the user, or null when there is no valid session. Route guards await it.
 */
export function restoreSession(): Promise<User | null> {
  if (!restoring) {
    restoring = (async () => {
      try {
        const data = (await refreshOnce()) as { access_token: string }
        const res = await fetch("/api/v1/users/me", {
          headers: { Authorization: `Bearer ${data.access_token}` },
          credentials: "same-origin",
        })
        if (!res.ok) throw await readApiError(res)
        currentUser = (await res.json()) as User
        currentToken = data.access_token
      } catch {
        currentUser = null
        currentToken = null
      }
      return currentUser
    })()
  }
  return restoring
}

let refreshInFlight: Promise<unknown> | null = null

function refreshOnce(): Promise<unknown> {
  if (!refreshInFlight) {
    refreshInFlight = call("/auth/refresh")
      .catch(async (err) => {
        await new Promise((r) => setTimeout(r, 200))
        return call("/auth/refresh").catch(() => Promise.reject(err))
      })
      .finally(() => {
        refreshInFlight = null
      })
  }

  return refreshInFlight
}

async function api(path: string, body?: unknown): Promise<Response> {
  return fetch(`/api/v1${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
  })
}

async function call(path: string, body?: unknown): Promise<unknown> {
  const res = await api(path, body)

  if (!res.ok) throw await readApiError(res)

  if (res.status === 204) return null

  return res.json()
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setLang } = useLanguage()

  const [user, setUser] = useState<User | null>(currentUser)
  const [accessToken, setAccessToken] = useState<string | null>(currentToken)
  // Until the refresh cookie has answered, nothing is shown and nobody is sent to /signin.
  const [ready, setReady] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    rememberAccessToken(accessToken)
  }, [accessToken])

  // Lets authFetch refresh an expired access token, or end the session
  // when the refresh cookie is no longer valid.
  useEffect(() => {
    setSessionHandlers({
      refresh: () =>
        refreshOnce().then((data) => {
          const token = (data as { access_token: string }).access_token
          rememberAccessToken(token)
          setAccessToken(token)
          return token
        }),
      expire: () => {
        // Parallel requests can all fail; end the session once.
        if (!currentUser) return
        logout()
        void navigate({ to: "/signin" })
      },
    })
    return () => setSessionHandlers(null)
    // logout only uses state setters, which never change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate])

  // Restore the session from the refresh cookie.
  useEffect(() => {
    let alive = true
    void restoreSession().then((restored) => {
      if (!alive) return
      setUser(restored)
      setAccessToken(currentToken)
      setReady(true)
    })
    return () => {
      alive = false
    }
  }, [])

  async function login(email: string, password: string) {
    const data = (await call("/auth/login", {
      email,
      password,
    })) as {
      access_token: string
      user: User
    }

    currentUser = data.user
    currentToken = data.access_token
    restoring = Promise.resolve(data.user)
    setAccessToken(data.access_token)
    setUser(data.user)

    // Apply the user's preferred language globally
    if (
      data.user.preferred_language === "ar" ||
      data.user.preferred_language === "en"
    ) {
      setLang(data.user.preferred_language)
    }
  }

  async function register(
    email: string,
    fullname: string,
    phone: string,
    password: string,
    preferredLanguage: Language
  ) {
    await call("/auth/register", {
      email,
      fullname,
      phone,
      password,
      preferred_language: preferredLanguage,
    })
  }

  async function verifyCode(email: string, code: string) {
    await call("/auth/verify-email", { email, code })
  }

  async function resendCode(email: string) {
    await call("/auth/verification-code", { email })
  }

  function logout() {
    void api("/auth/logout")

    currentUser = null
    currentToken = null
    restoring = Promise.resolve(null)
    setAccessToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        login,
        register,
        verifyCode,
        resendCode,
        logout,
      }}
    >
      {ready ? children : <SessionLoading />}
    </AuthContext.Provider>
  )
}

function SessionLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      <Spinner className="size-6" aria-label={t`Loading`} />
    </div>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)

  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider")
  }

  return ctx
}
