
import type {
  Asset,
  CreateAssetInput,
  CreatePlaceInput,
  Place,
  WorkerResponse,
} from "@amlak/shared"

// API response types
interface ApiResponse<T> {
  data: T
  message?: string
  pagination?: {
    page: number
    page_size: number
    total: number
    total_pages: number
  }
}

function normalizePlace(p: Place): Place {
  return {
    ...p,
    monthly_maintenance_budget: Number(
      p.monthly_maintenance_budget,
    ),
  }
}

// Extract data from the API response.
// Supports both { data: ... } and the old direct response.
function unwrapResponse<T>(response: unknown): T {
  if (
    response !== null &&
    typeof response === "object" &&
    "data" in response
  ) {
    return (response as ApiResponse<T>).data
  }

  return response as T
}

async function apiRequest<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
    credentials: "same-origin",
  })

  const response: unknown = await res.json().catch(() => null)

  if (!res.ok) {
    const message =
      response &&
      typeof response === "object" &&
      "message" in response
        ? String((response as { message: unknown }).message)
        : `${path} failed with ${res.status}`

    throw new Error(message)
  }

  return unwrapResponse<T>(response)
}

// Places
export function getPlaces(token: string): Promise<Place[]> {
  return apiRequest<Place[]>("/places", token).then((data) => {
    if (!Array.isArray(data)) {
      throw new Error("/places returned no list")
    }

    return data.map(normalizePlace)
  })
}

export function getPlace(
  token: string,
  placeId: string,
): Promise<Place> {
  return apiRequest<Place>(`/places/${placeId}`, token).then(
    (data) => {
      if (!data || typeof data.id !== "string") {
        throw new Error("place not found")
      }

      return normalizePlace(data)
    },
  )
}

export function getPlaceAssets(
  token: string,
  placeId: string,
): Promise<Asset[]> {
  return apiRequest<Asset[]>(
    `/places/${placeId}/assets`,
    token,
  ).then((data) => {
    if (!Array.isArray(data)) {
      throw new Error("/assets returned no list")
    }

    return data
  })
}

export async function createAsset(
  token: string,
  placeId: string,
  input: CreateAssetInput,
): Promise<Asset> {
  const asset = await apiRequest<Asset>(
    `/places/${placeId}/assets`,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        ...input,
        status: input.status ?? "GOOD",
      }),
    },
  )

  if (!asset || typeof asset.id !== "string") {
    throw new Error("asset not created")
  }

  return asset
}

// Create place
export class PlaceNameTakenError extends Error {}

export async function createPlace(
  token: string,
  input: CreatePlaceInput,
): Promise<Place> {
  try {
    const place = await apiRequest<Place | string>(
      "/places",
      token,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    )

    if (typeof place === "string") {
      throw new PlaceNameTakenError(place)
    }

    if (!place || typeof place.id !== "string") {
      throw new Error("place not created")
    }

    return normalizePlace(place)
  } catch (error) {
    if (error instanceof PlaceNameTakenError) {
      throw error
    }

    throw error
  }
}

// Workers
export function getWorkers(
  token: string,
): Promise<WorkerResponse[]> {
  return apiRequest<WorkerResponse[]>("/workers", token).then(
    (data) => {
      if (!Array.isArray(data)) {
        throw new Error("/workers returned no list")
      }

      return data
    },
  )
}

export function getWorkerById(
  token: string,
  id: string,
): Promise<WorkerResponse> {
  return apiRequest<WorkerResponse>(`/workers/${id}`, token).then(
    (data) => {
      if (!data || typeof data.id !== "string") {
        throw new Error("worker not found")
      }

      return data
    },
  )
}

export async function createWorker(
  accessToken: string,
  payload: {
    fullname: string
    email: string
    phone: string
    preferred_language?: "ar" | "en"
  },
): Promise<WorkerResponse> {
  const worker = await apiRequest<WorkerResponse>(
    "/workers",
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  )

  if (!worker || typeof worker.id !== "string") {
    throw new Error("worker not created")
  }

  return worker
}

// Update place
export async function updatePlace(
  accessToken: string,
  placeId: string,
  data: {
    place_name: string
    place_type: string
    city: string
    address: string | null
    description: string | null
    monthly_maintenance_budget: number
    latitude: number | null
    longitude: number | null
    currency: string
    timezone: string
    status: "ACTIVE" | "INACTIVE"
  },
): Promise<Place> {
  const place = await apiRequest<Place>(
    `/places/${placeId}`,
    accessToken,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
  )

  if (!place || typeof place.id !== "string") {
    throw new Error("Failed to update place")
  }

  return normalizePlace(place)
}

