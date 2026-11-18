import { useEffect, useState } from "react"
import { Link, createFileRoute, redirect } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { Search } from "lucide-react"
import type { Role, User, UserStatus } from "@amlak/shared"
import { storedUser, useAuth } from "@/lib/auth"
import { apiPage } from "@/lib/api"
import { roleLabel } from "@/lib/nav"
import { useFormat } from "@/lib/format"
import { Input } from "@/components/ui/input"
import { Page } from "@/components/page"
import { Field, FilterTabs, Initial, ListFooter, NativeSelect, Panel } from "@/components/panel"
import { UserStatusChip } from "@/components/place-shared"
import { EmptyState, LoadError, LoadingList } from "@/components/states"
import { LIMITS } from "@/lib/limits"

export const Route = createFileRoute("/_authenticated/admin/")({
  beforeLoad: () => {
    if (storedUser()?.role !== "ADMIN") throw redirect({ to: "/home" })
  },
  component: AdminUsers,
})

const PAGE_SIZE = 12
type Filter = "ALL" | UserStatus
const FILTERS: { key: Filter; label: React.ReactNode }[] = [
  { key: "ALL", label: <Trans>All</Trans> },
  { key: "ACTIVE", label: <Trans>Active</Trans> },
  { key: "INVITED", label: <Trans>Invited</Trans> },
  { key: "PENDING_VERIFICATION", label: <Trans>Pending verification</Trans> },
  { key: "DEACTIVATED", label: <Trans>Deactivated</Trans> },
]

function query(params: { role?: string; status?: string; search?: string; page: number; size: number }) {
  const q = new URLSearchParams({ page: String(params.page), page_size: String(params.size) })
  if (params.role) q.set("role", params.role)
  if (params.status) q.set("status", params.status)
  if (params.search) q.set("search", params.search)
  return `/users?${q.toString()}`
}

/** Every account: search, role and status, a page of cards at a time. */
function AdminUsers() {
  const { accessToken, user: me } = useAuth()
  const { date } = useFormat()
  const [search, setSearch] = useState("")
  const [typed, setTyped] = useState("")
  const [role, setRole] = useState<"" | Role>("")
  const [filter, setFilter] = useState<Filter>("ALL")
  const [page, setPage] = useState(1)
  const [users, setUsers] = useState<User[] | null>(null)
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState<Partial<Record<Filter, number>>>({})
  const [failed, setFailed] = useState(false)
  const [reload, setReload] = useState(0)

  // Search after a short pause in typing.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(typed.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [typed])

  useEffect(() => {
    if (!accessToken) return
    let alive = true
    for (const item of FILTERS) {
      apiPage<User>(query({ role, search, status: item.key === "ALL" ? "" : item.key, page: 1, size: 1 }), accessToken)
        .then((result) => alive && setCounts((prev) => ({ ...prev, [item.key]: result.pagination.total })))
        .catch(() => {})
    }
    return () => {
      alive = false
    }
  }, [accessToken, role, search, reload])

  useEffect(() => {
    if (!accessToken) return
    let alive = true
    setUsers(null)
    setFailed(false)
    apiPage<User>(query({ role, search, status: filter === "ALL" ? "" : filter, page, size: PAGE_SIZE }), accessToken)
      .then((result) => {
        if (!alive) return
        setUsers(result.data)
        setTotal(result.pagination.total)
      })
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [accessToken, role, search, filter, page, reload])

  return (
    <Page
      title={<Trans>Users</Trans>}
      description={<Trans>All manager and worker accounts. The admin does not see places.</Trans>}
      phoneStart="logo"
      bell={false}
      phoneEnd="none"
    >
      {/* One card holds the page's list, its filters and its pages. */}
      <Panel className="gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="relative w-full desk:w-[320px]">
            <label htmlFor="user-search" className="sr-only">
              <Trans>Search</Trans>
            </label>
            <Search aria-hidden="true" className="pointer-events-none absolute start-3.5 top-3 size-5 text-muted-foreground" strokeWidth={1.8} />
            <Input
              id="user-search"
              maxLength={LIMITS.title}
              type="search"
              className="ps-11"
              placeholder={t`Search by name or email`}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
            />
          </div>
          <div className="w-full desk:w-[200px]">
            <Field id="user-role" label={<Trans>Role</Trans>}>
              <NativeSelect
                id="user-role"
                value={role}
                onChange={(value) => {
                  setRole(value as "" | Role)
                  setPage(1)
                }}
              >
                <option value="">{t`All roles`}</option>
                <option value="MANAGER">{roleLabel("MANAGER")}</option>
                <option value="WORKER">{roleLabel("WORKER")}</option>
                <option value="ADMIN">{roleLabel("ADMIN")}</option>
              </NativeSelect>
            </Field>
          </div>
        </div>
        <FilterTabs
          label={t`Filter by status`}
          value={filter}
          onChange={(key) => {
            setFilter(key)
            setPage(1)
          }}
          tabs={FILTERS.map((item) => ({ key: item.key, label: item.label, count: counts[item.key] ?? 0 }))}
        />

        {failed ? (
          <LoadError title={<Trans>Could not load users</Trans>} onRetry={() => setReload((n) => n + 1)} />
        ) : users === null ? (
          <LoadingList />
        ) : users.length === 0 ? (
          <EmptyState title={<Trans>No users match</Trans>} text={<Trans>Change the search or the filters.</Trans>} />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] items-stretch gap-4">
            {users.map((user) => (
              <Link
                key={user.id}
                to="/admin/$admin_id"
                params={{ admin_id: user.id }}
                className="am-lift box-border flex h-full min-w-0 flex-col gap-2.5 border border-border bg-card p-4 text-foreground no-underline shadow-sm"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Initial name={user.fullname} />
                    <span className="flex min-w-0 flex-col leading-[1.5]">
                      <span className="font-semibold [overflow-wrap:anywhere]">
                        {user.id === me?.id ? t`${user.fullname} (you)` : user.fullname}
                      </span>
                      <span dir="ltr" className="truncate text-start text-[13px] text-muted-foreground">
                        {user.email}
                      </span>
                    </span>
                  </span>
                  <UserStatusChip status={user.status} />
                </span>
                <span className="mt-auto flex flex-wrap gap-x-4 text-[13px] text-muted-foreground">
                  <span>{roleLabel(user.role)}</span>
                  <span>
                    <Trans>Joined: {date(user.created_at, { day: "numeric", month: "long" })}</Trans>
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
        <p className="m-0 text-[13px] text-muted-foreground">
          <Trans>You cannot change the status of your own account.</Trans>
        </p>
        <ListFooter
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          range={(from, to, all) => t`${from} to ${to} of ${all} users`}
          onPage={setPage}
        />
      </Panel>    </Page>
  )
}
