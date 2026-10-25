import { Link, createFileRoute } from "@tanstack/react-router"
import { S } from "@/lib/dom-style"

/** Placeholder. */
export const Route = createFileRoute("/_authenticated/profile")({
  component: Stub,
})

function Stub() {
  return (
    <div
      style={S(
        "display: flex; flex-direction: column; gap: 8px; padding: 32px 24px"
      )}
    >
      <h1 style={S("font-size: 26px; font-weight: 700")}>Profile</h1>
      <p style={S("color: #5C6B7E")}>
        {" "}
        <Link to="/home" style={S("color: #1B2430; font-weight: 600")}>
          عد إلى الرئيسية
        </Link>
      </p>
    </div>
  )
}
