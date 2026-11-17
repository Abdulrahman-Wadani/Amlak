
import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import { Trans } from "@lingui/react/macro"
import { i18n } from "@lingui/core"
import { useLingui } from "@lingui/react"
import { useLanguage } from "@/lib/i18n"
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
export function changeLanguage(language: "ar" | "en") {
  i18n.activate(language)

  document.documentElement.lang = language
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr"
}
function formatDate(value: string | null, locale: string) {
  if (!value) return "—"

  return new Date(value).toLocaleDateString(
    locale === "ar" ? "ar-SA" : "en",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  )
}

function ProfilePage() {
  const { accessToken } = useAuth()
  const { i18n } = useLingui()
  const { lang, setLang } = useLanguage()

  const isArabic = lang === "ar"
  const locale = lang

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

  const messages = {
    loading: isArabic ? "جارٍ التحميل..." : "Loading...",
    failedLoad: isArabic ? "تعذر تحميل الملف الشخصي." : "Failed to load profile.",
    failedUpdate: isArabic ? "تعذر تحديث الملف الشخصي." : "Failed to update profile.",
    invalidImage: isArabic ? "يرجى اختيار صورة صالحة." : "Please select a valid image.",
    imageTooLarge: isArabic ? "يجب ألا يتجاوز حجم الصورة 5 ميجابايت." : "Image size must not exceed 5MB.",
    fullNameRequired: isArabic ? "الاسم الكامل مطلوب." : "Full name is required.",
    updated: isArabic ? "تم تحديث الملف الشخصي بنجاح." : "Profile updated successfully.",
    saving: isArabic ? "جارٍ الحفظ..." : "Saving...",
    save: isArabic ? "حفظ التغييرات" : "Save Changes",
    cancel: isArabic ? "إلغاء" : "Cancel",
    edit: isArabic ? "تعديل الملف الشخصي" : "Update Profile",
    chooseImage: isArabic ? "اختر صورة" : "Choose Image",
    fullName: isArabic ? "الاسم الكامل" : "Full Name",
    phone: isArabic ? "رقم الهاتف" : "Phone Number",
    language: isArabic ? "اللغة المفضلة" : "Preferred Language",
    picture: isArabic ? "الصورة الشخصية" : "Profile Picture",
    email: isArabic ? "البريد الإلكتروني" : "Email Address",
    role: isArabic ? "الصلاحية" : "Role",
    status: isArabic ? "حالة الحساب" : "Account Status",
    verified: isArabic ? "تاريخ التحقق من البريد" : "Email Verified At",
    created: isArabic ? "تاريخ إنشاء الحساب" : "Created At",
    updatedAt: isArabic ? "آخر تحديث" : "Last Updated",
    myProfile: isArabic ? "ملفي الشخصي" : "My Profile",
    description: isArabic ? "عرض معلومات حسابك الشخصية." : "View your account information.",
    editInfo: isArabic ? "تعديل المعلومات الشخصية" : "Edit Personal Information",
    personalInfo: isArabic ? "المعلومات الشخصية" : "Personal Information",
    enterName: isArabic ? "أدخل اسمك الكامل" : "Enter your full name",
    enterPhone: isArabic ? "أدخل رقم الهاتف" : "Enter phone number",
    leaveImage: isArabic ? "اترك الحقل فارغًا للاحتفاظ بالصورة الحالية." : "Leave empty to keep the current picture.",
    active: isArabic ? "نشط" : "Active",
    invited: isArabic ? "مدعو" : "Invited",
    pending: isArabic ? "بانتظار التحقق" : "Pending Verification",
    deactivated: isArabic ? "معطل" : "Deactivated",
    admin: isArabic ? "مدير النظام" : "Admin",
    manager: isArabic ? "مالك" : "Manager",
    worker: isArabic ? "عامل" : "Worker",
  }

  function translateStatus(value: string) {
    const statuses: Record<string, string> = {
      ACTIVE: messages.active,
      INVITED: messages.invited,
      PENDING_VERIFICATION: messages.pending,
      DEACTIVATED: messages.deactivated,
    }

    return statuses[value] ?? value
  }

  function translateRole(value: string) {
    const roles: Record<string, string> = {
      ADMIN: messages.admin,
      MANAGER: messages.manager,
      WORKER: messages.worker,
    }

    return roles[value] ?? value
  }

  useEffect(() => {
    if (!accessToken) return

    let alive = true

    const loadProfile = async () => {
      try {
        setLoading(true)
        setError("")

        const data = await getProfile(accessToken)

        if (!alive) return

        if (data.preferred_language === "ar" || data.preferred_language === "en") {
          setLang(data.preferred_language)
        }

        if (!alive) return

        setProfile(data)
        setPreview(data.picture_url)

        setForm({
          fullname: data.fullname,
          phone: data.phone || "",
          preferred_language: data.preferred_language || "en",
          picture: null,
        })
      } catch (err) {
        if (alive) {
          setError(
            err instanceof Error ? err.message : messages.failedLoad,
          )
        }
      } finally {
        if (alive) setLoading(false)
      }
    }

    void loadProfile()

    return () => {
      alive = false
    }
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
    value: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleImageChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError(messages.invalidImage)
      event.target.value = ""
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(messages.imageTooLarge)
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
    setError(messages.fullNameRequired)
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

    // تحديث لغة الموقع بالكامل
    if (
      updatedProfile.preferred_language === "ar" ||
      updatedProfile.preferred_language === "en"
    ) {
      setLang(updatedProfile.preferred_language)
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
    setSuccess(messages.updated)
  } catch (err) {
    setError(
      err instanceof Error ? err.message : messages.failedUpdate,
    )
  } finally {
    setSaving(false)
  }
}

  if (loading) {
    return (
      <div dir={isArabic ? "rtl" : "ltr"} style={S("padding: 40px 48px 56px")}>
        <Skeleton style={S("height: 36px; width: 220px; margin-bottom: 24px")} />
        <Skeleton style={S("height: 180px; margin-bottom: 20px")} />
        <Skeleton style={S("height: 300px")} />
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div dir={isArabic ? "rtl" : "ltr"} style={S("padding: 40px 48px 56px")}>
        <div style={S("color: var(--destructive); font-size: 14px")}>
          {error}
        </div>
      </div>
    )
  }

  if (!profile) return null

  const details = [
    {
      label: messages.email,
      value: profile.email,
      icon: Mail,
    },
    {
      label: messages.phone,
      value: profile.phone || "—",
      icon: Phone,
    },
    {
      label: messages.role,
      value: translateRole(profile.role),
      icon: ShieldCheck,
    },
    {
      label: messages.status,
      value: translateStatus(profile.status),
      icon: UserRound,
    },
    {
      label: messages.language,
      value: profile.preferred_language.toUpperCase(),
      icon: Languages,
    },
    {
      label: messages.verified,
      value: formatDate(profile.email_verified_at, locale),
      icon: Mail,
    },
    {
      label: messages.created,
      value: formatDate(profile.created_at, locale),
      icon: CalendarDays,
    },
    {
      label: messages.updatedAt,
      value: formatDate(profile.updated_at, locale),
      icon: Clock,
    },
  ]

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      style={S("padding: 40px 48px 56px; width: 100%; box-sizing: border-box")}
    >
      <div style={S("margin-bottom: 28px")}>
        <h1 style={S("font-size: 28px; font-weight: 700; margin: 0 0 8px")}>
          {messages.myProfile}
        </h1>

        <p style={S("color: var(--muted-foreground); margin: 0")}>
          {messages.description}
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
              "padding: 24px; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap",
            )}
          >
            <div
              style={S(
                "display: flex; align-items: center; gap: 18px; min-width: 0",
              )}
            >
              <div
                style={S(
                  "width: 88px; height: 88px; border-radius: 50%; overflow: hidden; background: var(--muted); display: flex; align-items: center; justify-content: center; flex-shrink: 0",
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
                  {translateRole(profile.role)}
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
                    {saving ? messages.saving : messages.save}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    <X size={16} />
                    {messages.cancel}
                  </Button>
                </>
              ) : (
                <Button type="button" onClick={handleEdit}>
                  <PencilLine size={16} />
                  {messages.edit}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Form */}
        {editing && (
          <Card>
            <CardHeader>
              <CardTitle>{messages.editInfo}</CardTitle>
            </CardHeader>

            <CardContent
              style={S(
                "padding: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px",
              )}
            >
              <div style={S("display: flex; flex-direction: column; gap: 8px")}>
                <label>{messages.fullName}</label>
                <input
                  value={form.fullname}
                  onChange={(e) => handleChange("fullname", e.target.value)}
                  placeholder={messages.enterName}
                  style={S("padding: 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--background); color: var(--foreground)")}
                />
              </div>

              <div style={S("display: flex; flex-direction: column; gap: 8px")}>
                <label>{messages.phone}</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder={messages.enterPhone}
                  style={S("padding: 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--background); color: var(--foreground)")}
                />
              </div>

              <div style={S("display: flex; flex-direction: column; gap: 8px")}>
                <label>{messages.language}</label>
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
                <label>{messages.picture}</label>

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
                  {messages.chooseImage}
                </Button>

                {form.picture && (
                  <span style={S("font-size: 12px; color: var(--muted-foreground); overflow-wrap: anywhere")}>
                    {form.picture.name}
                  </span>
                )}

                {editing && (
                  <span style={S("font-size: 11px; color: var(--muted-foreground)")}>
                    {messages.leaveImage}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>{messages.personalInfo}</CardTitle>
          </CardHeader>

          <CardContent
            style={S(
              "padding: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px",
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
                      "width: 38px; height: 38px; border-radius: 8px; background: var(--muted); display: flex; align-items: center; justify-content: center; flex-shrink: 0",
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
