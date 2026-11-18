import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { LinkProps } from "@tanstack/react-router"
import { useLocation } from "@tanstack/react-router"
import { useAuth } from "@/lib/auth"
import { getNotifications } from "@/lib/api"
import type { IconName } from "@/lib/nav"

/** A button at the end of the phone top bar, in place of the bell (e.g. "Add place"). */
export interface TopBarAction {
  label: string
  icon: IconName
  link?: LinkProps
  onClick?: () => void
}

interface ShellState {
  /** The phone top bar; each page portals its title and buttons into it. */
  bar: HTMLElement | null
  setBar: (el: HTMLElement | null) => void
  /** Whether the phone layout shows the bottom tabs (forms hide them). */
  tabs: boolean
  setTabs: (show: boolean) => void
  unread: number
  refreshUnread: () => void
}

const ShellContext = createContext<ShellState | null>(null)

export function ShellProvider({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth()
  const pathname = useLocation({ select: (l) => l.pathname })
  const [bar, setBar] = useState<HTMLElement | null>(null)
  const [tabs, setTabs] = useState(true)
  const [unread, setUnread] = useState(0)
  const [tick, setTick] = useState(0)

  // The bell's count: one small request on every page change and on demand.
  useEffect(() => {
    if (!accessToken) return
    let alive = true
    getNotifications(accessToken, { page: 1, page_size: 1 })
      .then((result) => {
        if (alive) setUnread(result.unread_count)
      })
      .catch(() => {
        // The bell keeps its last count; the notifications page shows errors.
      })
    return () => {
      alive = false
    }
  }, [accessToken, pathname, tick])

  const refreshUnread = useCallback(() => setTick((n) => n + 1), [])

  const value = useMemo(
    () => ({ bar, setBar, tabs, setTabs, unread, refreshUnread }),
    [bar, tabs, unread, refreshUnread],
  )
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
}

export function useShell(): ShellState {
  const shell = useContext(ShellContext)
  if (!shell) throw new Error("useShell must be used inside ShellProvider")
  return shell
}

/** The unread count for the bell, and a way to refresh it after marking as read. */
export function useUnread() {
  const { unread, refreshUnread } = useShell()
  return { unread, refreshUnread }
}
