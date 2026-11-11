
import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
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
  Save,
  X,
  Camera,
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

interface ProfileForm {
  fullname: string
  phone: string
  preferred_language: string
  picture: File | null
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

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [form, setForm] = useState<ProfileForm>({
    fullname: "",
    phone: "",
    preferred_language: "en",
    picture: null,
  })

  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) return

    const loadProfile = async () => {
      try {
        setLoading(true)
        setError("")

        const data = await getProfile(accessToken)

        setProfile(data)
        setPreview(data.picture_url)

        setForm({
          fullname: data.fullname,
          phone: data.phone || "",
          preferred_language: data.preferred_language || "en",
          picture: null,
        })
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

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) {
        URL.revokeObjectURL(preview)
      }
    }
  }, [preview])

  const handleChange = (
    field: keyof Omit<ProfileForm, "picture">,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleImageChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image")
      event.target.value = ""
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must not exceed 5MB")
      event.target.value = ""
      return
    }

    setError("")

    setForm((prev) => ({
      ...prev,
      picture: file,
    }))

    setPreview(URL.createObjectURL(file))
  }

  const handleEdit = () => {
    if (!profile) return

    setForm({
      fullname: profile.fullname,
      phone: profile.phone || "",
      preferred_language: profile.preferred_language || "en",
      picture: null,
    })

    setPreview(profile.picture_url)
    setError("")
    setSuccess("")
    setEditing(true)
  }

  const handleCancel = () => {
    if (!profile) return

    setForm({
      fullname: profile.fullname,
      phone: profile.phone || "",
      preferred_language: profile.preferred_language || "en",
      picture: null,
    })

    setPreview(profile.picture_url)
    setEditing(false)
    setError("")
  }

  const handleUpdateProfile = async () => {
    if (!accessToken || !profile) return

    if (!form.fullname.trim()) {
      setError("Full name is required")
      return
    }

    try {
      setSaving(true)
      setError("")
      setSuccess("")

      const response = await updateProfile(accessToken, {
        fullname: form.fullname.trim(),
        phone: form.phone.trim() || null,
        preferred_language: form.preferred_language,
        picture: form.picture,
      })

      const updatedProfile: Profile = response?.data
        ? response.data
        : response?.fullname
          ? response
          : {
              ...profile,
              fullname: form.fullname.trim(),
              phone: form.phone.trim() || null,
              preferred_language: form.preferred_language,
              picture_url: form.picture
                ? preview
                : profile.picture_url,
            }

      setProfile(updatedProfile)

      setForm({
        fullname: updatedProfile.fullname,
        phone: updatedProfile.phone || "",
        preferred_language: updatedProfile.preferred_language,
        picture: null,
      })

      setPreview(updatedProfile.picture_url)
      setEditing(false)
      setSuccess("Profile updated successfully")
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update profile"
      )
    } finally {
      setSaving(false)
    }
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

  if (error && !profile) {
    return (
      <div style={S("padding: 40px 48px 56px")}>
        <div style={S("color: var(--destructive); font-size: 14px")}>
          {error}
        </div>
      </div>
    )
  }

  if (!profile) return null

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
      value: <Trans>profile.status</Trans>,
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

      {error && (
        <div style={S("color: var(--destructive); font-size: 14px; margin-bottom: 16px")}>
          {error}
        </div>
      )}

      {success && (
        <div style={S("color: var(--primary); font-size: 14px; margin-bottom: 16px")}>
          {success}
        </div>
      )}

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
                {preview ? (
                  <img
                    src={preview}
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
                  {editing ? form.fullname : profile.fullname}
                </h2>

                <span style={S("font-size: 14px; color: var(--muted-foreground); overflow-wrap: anywhere")}>
                  {profile.email}
                </span>

                <span style={S("font-size: 12px; font-weight: 600; color: var(--primary)")}>
                  <Trans>{profile.role}</Trans>
                </span>
              </div>
            </div>

            <div style={S("display: flex; gap: 10px; flex-wrap: wrap")}>
              {editing ? (
                <>
                  <Button
                    type="button"
                    onClick={handleUpdateProfile}
                    disabled={saving || !form.fullname.trim()}
                  >
                    <Save size={16} />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    <X size={16} />
                    Cancel
                  </Button>
                </>
              ) : (
                <Button type="button" onClick={handleEdit}>
                  <PencilLine size={16} />
                  <Trans>Update Profile</Trans>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Form */}
        {editing && (
          <Card>
            <CardHeader>
              <CardTitle>
                <Trans>Edit Personal Information</Trans>
              </CardTitle>
            </CardHeader>

            <CardContent
              style={S(
                "padding: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px"
              )}
            >
              <div style={S("display: flex; flex-direction: column; gap: 8px")}>
                <label>Full Name</label>
                <input
                  value={form.fullname}
                  onChange={(e) => handleChange("fullname", e.target.value)}
                  placeholder="Enter your full name"
                  style={S("padding: 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--background); color: var(--foreground)")}
                />
              </div>

              <div style={S("display: flex; flex-direction: column; gap: 8px")}>
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="Enter phone number"
                  style={S("padding: 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--background); color: var(--foreground)")}
                />
              </div>

              <div style={S("display: flex; flex-direction: column; gap: 8px")}>
                <label>Preferred Language</label>
                <select
                  value={form.preferred_language}
                  onChange={(e) => handleChange("preferred_language", e.target.value)}
                  style={S("padding: 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--background); color: var(--foreground)")}
                >
                  <option value="en">English</option>
                  <option value="ar">العربية</option>
                </select>
              </div>

              <div style={S("display: flex; flex-direction: column; gap: 8px")}>
                <label>Profile Picture</label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={S("display: none")}
                />

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera size={16} />
                  Choose Image
                </Button>

                {form.picture && (
                  <span style={S("font-size: 12px; color: var(--muted-foreground); overflow-wrap: anywhere")}>
                    {form.picture.name}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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

                  <div style={S("display: flex; flex-direction: column; gap: 6px; min-width: 0")}>
                    <span style={S("font-size: 12px; color: var(--muted-foreground)")}>
                      {item.label}
                    </span>

                    <strong style={S("font-size: 14px; font-weight: 600; overflow-wrap: anywhere")}>
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
