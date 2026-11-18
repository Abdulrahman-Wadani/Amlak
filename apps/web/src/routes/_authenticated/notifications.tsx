import { useCallback, useEffect, useState, type ReactNode } from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  Bell,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Megaphone,
  RefreshCw,
} from "lucide-react"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react"
import { useAuth } from "@/lib/auth"
import {
  getNotifications,
  markNotificationAsRead,
  type Notification,
} from "@/lib/api"
import { S } from "@/lib/dom-style"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageBox } from "@/components/message-box"
import { Page } from "@/components/page"
import { useUnread } from "@/components/shell-context"

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
})

type FilterType = "all" | "unread" | "read"

const PAGE_SIZE = 10

function NotificationsPage() {
  const { i18n } = useLingui()
  const { accessToken } = useAuth()
  const { refreshUnread } = useUnread()

  const locale = i18n.locale === "ar" ? "ar" : "en"
  const isArabic = locale === "ar"

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const [filter, setFilter] = useState<FilterType>("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [readingId, setReadingId] = useState<string | null>(null)

  const money = (n: number) => new Intl.NumberFormat(locale).format(n)

  const loadNotifications = useCallback(async () => {
    if (!accessToken) return

    setLoading(true)
    setError("")

    try {
      const result = await getNotifications(accessToken, {
        page,
        page_size: PAGE_SIZE,
        ...(filter === "all" ? {} : { is_read: filter === "read" }),
      })

      setNotifications(result.data)
      setUnreadCount(result.unread_count)
      setTotalPages(Math.max(1, result.pagination.total_pages))
    } catch {
      setError("loadNotificationsError")
    } finally {
      setLoading(false)
    }
  }, [accessToken, page, filter])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  useEffect(() => {
    setPage(1)
  }, [filter])

  async function handleMarkAsRead(notificationId: string) {
    if (!accessToken || readingId) return

    setReadingId(notificationId)

    try {
      const updated = await markNotificationAsRead(
        accessToken,
        notificationId
      )

      setNotifications((current) =>
        current.map((item) =>
          item.id === notificationId ? updated : item
        )
      )

      setUnreadCount((current) => Math.max(0, current - 1))
      refreshUnread() // the bell
    } catch {
      setError("updateNotificationError")
    } finally {
      setReadingId(null)
    }
  }

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(date))
  }

  const filterButton = (value: FilterType, label: ReactNode) => (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => setFilter(value)}
      className="am-btn"
      style={S(
        `height: 40px; padding: 0 16px; background: ${
          filter === value ? "var(--foreground)" : "transparent"
        }; color: ${
          filter === value ? "#fff" : "var(--foreground)"
        }; border: 1px solid ${
          filter === value ? "var(--foreground)" : "var(--border)"
        }; font-weight: 600`
      )}
    >
      {label}
    </Button>
  )

  return (
    <Page
      title={<Trans>Notifications</Trans>}
      description={<Trans>{money(unreadCount)} unread.</Trans>}
      phoneStart="back"
      phoneEnd="none"
      bell={false}
    >

      {/* Notifications list */}
      <section>
        <div
          style={S(
            "display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 14px; margin-bottom: 16px"
          )}
        >
          <div>
            <h2 style={S("font-size: 18px; font-weight: 700; margin: 0")}>
              <Trans>Inbox</Trans>
            </h2>
            <p
              style={S(
                "font-size: 13px; color: var(--muted-foreground); margin: 5px 0 0"
              )}
            >
              <Trans>
                Manage your notifications and stay up to date.
              </Trans>
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="am-btn"
            onClick={loadNotifications}
            disabled={loading}
            style={S(
              "height: 40px; background: transparent; border: 1px solid var(--border); color: var(--foreground)"
            )}
          >
            <RefreshCw
              size={15}
              className={loading ? "animate-spin" : ""}
            />
            <Trans>Refresh</Trans>
          </Button>
        </div>

        <div
          style={S(
            "display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px"
          )}
        >
          {filterButton("all", <Trans>All</Trans>)}
          {filterButton("unread", <Trans>Unread</Trans>)}
          {filterButton("read", <Trans>Read</Trans>)}
        </div>

        {error && (
          <MessageBox type="error">
            {error === "loadNotificationsError" ? (
              <Trans>Failed to load notifications.</Trans>
            ) : (
              <Trans>Failed to update notification.</Trans>
            )}
          </MessageBox>
        )}

        {loading && (
          <div style={S("display: flex; flex-direction: column; gap: 10px")}>
            <Skeleton style={S("height: 110px")} />
            <Skeleton style={S("height: 110px")} />
            <Skeleton style={S("height: 110px")} />
          </div>
        )}

        {!loading && !error && notifications.length === 0 && (
          <Card
            style={S(
              "border: 1px solid var(--border); box-shadow: 2px 2px 0 rgba(27,36,48,0.10)"
            )}
          >
            <CardContent
              style={S(
                "padding: 48px 24px; display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center"
              )}
            >
              <span
                style={S(
                  "width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; background: var(--muted); color: var(--muted-foreground)"
                )}
              >
                <Bell size={26} />
              </span>

              <h3 style={S("font-size: 17px; font-weight: 700; margin: 0")}>
                <Trans>No notifications</Trans>
              </h3>

              <p
                style={S(
                  "font-size: 14px; color: var(--muted-foreground); margin: 0"
                )}
              >
                <Trans>
                  You don't have any notifications in this category.
                </Trans>
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && notifications.length > 0 && (
          <div style={S("display: flex; flex-direction: column; gap: 10px")}>
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                formatDate={formatDate}
                reading={readingId === notification.id}
                onMarkRead={() => handleMarkAsRead(notification.id)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div
            style={S(
              "display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 20px; padding: 14px 16px; border: 1px solid var(--border); background: var(--card)"
            )}
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="am-btn"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              style={S(
                "height: 38px; background: transparent; border: 1px solid var(--border); color: var(--foreground)"
              )}
            >
              {isArabic ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              <Trans>Previous</Trans>
            </Button>

            <span
              style={S(
                "font-size: 13px; color: var(--muted-foreground); font-family: var(--font-mono)"
              )}
            >
              {money(page)} / {money(totalPages)}
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="am-btn"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              style={S(
                "height: 38px; background: transparent; border: 1px solid var(--border); color: var(--foreground)"
              )}
            >
              <Trans>Next</Trans>
              {isArabic ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </Button>
          </div>
        )}
      </section>
    </Page>
  )
}

/* Notification card */

function NotificationCard({
  notification,
  formatDate,
  reading,
  onMarkRead,
}: {
  notification: Notification
  formatDate: (date: string) => string
  reading: boolean
  onMarkRead: () => void
}) {

  const notificationTypeLabel = (type: string) => {
    switch (type) {
      // The types the API sends (NOTIFICATION_TYPES in @amlak/shared).
      case "ANNOUNCEMENT":
        return <Trans>Announcement</Trans>
      case "TICKET_SUBMITTED":
        return <Trans>Ticket submitted</Trans>
      case "TICKET_ASSIGNED":
        return <Trans>Ticket assigned</Trans>
      case "TICKET_REJECTED":
        return <Trans>Ticket rejected</Trans>
      case "TICKET_COMPLETED":
        return <Trans>Ticket completed</Trans>
      case "MAINTENANCE_REMINDER":
        return <Trans>Maintenance reminder</Trans>
      case "MAINTENANCE_OVERDUE":
        return <Trans>Maintenance overdue</Trans>
      case "SUPPORT_RESOLVED":
        return <Trans>Support ticket resolved</Trans>
      default:
        return type.replaceAll("_", " ")
    }
  }

  return (
    <Card
      className="am-lift"
      style={S(
        `border: 1px solid var(--border); box-shadow: 2px 2px 0 rgba(27,36,48,0.10); ${
          notification.is_read
            ? "background: var(--card)"
            : "background: var(--accent)"
        }`
      )}
    >
      <CardContent
        style={S(
          "padding: 18px 20px; display: flex; align-items: flex-start; gap: 14px"
        )}
      >
        <span
          style={S(
            `width: 42px; height: 42px; flex: none; display: inline-flex; align-items: center; justify-content: center; background: ${
              notification.is_read ? "var(--muted)" : "var(--info-50)"
            }; color: ${
              notification.is_read
                ? "var(--muted-foreground)"
                : "var(--info-700)"
            }`
          )}
        >
          {notification.type === "ANNOUNCEMENT" ? (
            <Megaphone size={20} />
          ) : (
            <Bell size={20} />
          )}
        </span>

        <div
          style={S(
            "display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 0"
          )}
        >
          <div
            style={S(
              "display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px"
            )}
          >
            <div
              style={S(
                "display: flex; flex-wrap: wrap; align-items: center; gap: 8px"
              )}
            >
              <h3
                style={S(
                  "font-size: 15px; font-weight: 700; margin: 0; line-height: 1.5"
                )}
              >
                {notification.title}
              </h3>

              {!notification.is_read && (
                <span
                  style={S(
                    "width: 7px; height: 7px; border-radius: 50%; background: var(--info-700)"
                  )}
                  title={t`Unread`}
                />
              )}
            </div>

            <span
              style={S(
                "font-size: 12px; color: var(--muted-foreground); display: inline-flex; align-items: center; gap: 5px"
              )}
            >
              <Clock size={13} />
              {formatDate(notification.created_at)}
            </span>
          </div>

          <p
            style={S(
              "font-size: 14px; color: var(--muted-foreground); margin: 0; line-height: 1.7; white-space: pre-wrap"
            )}
          >
            {notification.message}
          </p>

          <div
            style={S(
              "display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-top: 4px"
            )}
          >
            <span
              style={S(
                "font-size: 11px; color: var(--muted-foreground); font-family: var(--font-mono)"
              )}
            >
              {notificationTypeLabel(notification.type)}
            </span>

            {!notification.is_read && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="am-btn"
                onClick={onMarkRead}
                disabled={reading}
                style={S(
                  "height: 36px; padding: 0 12px; background: transparent; color: var(--foreground); border: 1px solid var(--border); font-size: 12px"
                )}
              >
                <Check size={14} />
                {reading ? (
                  <Trans>Updating...</Trans>
                ) : (
                  <Trans>Mark as read</Trans>
                )}
              </Button>
            )}

            {notification.is_read && (
              <span
                style={S(
                  "display: inline-flex; align-items: center; gap: 5px; color: var(--good); font-size: 12px; font-weight: 600"
                )}
              >
                <CheckCheck size={15} />
                <Trans>Read</Trans>
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* Announcement input */