export async function deleteWorker(
  token: string,
  workerId: string
): Promise<void> {
  const response = await fetch(`/api/v1/workers/${workerId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const result = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      result?.message ?? `Delete failed (${response.status})`
    )
  }
}

export async function getAssetById(
  token: string,
  assetId: string,
): Promise<Asset> {
  return apiRequest<Asset>(`/assets/${assetId}`, token).then(
    (data) => {
      if (!data || typeof data.id !== "string") {
        throw new Error("asset not found")
      }

      return data
    },
  )
}

export async function getTicketsForPlace(
  token: string,
  placeId: string,
) {
  const response = await fetch(`/api/v1/tickets?place_id=${placeId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "same-origin",
  }).then((res) => res.json())

  return response.data;
}

export async function getTicketById(
  token: string,
  ticketId: string,
) {
  const response = await fetch(`/api/v1/tickets/${ticketId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "same-origin",
  }).then((res) => res.json())

  return response;
}

export async function expenseslist(
  token: string,
  placeId: string,
): Promise<Blob> {
return expense.data;
}

// for test now only
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"

export interface CreateTicketInput {
  asset_id?: string
  priority?: TicketPriority
  description?: string
  photos?: File[]
}

export async function createTicket(
  token: string,
  placeId: string,
  input: CreateTicketInput,
) {
  const formData = new FormData()

  if (input.asset_id) {
    formData.append("asset_id", input.asset_id)
  }

  if (input.priority) {
    formData.append("priority", input.priority)
  }

  if (input.description) {
    formData.append("description", input.description)
  }

  for (const photo of input.photos ?? []) {
    formData.append("photos", photo)
  }

  const res = await fetch(`/api/v1/places/${placeId}/tickets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
    credentials: "same-origin",
  })

  const response: unknown = await res.json().catch(() => null)

  if (!res.ok) {
    const message =
      response &&
      typeof response === "object" &&
      "message" in response
        ? String((response as { message: unknown }).message)
        : `Create ticket failed with ${res.status}`

    throw new Error(message)
  }

  return unwrapResponse(response)
}
// maintinance buttons

export interface ApproveTicketInput {
  assignee_id: string;
  due_date: string;
  estimated_cost: number;
}

export interface RejectTicketInput {
  reason: string;
}

export interface ReassignTicketInput {
  assignee_id: string;
  due_date: string;
}

export interface CompleteTicketInput {
  actual_cost: number;
  completion_notes?: string;
  photos: File[];
}

async function ticketRequest<T>(
  token: string,
  ticketId: string,
  action: string,
  body: object | FormData,
): Promise<T> {
  const isFormData = body instanceof FormData;

  const response = await fetch(
    `/api/v1/tickets/${ticketId}/${action}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
      },
      body: isFormData ? body : JSON.stringify(body),
    },
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || result.error || `Failed to ${action} ticket`,
    );
  }

  return result as T;
}

// 1. Approve ticket
export async function approveTicket(
  token: string,
  ticketId: string,
  input: ApproveTicketInput,
) {
  return ticketRequest(
    token,
    ticketId,
    "approve",
    input,
  );
}

// 2. Reject ticket
export async function rejectTicket(
  token: string,
  ticketId: string,
  input: RejectTicketInput,
) {
  return ticketRequest(
    token,
    ticketId,
    "reject",
    input,
  );
}

// 3. Reassign ticket
export async function reassignTicket(
  token: string,
  ticketId: string,
  input: ReassignTicketInput,
) {
  return ticketRequest(
    token,
    ticketId,
    "reassign",
    input,
  );
}

// 4. Complete ticket
export async function completeTicket(
  token: string,
  ticketId: string,
  input: CompleteTicketInput,
) {
  const formData = new FormData();

  formData.append("actual_cost", String(input.actual_cost));

  if (input.completion_notes) {
    formData.append("completion_notes", input.completion_notes);
  }

  input.photos.forEach((photo) => {
    formData.append("photos", photo);
  });

  return ticketRequest(
    token,
    ticketId,
    "complete",
    formData,
  );
}



export async function getScheduledMaintenancesForAsset(
  token: string,
  assetId: string,
) {
  return apiRequest(`/assets/${assetId}/maintenance-schedules`, token)
}


export type IntervalUnit = "DAY" | "WEEK" | "MONTH" | "YEAR"

export interface CreateMaintenanceScheduleInput {
  description: string
  interval_count: number
  interval_unit: IntervalUnit
  next_due_date: string
  lead_days?: number
  default_assignee_id?: string
}

export async function createMaintenanceSchedule(
  token: string,
  assetId: string,
  input: CreateMaintenanceScheduleInput
) {
  const response = await fetch(
    `/api/v1/assets/${assetId}/maintenance-schedules`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify(input),
    }
  )

  const data: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message
        : "Failed to create maintenance schedule"

    throw new Error(message)
  }

  return data
}

export async function handleCancelSchedule(
  token: string,
  scheduleId: string
) {
  const response = await fetch(
    `/api/v1/maintenance-schedules/${scheduleId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: "same-origin",
    }
  )
  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null)
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message
        : "Failed to cancel maintenance schedule"

    throw new Error(message)
  }
  return document.location.reload()
}


