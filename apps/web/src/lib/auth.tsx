import { createContext, useContext, useState, type ReactNode } from "react"

type User = { email: string; fullname: string }

type Auth = {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<Auth | null>(null)

// mock adapter.
export function AuthProvider({ children }: { children: ReactNode }) {
  const saved = sessionStorage.getItem("mockUser")
  const [user, setUser] = useState<User | null>(
    saved ? (JSON.parse(saved) as User) : null
  )

  async function login(email: string, _password: string) {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    const u = { email, fullname: email.split("@")[0] }
    sessionStorage.setItem("mockUser", JSON.stringify(u))
    setUser(u)
  }

  function logout() {
    sessionStorage.removeItem("mockUser")
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
