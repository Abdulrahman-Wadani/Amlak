import { useEffect, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { Link, useRouter, type LinkProps } from "@tanstack/react-router"
import { t } from "@lingui/core/macro"
import { NavIcon } from "@/lib/nav"
import { NotificationBell } from "@/components/notification-bell"
import { Brand } from "@/components/app-shell"
import { useShell, type TopBarAction } from "@/components/shell-context"

export interface PageParent {
  label: ReactNode
  link: LinkProps
}

export interface PageProps {
  /** The page's h1 on desktop. */
  title: ReactNode
  /**
   * The short name in the phone top bar (e.g. "Place"). When set, `title`
   * shows at the top of the page on the phone, as in the design's detail
   * screens; otherwise the top bar shows `title` and the page does not repeat it.
   */
  phoneTitle?: ReactNode
  /** On the phone, a line under the in-page title (only with `phoneTitle`). */
  phoneSubtitle?: ReactNode
  /** Desktop: a link under the title. Phone: the top bar's back button. */
  parent?: PageParent
  /** Phone only: a back button to this page, when the desktop shows no parent link. */
  phoneBack?: LinkProps
  /** Desktop: a grey line under the title. */
  description?: ReactNode
  /** Buttons at the end of the header, right before the bell (the bell is always the last item). */
  actions?: ReactNode
  /** Phone: show `actions` at the top of the page. Off when the top bar has the action. */
  phoneActions?: boolean
  /** Phone top bar start: the logo (home screens), nothing, or "back" (to the previous page). A parent gives a back button to it. */
  phoneStart?: "logo" | "none" | "back"
  /** Phone top bar end: the bell, nothing, or the page's main action. */
  phoneEnd?: "bell" | "none" | TopBarAction
  /** Desktop: the bell in the header. */
  bell?: boolean
  /**
   * Desktop: the shared header. `"bell"` keeps only the bell row, in the same
   * place as on every other page, for a page whose own banner holds the h1
   * (notifications). `false` hides the header.
   */
  header?: boolean | "bell"
  /** Phone: the bottom tabs. Forms hide them. */
  tabs?: boolean
  children: ReactNode
}

/**
 * Every signed-in page: one container (1240px with 40px padding, centered;
 * 16px padding on the phone) and the shared header (title, parent link or
 * description, bell and buttons).
 */
export function Page({
  title,
  phoneTitle,
  phoneSubtitle,
  parent,
  phoneBack,
  description,
  actions,
  phoneActions = true,
  phoneStart,
  phoneEnd,
  bell = true,
  header = true,
  tabs = true,
  children,
}: PageProps) {
  const { bar, setTabs } = useShell()

  useEffect(() => {
    setTabs(tabs)
    return () => setTabs(true)
  }, [tabs, setTabs])

  const back = parent?.link ?? phoneBack
  const start = back ? "back" : (phoneStart ?? "none")
  const end = phoneEnd ?? (back ? "none" : "bell")

  return (
    <div className="mx-auto flex w-full max-w-[1240px] min-w-0 flex-1 flex-col">
      {bar &&
        createPortal(
          <PhoneBar title={phoneTitle ?? title} start={start} back={back} end={end} />,
          bar,
        )}
      <header className={header ? "hidden items-start justify-between gap-4 px-10 pt-8 desk:flex" : "hidden"}>
        {header === true ? (
          <div className="flex min-w-0 flex-1 flex-col">
            {/* The title row is as tall as the bell, so the bell sits at the same height on every page. */}
            <div className="flex min-h-11 items-center">
              <h1 className="m-0 text-[28px] leading-[1.3] font-bold">{title}</h1>
            </div>
            {parent ? (
              <div className="text-[15px] text-muted-foreground">
                <Link
                  {...parent.link}
                  activeOptions={{ exact: true }}
                  className="relative inline-flex items-center gap-1 text-[15px] font-medium underline underline-offset-4 before:absolute before:inset-x-0 before:-inset-y-2.5 before:content-['']"
                >
                  <NavIcon name="back" size={16} />
                  {parent.label}
                </Link>
              </div>
            ) : description ? (
              <div className="text-[15px] text-muted-foreground">{description}</div>
            ) : null}
          </div>
        ) : (
          <div className="min-w-0 flex-1" />
        )}
        {/* The bell is always last, at the edge; the page's buttons sit right next to it. */}
        {(bell || actions) && (
          <div className="flex flex-none items-center gap-3">
            {actions}
            {bell && <NotificationBell />}
          </div>
        )}
      </header>
      <main className="box-border flex w-full min-w-0 flex-col gap-4 p-4 desk:gap-6 desk:px-10 desk:pt-7 desk:pb-14">
        {(phoneTitle || (phoneActions && actions)) && (
          <div className="flex flex-col gap-4 desk:hidden">
            {phoneTitle && (
              <div className="flex flex-col gap-1">
                <span className="text-[22px] leading-[1.3] font-bold">{title}</span>
                {phoneSubtitle && <span className="text-sm text-muted-foreground">{phoneSubtitle}</span>}
              </div>
            )}
            {phoneActions && actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
          </div>
        )}
        {children}
      </main>
    </div>
  )
}

function PhoneBar({
  title,
  start,
  back,
  end,
}: {
  title: ReactNode
  start: "logo" | "none" | "back"
  back?: LinkProps
  end: "bell" | "none" | TopBarAction
}) {
  const router = useRouter()
  const icon = "am-icon inline-flex size-11 flex-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-foreground"
  return (
    <>
      {start === "logo" ? (
        <span className="flex size-11 flex-none items-center justify-center">
          <Brand size="phone" />
        </span>
      ) : start === "back" ? (
        back ? (
          <Link {...back} activeOptions={{ exact: true }} aria-label={t`Back`} className={icon}>
            <NavIcon name="back" size={22} />
          </Link>
        ) : (
          <button type="button" aria-label={t`Back`} onClick={() => router.history.back()} className={icon}>
            <NavIcon name="back" size={22} />
          </button>
        )
      ) : (
        <span aria-hidden="true" className="w-11 flex-none" />
      )}
      <h1 className="m-0 min-w-0 flex-1 truncate text-center text-lg leading-[1.3] font-bold">{title}</h1>
      {end === "bell" ? (
        <NotificationBell />
      ) : end === "none" ? (
        <span aria-hidden="true" className="w-11 flex-none" />
      ) : end.link ? (
        <Link {...end.link} activeOptions={{ exact: true }} aria-label={end.label} className={icon}>
          <NavIcon name={end.icon} size={22} />
        </Link>
      ) : (
        <button type="button" aria-label={end.label} onClick={end.onClick} className={icon}>
          <NavIcon name={end.icon} size={22} />
        </button>
      )}
    </>
  )
}