export async function updateProfile(
  accessToken: string,
  data: {
    fullname: string
    phone: string | null
    preferred_language: string
    picture?: File | null
  }
) {
  const formData = new FormData()

  formData.append("fullname", data.fullname)
  formData.append("phone", data.phone || "")
  formData.append("preferred_language", data.preferred_language)

  if (data.picture) {
    formData.append("picture", data.picture)
  }

  const response = await fetch("/api/v1/users/me", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const result = await response.json().catch(() => null)
    throw new Error(result?.message || "Failed to update profile")
  }

  return response.json()
}

export async function getProfile(token: string) {
  return apiRequest('/users/me', token)
}

export async function getUsers(token: string){
  return apiRequest('/users', token)
}

export type UserResponse = {
  id: string
  email: string
  fullname: string
  phone: string | null
  picture_url: string | null
  role: "ADMIN" | "MANAGER" | "WORKER"
  status:
    | "INVITED"
    | "PENDING_VERIFICATION"
    | "ACTIVE"
    | "DEACTIVATED"
  preferred_language: "ar" | "en"
  email_verified_at: string | null
  manager_id: string | null
  created_at: string
  updated_at: string
}

type UserApiResponse = {
  data?: UserResponse
  message?: string
}

export async function getUserById(
  accessToken: string,
  userId: string,
): Promise<UserResponse> {
  const response = await fetch(`/api/v1/users/${userId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const result = (await response.json().catch(() => null)) as
    | UserApiResponse
    | UserResponse
    | null

  if (!response.ok) {
    throw new Error(
      result && "message" in result
        ? result.message
        : `Failed to get user (${response.status})`,
    )
  }

  if (!result) {
    throw new Error("Invalid user response")
  }

  const user =
    "data" in result && result.data
      ? result.data
      : (result as UserResponse)

  return user
}

export type UpdateUserInput = {
  fullname: string
  phone: string | null
  role: UserResponse["role"]
  status: UserResponse["status"]
  preferred_language: UserResponse["preferred_language"]
}

export async function updateUser(
  accessToken: string,
  userId: string,
  payload: UpdateUserInput,
): Promise<UserResponse> {
  const response = await fetch(`/api/v1/users/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })

  const result = (await response.json().catch(() => null)) as
    | UserApiResponse
    | UserResponse
    | null

  if (!response.ok) {
    throw new Error(
      result && "message" in result
        ? result.message
        : `Failed to update user (${response.status})`,
    )
  }

  if (!result) {
    throw new Error("Invalid update response")
  }

  return "data" in result && result.data
    ? result.data
    : (result as UserResponse)
}

export async function getSupportTicket(token:string){
  return apiRequest('/support-tickets',token)
}

type createSpTicket = {
  subject:string,
  description:string
}
export async function createSupportTicket(token:string,input:[]){
  const res = await fetch('/api/v1/support-tickets',
    {
      method:"POST",
      headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
    }
  )
  return res
}


export async function getSupportTicketById(token:string,ticket:string){
  return apiRequest(`/support-tickets/${ticket}`,token)
}

export async function resolveSupportTicket(
  token: string,
  ticketId: string,
  admin_response: string
) {
  const response = await fetch(
    `/api/v1/support-tickets/${ticketId}/resolve`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ admin_response }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || result.error || "Failed to resolve ticket");
  }

  return result;
}


export type ContentLanguage = "ar" | "en"

