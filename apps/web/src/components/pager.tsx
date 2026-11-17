import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { S } from "@/lib/dom-style"
import { Button } from "@/components/ui/button"

/** Previous / next buttons with "Page 2 of 5". Renders nothing for one page. */
export function Pager({
  page,
  totalPages,
  onPage,
}: {
  page: number
  totalPages: number
  onPage: (page: number) => void
}) {
  if (totalPages <= 1) return null

  return (
    <nav
      aria-label={t`Pages`}
      style={S(
        "display: flex; align-items: center; justify-content: center; gap: 12px; font-size: 14px",
      )}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        <Trans>Previous</Trans>
      </Button>
      <span aria-live="polite">
        <Trans>
          Page {page} of {totalPages}
        </Trans>
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        <Trans>Next</Trans>
      </Button>
    </nav>
  )
}
