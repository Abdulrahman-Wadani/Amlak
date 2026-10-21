import { createFileRoute } from "@tanstack/react-router"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getPlaces, getTickets } from "@/lib/api"

export const Route = createFileRoute("/_authenticated/home")({
  loader: () => Promise.all([getPlaces(), getTickets()]),
  component: Home,
})

function Home() {
  const [places, tickets] = Route.useLoaderData()
  return (
    <div className="flex flex-col gap-6 p-6">
      <section>
        <h2 className="mb-3 font-heading text-2xl">Portfolio</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {places.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle>{p.place_name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <span className="text-sm text-muted-forground">
                  {p.place_type} - {p.address}, {p.city}
                </span>
                <Badge>{p.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-3 font-heading text-2x">Work orders</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Work order</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Assignee</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.description}</TableCell>
                <TableCell>{t.place.place_name}</TableCell>
                <TableCell>{t.priority}</TableCell>
                <TableCell>{t.status}</TableCell>
                <TableCell>{t.due_date}</TableCell>
                <TableCell>{t.assignee?.fullname ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  )
}