export interface WebContent {
  id: string
  author_id: string
  title: string
  language: ContentLanguage
  slug: string
  body: string
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface ContentPagination {
  page: number
  page_size: number
  total: number
  total_pages: number
}

export interface ContentListResponse {
  data: WebContent[]
  pagination: ContentPagination
}

export interface GetContentsParams {
  language?: ContentLanguage
  slug?: string
  page?: number
  page_size?: number
}

export interface CreateContentInput {
  title: string
  language: ContentLanguage
  slug: string
  body: string
  is_published?: boolean
}

export interface UpdateContentInput {
  title?: string
  slug?: string
  body?: string
  is_published?: boolean
}

export async function getContents(
  token: string,
  params: GetContentsParams = {},
): Promise<ContentListResponse> {
  const query = new URLSearchParams()

  if (params.language) query.set("language", params.language)
  if (params.slug) query.set("slug", params.slug)
  if (params.page) query.set("page", String(params.page))
  if (params.page_size) query.set("page_size", String(params.page_size))

  const response = await fetch(
    `/api/v1/content${query.size ? `?${query.toString()}` : ""}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: "same-origin",
    },
  )

  const result = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      result?.message || `Failed to get content (${response.status})`,
    )
  }

  if (!result || !Array.isArray(result.data) || !result.pagination) {
    throw new Error("Invalid content list response")
  }

  return result
}

export async function getContentById(
  token: string,
  contentId: string,
): Promise<WebContent> {
  return apiRequest<WebContent>(`/content/${contentId}`, token).then(
    (content) => {
      if (!content || typeof content.id !== "string") {
        throw new Error("Content not found")
      }

      return content
    },
  )
}

export async function createContent(
  token: string,
  input: CreateContentInput,
): Promise<WebContent> {
  return apiRequest<WebContent>("/content", token, {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function updateContent(
  token: string,
  contentId: string,
  input: UpdateContentInput,
): Promise<WebContent> {
  return apiRequest<WebContent>(`/content/${contentId}`, token, {
    method: "PUT",
    body: JSON.stringify(input),
  })
}

export async function deleteContent(
  token: string,
  contentId: string,
): Promise<void> {
  const response = await fetch(`/api/v1/content/${contentId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "same-origin",
  })

  if (!response.ok) {
    const result = await response.json().catch(() => null)

    throw new Error(
      result?.message || `Failed to delete content (${response.status})`,
    )
  }
}


export interface DashboardPlace {
  place_id: string
  place_name: string
  status: string

  assets: {
    GOOD: number
    NEEDS_MAINTENANCE: number
    UNDER_MAINTENANCE: number
    OUT_OF_SERVICE: number
  }

  open_tickets: {
    PENDING_REVIEW: number
    APPROVED: number
    overdue: number
  }

  today: {
    check_ins: number
    check_outs: number
  }

  maintenance_budget: {
    currency: string
    budget: number
    spent: number
    remaining: number
  } | null
}

export interface DashboardResponse {
  data: DashboardPlace[]
  pagination: {
    page: number
    page_size: number
    total: number
    total_pages: number
  }
}

export async function getDashboard(
  token: string,
  params?: {
    place_id?: string
    page?: number
    page_size?: number
  }
): Promise<DashboardResponse> {
  const query = new URLSearchParams()

  if (params?.place_id) query.set("place_id", params.place_id)
  if (params?.page) query.set("page", String(params.page))
  if (params?.page_size) query.set("page_size", String(params.page_size))

  const response = await fetch(
    `/api/v1/dashboard${query.toString() ? `?${query.toString()}` : ""}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  )

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch dashboard")
  }

  return result
}


export interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  sender_id: string | null
  created_at: string
  updated_at: string
}

export interface NotificationsResponse {
  data: Notification[]
  pagination: {
    page: number
    page_size: number
    total: number
    total_pages: number
  }
  unread_count: number
}

export interface SendAnnouncementInput {
  role?: "ADMIN" | "MANAGER" | "WORKER"
  user_ids?: string[]
  title_en: string
  message_en: string
  title_ar: string
  message_ar: string
}

export async function getNotifications(
  token: string,
  params?: {
    is_read?: boolean
    page?: number
    page_size?: number
  }
): Promise<NotificationsResponse> {
  const query = new URLSearchParams()

  if (params?.is_read !== undefined) {
    query.set("is_read", String(params.is_read))
  }

  if (params?.page !== undefined) {
    query.set("page", String(params.page))
  }

  if (params?.page_size !== undefined) {
    query.set("page_size", String(params.page_size))
  }

  const response = await fetch(
    `/api/v1/notifications${query.toString() ? `?${query}` : ""}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch notifications")
  }

  return result
}

export async function markNotificationAsRead(
  token: string,
  notificationId: string
): Promise<Notification> {
  const response = await fetch(
    `/api/v1/notifications/${notificationId}/read`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || "Failed to mark notification as read")
  }

  return result
}

export async function sendAnnouncement(
  token: string,
  input: SendAnnouncementInput
): Promise<{ recipient_count: number }> {
  const response = await fetch("/api/v1/notifications", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || "Failed to send announcement")
  }

  return result
}