import { Link } from "@tanstack/react-router"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react"
import { NavIcon } from "@/lib/nav"
import { useUnread } from "@/components/shell-context"
import { formatNumber } from "@/lib/format"

/** The bell: a 44px link to the notifications, with the unread count from the API. */
export function NotificationBell() {
  const { i18n } = useLingui()
  const { unread } = useUnread()
  const count = formatNumber(unread, i18n.locale)
  return (
    <Link
      to="/notifications"
      aria-label={unread > 0 ? t`Notifications, ${count} unread` : t`Notifications`}
      className="am-icon relative inline-flex size-11 flex-none items-center justify-center text-foreground no-underline"
    >
      <NavIcon name="bell" size={22} />
      {unread > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-1 end-0.5 box-border h-[18px] min-w-[18px] rounded-full border-2 border-white bg-crit-900 px-[5px] text-center text-[11px] leading-[14px] font-bold text-white"
        >
          {unread > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  )
}
