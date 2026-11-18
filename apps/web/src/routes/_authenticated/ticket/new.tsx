import { useEffect, useState, type FormEvent } from "react"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { Camera, CircleAlert, TriangleAlert, Wrench } from "lucide-react"
import type { Asset, Place, Ticket } from "@amlak/shared"
import { useAuth } from "@/lib/auth"
import { createTicket, getPlaceAssets, getPlaces, listTickets, type TicketPriority } from "@/lib/api"
import { errorMessage } from "@/lib/errors"
import { useFormat } from "@/lib/format"
import { Button, buttonVariants } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "cn"
import { Page } from "@/components/page"
import {
  Field,
  FormButtons,
  NativeSelect,
  Panel,
  PanelTitle,
  PhoneActionBar,
  Segmented,
  TwoColumns,
} from "@/components/panel"
import { PhotoPicker } from "@/components/photo-picker"
import { TicketChip } from "@/components/ticket-parts"

export const Route = createFileRoute("/_authenticated/ticket/new")({
  component: ReportDamage,
  validateSearch: (search: Record<string, unknown>): { place_id?: string } =>
    typeof search.place_id === "string" && search.place_id ? { place_id: search.place_id } : {},
})

type FieldKey = "place" | "description"

/** Report damage: the place (chosen here, or given by the place page), the asset, photos, what happened and how urgent. */
function ReportDamage() {
  const { accessToken } = useAuth()
  const navigate = useNavigate()
  const search = Route.useSearch()

  const [places, setPlaces] = useState<Place[] | null>(null)
  const [placeId, setPlaceId] = useState(search.place_id ?? "")
  const [assets, setAssets] = useState<Asset[]>([])
  const [assetId, setAssetId] = useState("")
  const [photos, setPhotos] = useState<File[]>([])
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM")
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [formError, setFormError] = useState("")
  const [sending, setSending] = useState(false)
  const [earlier, setEarlier] = useState<Ticket[] | null>(null)

  useEffect(() => {
    if (!accessToken) return
    let alive = true
    getPlaces(accessToken)
      .then((list) => {
        if (!alive) return
        setPlaces(list)
        // One place: nothing to choose.
        if (!search.place_id && list.length === 1) setPlaceId(list[0].id)
      })
      .catch(() => alive && setPlaces([]))
    return () => {
      alive = false
    }
  }, [accessToken, search.place_id])

  useEffect(() => {
    setAssetId("")
    setAssets([])
    setEarlier(null)
    if (!accessToken || !placeId) return
    let alive = true
    getPlaceAssets(accessToken, placeId)
      .then((list) => alive && setAssets(list))
      .catch(() => {})
    listTickets(accessToken, { place_id: placeId }, 1, 3)
      .then((result) => alive && setEarlier(result.data))
      .catch(() => alive && setEarlier([]))
    return () => {
      alive = false
    }
  }, [accessToken, placeId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken) return
    const next: Partial<Record<FieldKey, string>> = {}
    if (!placeId) next.place = t`Choose the place.`
    if (!description.trim()) next.description = t`Write what happened.`
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSending(true)
    setFormError("")
    try {
      const created = (await createTicket(accessToken, placeId, {
        asset_id: assetId || undefined,
        priority,
        description: description.trim(),
        photos,
      })) as Partial<Ticket> | null
      if (created?.id) await navigate({ to: "/ticket/$ticket_id", params: { ticket_id: created.id } })
      else await navigate({ to: "/tickets" })
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  const send = (
    <Button type="submit" form="report-form" disabled={sending}>
      {sending ? <Trans>Sending…</Trans> : <Trans>Send report</Trans>}
    </Button>
  )

  return (
    <Page
      title={<Trans>Report damage</Trans>}
      description={<Trans>The report goes to the place manager for review.</Trans>}
      phoneStart="back"
      phoneEnd="none"
      tabs={false}
    >
      <TwoColumns
        main={
          <Panel pad="lg">
            <form id="report-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
              <Field id="r-place" label={<Trans>Place</Trans>} error={errors.place}>
                <NativeSelect id="r-place" value={placeId} onChange={setPlaceId} invalid={Boolean(errors.place)}>
                  <option value="" disabled>
                    {places === null ? t`Loading…` : t`Choose the place`}
                  </option>
                  {places?.map((place) => (
                    <option key={place.id} value={place.id}>
                      {place.place_name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field
                id="r-asset"
                label={<Trans>Asset</Trans>}
                hint={<Trans>Choose “No specific asset” if the problem is general.</Trans>}
              >
                <NativeSelect id="r-asset" value={assetId} onChange={setAssetId} disabled={!placeId}>
                  <option value="">{t`No specific asset`}</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold">
                  <Trans>Photos</Trans>
                </span>
                <PhotoPicker
                  photos={photos}
                  onChange={setPhotos}
                  label={<Trans>Take a photo</Trans>}
                  hint={<Trans>Add photos that show the damage.</Trans>}
                />
              </div>

              <Field id="r-desc" label={<Trans>What happened?</Trans>} error={errors.description}>
                <Textarea
                  id="r-desc"
                  rows={3}
                  dir="auto"
                  value={description}
                  aria-invalid={errors.description ? true : undefined}
                  aria-describedby={errors.description ? "r-desc-error" : undefined}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>

              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold">
                  <Trans>Priority</Trans>
                </span>
                <Segmented
                  label={t`Priority`}
                  value={priority}
                  onChange={setPriority}
                  options={[
                    { key: "LOW", label: <Trans>Low</Trans> },
                    { key: "MEDIUM", label: <Trans>Medium</Trans> },
                    { key: "HIGH", label: <Trans>High</Trans> },
                    { key: "URGENT", label: <Trans>Urgent</Trans> },
                  ]}
                />
              </div>

              {formError && (
                <p role="alert" className="m-0 flex items-center gap-1.5 text-[13px] text-destructive">
                  <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
                  {formError}
                </p>
              )}

              <div className="hidden desk:block">
                <FormButtons>
                  <Link to="/tickets" className={cn(buttonVariants({ variant: "outline" }))}>
                    <Trans>Cancel</Trans>
                  </Link>
                  {send}
                </FormButtons>
              </div>
            </form>
            <PhoneActionBar>{send}</PhoneActionBar>
          </Panel>
        }
        side={
          <>
            <Panel>
              <PanelTitle small>
                <Trans>For a clearer report</Trans>
              </PanelTitle>
              <Tip icon={<Camera />} tone="info">
                <Trans>One close photo of the damage, and one from further back that shows where it is.</Trans>
              </Tip>
              <Tip icon={<Wrench />} tone="info">
                <Trans>Pick the asset if you know it, so the report is linked to it.</Trans>
              </Tip>
              <Tip icon={<TriangleAlert />} tone="warn">
                <Trans>“Urgent” only when a guest or the place is affected right now.</Trans>
              </Tip>
            </Panel>
            {placeId && earlier && earlier.length > 0 && <EarlierReports tickets={earlier} />}
          </>
        }
      />
    </Page>
  )
}

function Tip({ icon, tone, children }: { icon: React.ReactNode; tone: "info" | "warn"; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 text-sm leading-[1.6]">
      <span
        aria-hidden="true"
        className={`inline-flex size-8 flex-none items-center justify-center [&_svg]:size-4 [&_svg]:stroke-[1.8] ${tone === "warn" ? "bg-warn-50 text-warn" : "bg-info-50 text-info"}`}
      >
        {icon}
      </span>
      <span>{children}</span>
    </div>
  )
}

function EarlierReports({ tickets }: { tickets: Ticket[] }) {
  const { relative } = useFormat()
  return (
    <Panel>
      <PanelTitle small>
        <Trans>Earlier reports at this place</Trans>
      </PanelTitle>
      <div className="flex flex-col gap-3">
        {tickets.map((ticket) => (
          <Link
            key={ticket.id}
            to="/ticket/$ticket_id"
            params={{ ticket_id: ticket.id }}
            className="am-lift box-border flex flex-col gap-2 border border-border bg-card p-3.5 text-foreground no-underline"
          >
            <span dir="auto" className="truncate font-semibold">
              {ticket.description}
            </span>
            <span className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted-foreground">
              {relative(ticket.created_at)}
              <TicketChip ticket={ticket} />
            </span>
          </Link>
        ))}
      </div>
    </Panel>
  )
}
