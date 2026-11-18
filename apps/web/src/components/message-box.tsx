import type { ReactNode } from "react"
import { AlertCircle, CheckCheck } from "lucide-react"
import { S } from "@/lib/dom-style"

export function MessageBox({
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