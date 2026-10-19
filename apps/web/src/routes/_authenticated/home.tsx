import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_authenticated/home")({
  component: Home,
})

function Home() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-4xl font-extrabold">Portfolio</h2>
      <p className="font-mono text-sm">
        Property cards + work orders land here.
      </p>
    </section>
  )
}
