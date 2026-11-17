import { t } from "@lingui/core/macro"

/**
 * An error response from the API: { code, message, details }. The message is
 * the server's English text, kept for logs; users see errorMessage().
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: Record<string, unknown>

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.details = details && typeof details === "object" ? (details as Record<string, unknown>) : {}
  }

  /** The fields named in details.fields (validation and some conflicts). */
  get fields(): string[] {
    const fields = this.details.fields
    return fields && typeof fields === "object" ? Object.keys(fields) : []
  }
}

/** Builds an ApiError from a failed response's status and parsed body. */
export function apiError(status: number, body: unknown): ApiError {
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {}
  return new ApiError(
    status,
    typeof b.code === "string" ? b.code : codeForStatus(status),
    typeof b.message === "string" ? b.message : `Request failed with ${status}`,
    b.details,
  )
}

/** Reads a failed response's body (JSON or nothing) into an ApiError. */
export async function readApiError(response: Response): Promise<ApiError> {
  const body = await response.json().catch(() => null)
  return apiError(response.status, body)
}

function codeForStatus(status: number): string {
  switch (status) {
    case 401:
      return "UNAUTHENTICATED"
    case 403:
      return "FORBIDDEN"
    case 404:
      return "NOT_FOUND"
    case 409:
      return "CONFLICT"
    case 422:
      return "VALIDATION_ERROR"
    case 429:
      return "RATE_LIMITED"
    default:
      return "INTERNAL_ERROR"
  }
}

/** The user-facing name of a field the API reports in details.fields. */
export function fieldLabel(field: string): string {
  switch (field.split(".")[0]) {
    case "email":
    case "guest_email":
      return t`Email`
    case "password":
      return t`Password`
    case "phone":
    case "guest_phone":
      return t`Phone number`
    case "fullname":
      return t`Full name`
    case "guest_name":
      return t`Guest name`
    case "place_name":
      return t`Place name`
    case "place_type":
      return t`Place type`
    case "city":
      return t`City`
    case "address":
      return t`Address`
    case "latitude":
      return t`Latitude`
    case "longitude":
      return t`Longitude`
    case "monthly_maintenance_budget":
      return t`Monthly budget`
    case "name":
      return t`Asset name`
    case "type":
      return t`Type`
    case "status":
      return t`Status`
    case "purchase_date":
      return t`Purchase date`
    case "title":
      return t`Title`
    case "slug":
      return t`Slug`
    case "body":
      return t`Body`
    case "language":
    case "preferred_language":
      return t`Language`
    case "subject":
      return t`Subject`
    case "description":
      return t`Description`
    case "priority":
      return t`Priority`
    case "photos":
      return t`Photos`
    case "due_date":
    case "next_due_date":
      return t`Due date`
    case "assignee_id":
    case "default_assignee_id":
      return t`Assignee`
    case "estimated_cost":
      return t`Estimated cost`
    case "actual_cost":
      return t`Actual cost`
    case "reason":
      return t`Reason`
    case "check_in_date":
      return t`Check-in`
    case "check_out_date":
      return t`Check-out`
    case "guest_count":
      return t`Guests`
    case "total_price":
      return t`Total price`
    case "amount":
      return t`Amount`
    case "category":
      return t`Category`
    case "expense_date":
      return t`Expense date`
    case "interval_count":
    case "interval_unit":
      return t`Repeat every`
    case "lead_days":
      return t`Reminder before due date`
    case "code":
      return t`Verification code`
    default:
      return t`another field`
  }
}

/**
 * A translated message for any error, chosen by the API's code and details.
 * The server's message is never shown: an unknown code gets a general text.
 */
export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    // A network failure, or a response the page could not read.
    return t`Something went wrong. Try again.`
  }

  const { code, details } = error
  const fields = error.fields

  if (details.reason === "EMAIL_NOT_VERIFIED") {
    return t`Verify your email first — we sent a 6-digit code.`
  }
  if (details.reason === "BEFORE_CHECK_IN_DATE") {
    return t`The guest cannot check in before the check-in date.`
  }
  if (details.reason === "PLACE_OCCUPIED") {
    return t`Another guest is staying at the place. Check them out first.`
  }

  switch (code) {
    case "VALIDATION_ERROR": {
      if (fields.length === 0) return t`Some fields are not valid.`
      const names = [...new Set(fields.map(fieldLabel))].join(t`, `)
      return t`Check these fields: ${names}.`
    }
    case "CONFLICT":
      if (fields.includes("place_name")) return t`That place name is already taken.`
      if (fields.includes("slug")) return t`This slug is already used in this language.`
      if (fields.includes("email")) return t`This email is already registered.`
      if (Array.isArray(details.ticket_ids)) {
        return t`Open maintenance tickets are in the way. Complete, reject or reassign them first.`
      }
      if (Array.isArray(details.booking_ids)) {
        return t`This place has current or upcoming stays.`
      }
      return t`This clashes with the current data. Reload the page and try again.`
    case "UNAUTHENTICATED":
      return t`Your session has ended. Sign in again.`
    case "INVALID_CREDENTIALS":
      return t`The email or password is not correct.`
    case "ACCOUNT_NOT_ACTIVE":
      return t`This account is not active.`
    case "FORBIDDEN":
      return t`You do not have permission to do this.`
    case "NOT_FOUND":
      return t`We could not find it. It may have been deleted.`
    case "RATE_LIMITED":
      return t`Too many attempts. Wait a little and try again.`
    default:
      return t`Something went wrong. Try again.`
  }
}
