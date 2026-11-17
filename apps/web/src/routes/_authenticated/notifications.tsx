import { useCallback, useEffect, useState, type ReactNode } from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Send,
  Users,
  Megaphone,
  RefreshCw,
  AlertCircle,
} from "lucide-react"
import { Trans } from "@lingui/react/macro"
import { useLingui } from "@lingui/react"
import { useAuth } from "@/lib/auth"
import {
  getNotifications,
  markNotificationAsRead,
  sendAnnouncement,
  type Notification,
} from "@/lib/api"
import { S } from "@/lib/dom-style"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
})

type FilterType = "all" | "unread" | "read"
type AnnouncementRole = "ADMIN" | "MANAGER" | "WORKER"

const PAGE_SIZE = 10

function NotificationsPage() {
  const { i18n } = useLingui()
  const { user, accessToken } = useAuth()

  const isAdmin = String(user?.role ?? "").toUpperCase() === "ADMIN"
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

  const [announcementOpen, setAnnouncementOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [announcementError, setAnnouncementError] = useState("")
  const [announcementSuccess, setAnnouncementSuccess] = useState("")

  const [recipientType, setRecipientType] = useState<"role" | "users">("role")
  const [recipientRole, setRecipientRole] =
    useState<AnnouncementRole>("MANAGER")
  const [userIds, setUserIds] = useState("")

  const [titleEn, setTitleEn] = useState("")
  const [messageEn, setMessageEn] = useState("")
  const [titleAr, setTitleAr] = useState("")
  const [messageAr, setMessageAr] = useState("")

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
    } catch {
      setError("updateNotificationError")
    } finally {
      setReadingId(null)
    }
  }

  async function handleSendAnnouncement() {
    if (!accessToken) return

    setAnnouncementError("")
    setAnnouncementSuccess("")

    if (
      !titleEn.trim() ||
      !messageEn.trim() ||
      !titleAr.trim() ||
      !messageAr.trim()
    ) {
      setAnnouncementError("fillAnnouncementFields")
      return
    }

    const parsedUserIds = userIds
      .split(/[\n,]+/)
      .map((id) => id.trim())
      .filter(Boolean)

    if (recipientType === "users") {
      if (parsedUserIds.length === 0) {
        setAnnouncementError("enterAtLeastOneUser")
        return
      }

      if (parsedUserIds.length > 1000) {
        setAnnouncementError("maximumUsersAllowed")
        return
      }
    }

    setSending(true)

    try {
      const result = await sendAnnouncement(accessToken, {
        ...(recipientType === "role"
          ? { role: recipientRole }
          : { user_ids: parsedUserIds }),
        title_en: titleEn.trim(),
        message_en: messageEn.trim(),
        title_ar: titleAr.trim(),
        message_ar: messageAr.trim(),
      })

      setAnnouncementSuccess(
        isArabic
          ? `تم إرسال الإعلان بنجاح إلى ${money(result.recipient_count)} مستخدم.`
          : `Announcement sent successfully to ${money(result.recipient_count)} users.`
      )

      setTitleEn("")
      setMessageEn("")
      setTitleAr("")
      setMessageAr("")
      setUserIds("")
    } catch {
      setAnnouncementError("sendAnnouncementError")
    } finally {
      setSending(false)
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
    <div
      style={S(
        "max-width: 1240px; margin-inline: auto; padding: 28px 40px 56px; display: flex; flex-direction: column; gap: 24px; box-sizing: border-box"
      )}
    >
      {/* Header */}
      <section
        className="am-rise"
        style={S(
          "background: var(--foreground); color: #fff; padding: 32px; display: flex; flex-wrap: wrap; gap: 20px; align-items: center; justify-content: space-between"
        )}
      >
        <div
          style={S(
            "display: flex; flex-direction: column; gap: 10px; flex: 1 1 300px"
          )}
        >
          <span
            style={S(
              "display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--info-200)"
            )}
          >
            <BellRing size={17} />
            <Trans>Notifications</Trans>
          </span>

          <h1
            style={S(
              "margin: 0; font-size: 28px; font-weight: 700; line-height: 1.35"
            )}
          >
            <Trans>Your notifications</Trans>
          </h1>

          <p
            style={S(
              "margin: 0; font-size: 14px; color: var(--info-200)"
            )}
          >
            <Trans>
              Stay updated with your latest activity and announcements.
            </Trans>
          </p>
        </div>

        <div
          style={S(
            "display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.10); padding: 14px 18px"
          )}
        >
          <Bell size={22} />

          <div style={S("display: flex; flex-direction: column; gap: 2px")}>
            <span
              style={S(
                "font-size: 24px; font-weight: 700; font-family: var(--font-mono); line-height: 1"
              )}
            >
              {money(unreadCount)}
            </span>
            <span style={S("font-size: 12px; color: var(--info-200)")}>
              <Trans>Unread notifications</Trans>
            </span>
          </div>
        </div>
      </section>

      {/* Admin announcement */}
      {isAdmin && (
        <Card
          className="am-lift"
          style={S(
            "border: 1px solid var(--border); box-shadow: 2px 2px 0 rgba(27,36,48,0.10)"
          )}
        >
          <CardHeader
            style={S(
              "display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 16px; padding: 20px 24px"
            )}
          >
            <div
              style={S(
                "display: flex; align-items: center; gap: 12px; min-width: 0"
              )}
            >
              <span
                style={S(
                  "width: 42px; height: 42px; display: inline-flex; align-items: center; justify-content: center; background: var(--info-50); color: var(--info-700); flex: none"
                )}
              >
                <Megaphone size={21} />
              </span>

              <div>
                <CardTitle style={S("font-size: 16px; font-weight: 700")}>
                  <Trans>Send announcement</Trans>
                </CardTitle>
                <CardDescription style={S("font-size: 13px")}>
                  <Trans>
                    Send an announcement to users by role or user IDs.
                  </Trans>
                </CardDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="am-btn"
              onClick={() => setAnnouncementOpen((value) => !value)}
              style={S(
                "height: 40px; background: transparent; border: 1px solid var(--border); color: var(--foreground); flex: none"
              )}
            >
              {announcementOpen ? (
                <Trans>Close</Trans>
              ) : (
                <Trans>Create announcement</Trans>
              )}
            </Button>
          </CardHeader>

          {announcementOpen && (
            <CardContent
              className="am-reveal"
              style={S(
                "padding: 0 24px 24px; display: flex; flex-direction: column; gap: 18px"
              )}
            >
              <div style={S("display: flex; flex-wrap: wrap; gap: 10px")}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="am-btn"
                  onClick={() => setRecipientType("role")}
                  style={S(
                    `height: 40px; background: ${
                      recipientType === "role"
                        ? "var(--foreground)"
                        : "transparent"
                    }; color: ${
                      recipientType === "role"
                        ? "#fff"
                        : "var(--foreground)"
                    }; border: 1px solid var(--border)`
                  )}
                >
                  <Users size={15} />
                  <Trans>By role</Trans>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="am-btn"
                  onClick={() => setRecipientType("users")}
                  style={S(
                    `height: 40px; background: ${
                      recipientType === "users"
                        ? "var(--foreground)"
                        : "transparent"
                    }; color: ${
                      recipientType === "users"
                        ? "#fff"
                        : "var(--foreground)"
                    }; border: 1px solid var(--border)`
                  )}
                >
                  <Users size={15} />
                  <Trans>Specific users</Trans>
                </Button>
              </div>

              {recipientType === "role" ? (
                <div style={S("display: flex; flex-direction: column; gap: 7px")}>
                  <label style={S("font-size: 14px; font-weight: 600")}>
                    <Trans>Recipient role</Trans>
                  </label>

                  <select
                    value={recipientRole}
                    onChange={(event) =>
                      setRecipientRole(event.target.value as AnnouncementRole)
                    }
                    style={S(
                      "height: 44px; width: 100%; padding: 0 12px; background: var(--background); color: var(--foreground); border: 1px solid var(--border); outline: none"
                    )}
                  >
                    <option value="ADMIN">
                      {i18n._("Admin")}
                    </option>
                    <option value="MANAGER">
                      {i18n._("Manager")}
                    </option>
                    <option value="WORKER">
                      {i18n._("Worker")}
                    </option>
                  </select>
                </div>
              ) : (
                <div style={S("display: flex; flex-direction: column; gap: 7px")}>
                  <label style={S("font-size: 14px; font-weight: 600")}>
                    <Trans>User IDs</Trans>
                  </label>

                  <textarea
                    value={userIds}
                    onChange={(event) => setUserIds(event.target.value)}
                    placeholder={i18n._("UUID 1, UUID 2...")}
                    rows={3}
                    style={S(
                      "width: 100%; box-sizing: border-box; padding: 12px; resize: vertical; background: var(--background); color: var(--foreground); border: 1px solid var(--border); outline: none; font: inherit; font-size: 14px"
                    )}
                  />

                  <span
                    style={S("font-size: 12px; color: var(--muted-foreground)")}
                  >
                    <Trans>
                      Separate user IDs with commas or new lines. Maximum 1000 users.
                    </Trans>
                  </span>
                </div>
              )}

              <div
                style={S(
                  "display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 18px"
                )}
              >
                <div style={S("display: flex; flex-direction: column; gap: 12px")}>
                  <h3 style={S("font-size: 15px; font-weight: 700; margin: 0")}>
                    <Trans>English</Trans>
                  </h3>

                  <AnnouncementField
                    label={<Trans>Title</Trans>}
                    value={titleEn}
                    onChange={setTitleEn}
                    placeholder={<Trans>Announcement title</Trans>}
                  />

                  <AnnouncementField
                    label={<Trans>Message</Trans>}
                    value={messageEn}
                    onChange={setMessageEn}
                    placeholder={<Trans>Write your announcement...</Trans>}
                    multiline
                  />
                </div>

                <div style={S("display: flex; flex-direction: column; gap: 12px")}>
                  <h3 style={S("font-size: 15px; font-weight: 700; margin: 0")}>
                    <Trans>Arabic</Trans>
                  </h3>

                  <AnnouncementField
                    label={<Trans>Title</Trans>}
                    value={titleAr}
                    onChange={setTitleAr}
                    placeholder={<Trans>Announcement title</Trans>}
                    rtl
                  />

                  <AnnouncementField
                    label={<Trans>Message</Trans>}
                    value={messageAr}
                    onChange={setMessageAr}
                    placeholder={<Trans>Write your announcement...</Trans>}
                    multiline
                    rtl
                  />
                </div>
              </div>

              {announcementError && (
                <MessageBox type="error">
                  {announcementError === "fillAnnouncementFields" ? (
                    <Trans>Please fill in all announcement fields.</Trans>
                  ) : announcementError === "enterAtLeastOneUser" ? (
                    <Trans>Enter at least one user ID.</Trans>
                  ) : announcementError === "maximumUsersAllowed" ? (
                    <Trans>Maximum 1000 users are allowed.</Trans>
                  ) : (
                    <Trans>Failed to send announcement.</Trans>
                  )}
                </MessageBox>
              )}

              {announcementSuccess && (
                <MessageBox type="success">
                  {announcementSuccess}
                </MessageBox>
              )}

              <div style={S("display: flex; justify-content: flex-end")}>
                <Button
                  type="button"
                  onClick={handleSendAnnouncement}
                  disabled={sending}
                  className="am-btn"
                  style={S(
                    "height: 44px; padding: 0 20px; background: var(--foreground); color: #fff; border: 1px solid var(--foreground); font-weight: 600"
                  )}
                >
                  <Send size={16} />
                  {sending ? (
                    <Trans>Sending...</Trans>
                  ) : (
                    <Trans>Send announcement</Trans>
                  )}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}

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
                locale={locale}
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
    </div>
  )
}

/* Notification card */

function NotificationCard({
  notification,
  locale,
  formatDate,
  reading,
  onMarkRead,
}: {
  notification: Notification
  locale: string
  formatDate: (date: string) => string
  reading: boolean
  onMarkRead: () => void
}) {
  const isArabic = locale === "ar"

  const notificationTypeLabel = (type: string) => {
    switch (type) {
      case "ANNOUNCEMENT":
        return <Trans>Announcement</Trans>
      case "TICKET_ASSIGNED":
        return <Trans>Ticket assigned</Trans>
      case "TICKET_UPDATED":
        return <Trans>Ticket updated</Trans>
      case "TICKET_RESOLVED":
        return <Trans>Ticket resolved</Trans>
      case "MAINTENANCE_REMINDER":
        return <Trans>Maintenance reminder</Trans>
      case "BOOKING_CREATED":
        return <Trans>Booking created</Trans>
      case "BOOKING_UPDATED":
        return <Trans>Booking updated</Trans>
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
                  title={isArabic ? "غير مقروء" : "Unread"}
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

function AnnouncementField({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  rtl = false,
}: {
  label: ReactNode
  value: string
  onChange: (value: string) => void
  placeholder: ReactNode
  multiline?: boolean
  rtl?: boolean
}) {
  const sharedStyle = S(
    "width: 100%; box-sizing: border-box; padding: 11px 12px; background: var(--background); color: var(--foreground); border: 1px solid var(--border); outline: none; font: inherit; font-size: 14px"
  )

  return (
    <div style={S("display: flex; flex-direction: column; gap: 6px")}>
      <label style={S("font-size: 13px; font-weight: 600")}>
        {label}
      </label>

      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={typeof placeholder === "string" ? placeholder : undefined}
          rows={4}
          dir={rtl ? "rtl" : "ltr"}
          style={{
            ...sharedStyle,
            resize: "vertical",
          }}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={typeof placeholder === "string" ? placeholder : undefined}
          dir={rtl ? "rtl" : "ltr"}
          style={{
            ...sharedStyle,
            height: "44px",
          }}
        />
      )}
    </div>
  )
}

/* Message box */

function MessageBox({
  children,
  type,
}: {
  children: ReactNode
  type: "error" | "success"
}) {
  const isError = type === "error"

  return (
    <div
      role={isError ? "alert" : "status"}
      style={S(
        `display: flex; align-items: flex-start; gap: 9px; padding: 12px 14px; border: 1px solid ${
          isError ? "var(--danger)" : "var(--good)"
        }; color: ${
          isError ? "var(--danger)" : "var(--good)"
        }; background: var(--card); font-size: 13px`
      )}
    >
      {isError ? (
        <AlertCircle size={17} style={{ flex: "none" }} />
      ) : (
        <CheckCheck size={17} style={{ flex: "none" }} />
      )}

      <span>{children}</span>
    </div>
  )
}