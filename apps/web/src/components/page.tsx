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
  /** The page's h1, in the navy band (the phone top bar shows it too). */
  title: ReactNode
  /**
   * The short name in the phone top bar (e.g. "Place"). Without it the top
   * bar shows `title`.
   */
  phoneTitle?: ReactNode
  /** On the phone, the band's line under the title instead of `description`. */
  phoneSubtitle?: ReactNode
  /** A link under the title. On the phone, the top bar's back button. */
  parent?: PageParent
  /** Phone only: a back button to this page, when there is no parent link. */
  phoneBack?: LinkProps
  /** The line under the title. */
  description?: ReactNode
  /** The page's buttons at the end of the band, right before the bell (the bell is always last). */
  actions?: ReactNode
  /** Phone: show `actions` in the band. Off when the top bar has the action. */
  phoneActions?: boolean
  /** Phone top bar start: the logo (home screens), nothing, or "back" (to the previous page). A parent gives a back button to it. */
  phoneStart?: "logo" | "none" | "back"
  /** Phone top bar end: the bell, nothing, or the page's main action. */
  phoneEnd?: "bell" | "none" | TopBarAction
  /** Desktop: the bell at the end of the band. */
  bell?: boolean
  /** Phone: the bottom tabs. Forms hide them. */
  tabs?: boolean
  children: ReactNode
}

/**
 * Every signed-in page: one container (1240px with 40px padding, centered;
 * 16px padding on the phone), the navy band as its header, then the content.
 *
 * The band has a fixed minimum height and the same layout on every page: the
 * title and one line under it at the start, the page's buttons and then the
 * bell at the end, centred, so the bell is in the same place everywhere. On
 * the phone its parts stack in one column and the bell is in the top bar.
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
  const phoneLine = phoneSubtitle ?? description

  return (
    <div className="mx-auto flex w-full max-w-[1240px] min-w-0 flex-1 flex-col">
      {bar &&
        createPortal(
          <PhoneBar title={phoneTitle ?? title} start={start} back={back} end={end} />,
          bar,
        )}
      <main className="box-border flex w-full min-w-0 flex-col gap-4 p-4 desk:gap-6 desk:px-10 desk:pt-8 desk:pb-14">
        <header className="am-band am-rise box-border flex min-h-(--band-min-h) min-w-0 flex-col justify-center gap-5 bg-foreground p-6 text-white desk:flex-row desk:items-center desk:justify-between desk:gap-8 desk:p-8">
          <div className="flex min-w-0 flex-col gap-2.5 desk:flex-1">
            {/* On the phone the top bar holds the page's h1, so here the title is not a second one. */}
            <h1 className="m-0 hidden text-[28px] leading-[1.35] font-bold [overflow-wrap:anywhere] desk:block">{title}</h1>
            <p className="m-0 text-[22px] leading-[1.35] font-bold [overflow-wrap:anywhere] desk:hidden">{title}</p>
            {parent && (
              <div className="hidden desk:block">
                <Link
                  {...parent.link}
                  activeOptions={{ exact: true }}
                  className="relative inline-flex items-center gap-1 text-[15px] font-medium text-white underline underline-offset-4 before:absolute before:inset-x-0 before:-inset-y-2.5 before:content-[''] hover:text-white"
                >
                  <NavIcon name="back" size={16} />
                  {parent.label}
                </Link>
              </div>
            )}
            {description && (
              <p className={phoneSubtitle ? "m-0 hidden text-[15px] text-info-200 desk:block" : "m-0 text-[15px] text-info-200"}>
                {description}
              </p>
            )}
            {phoneSubtitle && <p className="m-0 text-[15px] text-info-200 desk:hidden">{phoneLine}</p>}
          </div>
          {/* The page's buttons, then the bell at the edge: the same order and place on every page. */}
          {(actions || bell) && (
            <div className={phoneActions && actions ? "flex flex-none flex-wrap items-center gap-3" : "hidden flex-none items-center gap-3 desk:flex"}>
              {actions}
              {bell && (
                <span className="hidden desk:inline-flex">
                  <NotificationBell />
                </span>
              )}
            </div>
          )}
        </header>
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
