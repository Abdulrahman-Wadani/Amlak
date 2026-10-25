import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import type { Language, User } from "@amlak/shared"

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

const USER_KEY = "authUser"

async function api(path: string, body?: unknown): Promise<Response> {
  return fetch(`/api/v1${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
  })
}

function failureMessage(data: unknown): string {
  const d = data as {
    code?: string
    message?: string
    details?: { reason?: string }
  }
  if (d.code === "ACCOUNT_NOT_ACTIVE" && d.details?.reason === "EMAIL_NOT_VERIFIED") {
    return "Verify your email first — we sent a 6-digit code."
  }
  return d.message ?? "Something went wrong. Try again."
}

async function call(path: string, body?: unknown): Promise<unknown> {
  const res = await api(path, body)
  if (!res.ok) {
    throw new Error(failureMessage(await res.json().catch(() => ({}))))
  }
  if (res.status === 204) return null
  return res.json()
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const saved = sessionStorage.getItem(USER_KEY)
  const [user, setUser] = useState<User | null>(
    saved ? (JSON.parse(saved) as User) : null
  )

  const [accessToken, setAccessToken] = useState<string | null>(null)

  useEffect(() => {
    if (!saved) return
    call("/auth/refresh")
      .then((data) => setAccessToken((data as { access_token: string }).access_token))
      .catch(() => {
        sessionStorage.removeItem(USER_KEY)
        setUser(null)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function login(email: string, password: string) {
    const data = (await call("/auth/login", { email, password })) as {
      access_token: string
      user: User
    }
    setAccessToken(data.access_token)
    setUser(data.user)
    sessionStorage.setItem(USER_KEY, JSON.stringify(data.user))
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
    sessionStorage.removeItem(USER_KEY)
    setAccessToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{ user, accessToken, login, register, verifyCode, resendCode, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
