
import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { Trans } from "@lingui/react/macro"
import {
  UserRound,
  Mail,
  Phone,
  ShieldCheck,
  CalendarDays,
  Languages,
  Clock,
  PencilLine,
} from "lucide-react"

import { S } from "@/lib/dom-style"
import { useAuth } from "@/lib/auth"
import { getProfile, updateProfile } from "@/lib/api"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
})

interface Profile {
  id: string
  email: string
  fullname: string
  phone: string | null
  picture_url: string | null
  role: string
  status: string
  preferred_language: string
  email_verified_at: string | null
  manager_id: string | null
  created_at: string
  updated_at: string
}

function formatDate(value: string | null) {
  if (!value) return "—"

  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function ProfilePage() {
  const { accessToken } = useAuth()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!accessToken) return

    const loadProfile = async () => {
      try {
        setLoading(true)
        setError("")

        const data = await getProfile(accessToken)
        setProfile(data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load profile"
        )
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [accessToken])

  const handleUpdateProfile = () => {
    updateProfile()
  }

  if (loading) {
    return (
      <div style={S("padding: 40px 48px 56px")}>
        <Skeleton style={S("height: 36px; width: 220px; margin-bottom: 24px")} />
        <Skeleton style={S("height: 180px; margin-bottom: 20px")} />
        <Skeleton style={S("height: 300px")} />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div style={S("padding: 40px 48px 56px")}>
        <div style={S("color: var(--destructive); font-size: 14px")}>
          {error || "Profile not found"}
        </div>
      </div>
    )
  }

  const details = [
    {
      label: <Trans>Email Address</Trans>,
      value: profile.email,
      icon: Mail,
    },
    {
      label: <Trans>Phone Number</Trans>,
      value: profile.phone || "—",
      icon: Phone,
    },
    {
      label: <Trans>Role</Trans>,
      value: profile.role,
      icon: ShieldCheck,
    },
    {
      label: <Trans>Account Status</Trans>,
      value: profile.status,
      icon: UserRound,
    },
    {
      label: <Trans>Preferred Language</Trans>,
      value: profile.preferred_language.toUpperCase(),
      icon: Languages,
    },
    {
      label: <Trans>Email Verified At</Trans>,
      value: formatDate(profile.email_verified_at),
      icon: Mail,
    },
    {
      label: <Trans>Created At</Trans>,
      value: formatDate(profile.created_at),
      icon: CalendarDays,
    },
    {
      label: <Trans>Last Updated</Trans>,
      value: formatDate(profile.updated_at),
      icon: Clock,
    },
  ]

  return (
    <div
      style={S(
        "padding: 40px 48px 56px; width: 100%; box-sizing: border-box"
      )}
    >
      <div style={S("margin-bottom: 28px")}>
        <h1 style={S("font-size: 28px; font-weight: 700; margin: 0 0 8px")}>
          <Trans>My Profile</Trans>
        </h1>

        <p style={S("color: var(--muted-foreground); margin: 0")}>
          <Trans>View your account information.</Trans>
        </p>
      </div>

      <div style={S("display: flex; flex-direction: column; gap: 24px")}>
        {/* Profile Header */}
        <Card>
          <CardContent
            style={S(
              "padding: 24px; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap"
            )}
          >
            <div
              style={S(
                "display: flex; align-items: center; gap: 18px; min-width: 0"
              )}
            >
              <div
                style={S(
                  "width: 88px; height: 88px; border-radius: 50%; overflow: hidden; background: var(--muted); display: flex; align-items: center; justify-content: center; flex-shrink: 0"
                )}
              >
                {profile.picture_url ? (
                  <img
                    src={profile.picture_url}
                    alt={profile.fullname}
                    style={S("width: 100%; height: 100%; object-fit: cover")}
                  />
                ) : (
                  <UserRound
                    size={38}
                    style={S("color: var(--muted-foreground)")}
                  />
                )}
              </div>

              <div style={S("display: flex; flex-direction: column; gap: 7px; min-width: 0")}>
                <h2 style={S("font-size: 21px; font-weight: 700; margin: 0")}>
                  {profile.fullname}
                </h2>

                <span
                  style={S(
                    "font-size: 14px; color: var(--muted-foreground); overflow-wrap: anywhere"
                  )}
                >
                  {profile.email}
                </span>

                <span
                  style={S(
                    "font-size: 12px; font-weight: 600; color: var(--primary)"
                  )}
                >
                  <Trans>{profile.role}</Trans>
                </span>
              </div>
            </div>

            <Button type="button" onClick={handleUpdateProfile}>
              <PencilLine size={16} />
              <Trans>Update Profile</Trans>
            </Button>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>
              <Trans>Personal Information</Trans>
            </CardTitle>
          </CardHeader>

          <CardContent
            style={S(
              "padding: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px"
            )}
          >
            {details.map((item, index) => {
              const Icon = item.icon

              return (
                <div
                  key={index}
                  style={S("display: flex; align-items: flex-start; gap: 12px")}
                >
                  <div
                    style={S(
                      "width: 38px; height: 38px; border-radius: 8px; background: var(--muted); display: flex; align-items: center; justify-content: center; flex-shrink: 0"
                    )}
                  >
                    <Icon
                      size={18}
                      style={S("color: var(--muted-foreground)")}
                    />
                  </div>

                  <div
                    style={S(
                      "display: flex; flex-direction: column; gap: 6px; min-width: 0"
                    )}
                  >
                    <span
                      style={S(
                        "font-size: 12px; color: var(--muted-foreground)"
                      )}
                    >
                      {item.label}
                    </span>

                    <strong
                      style={S(
                        "font-size: 14px; font-weight: 600; overflow-wrap: anywhere"
                      )}
                    >
                      {item.value}
                    </strong>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
