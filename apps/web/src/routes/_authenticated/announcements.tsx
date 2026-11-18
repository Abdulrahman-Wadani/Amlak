import { useState, type ReactNode } from "react"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { Megaphone, Send, Users } from "lucide-react"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react"
import { storedUser, useAuth } from "@/lib/auth"
import { sendAnnouncement } from "@/lib/api"
import { S } from "@/lib/dom-style"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageBox } from "@/components/message-box"
import { Page } from "@/components/page"

// Admin only: sends an announcement, which reaches people as a notification.
export const Route = createFileRoute("/_authenticated/announcements")({
  beforeLoad: () => {
    if (storedUser()?.role !== "ADMIN") {
      throw redirect({ to: "/home" })
    }
  },
  component: AnnouncementsPage,
})

type AnnouncementRole = "ADMIN" | "MANAGER" | "WORKER"

function AnnouncementsPage() {
  const { i18n } = useLingui()
  const { accessToken } = useAuth()
  const locale = i18n.locale === "ar" ? "ar" : "en"
  const [announcementOpen, setAnnouncementOpen] = useState(true)
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
        t`Announcement sent successfully to ${money(result.recipient_count)} users.`
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

  return (
    <Page title={<Trans>Announcements</Trans>} phoneStart="logo" phoneEnd="none">
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
                      {t`Admin`}
                    </option>
                    <option value="MANAGER">
                      {t`Manager`}
                    </option>
                    <option value="WORKER">
                      {t`Worker`}
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
                    placeholder={t`UUID 1, UUID 2...`}
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
    </Page>
  )
}

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

