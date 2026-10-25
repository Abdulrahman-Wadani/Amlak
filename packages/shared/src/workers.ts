import { z } from "zod";


export type UserRole = "ADMIN" | "MANAGER" | "WORKER";

export interface AssignedPlace {
  id: string;
  place_name: string;
}

// Request: fields the user is allowed to send
export const updateWorkerSchema = z.object({
  email: z.string().email(),
  fullname: z.string().trim().min(1),
  phone: z.string().nullable().optional(),
  preferred_language: z.enum(["ar", "en"]),
});

export type UpdateWorkerInput = z.infer<typeof updateWorkerSchema>;

// Route parameter: worker ID
export const getWorkerSchema = z.object({
  worker_id: z.string().uuid(),
});


// Response: complete worker object returned by the API
export const WorkerSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullname: z.string(),
  phone: z.string().nullable(),
  picture_path: z.string().nullable(),
  role: z.enum(["ADMIN", "MANAGER", "WORKER"]),
  status: z.enum([
    "INVITED",
    "PENDING_VERIFICATION",
    "ACTIVE",
    "DEACTIVATED",
  ]),
  preferred_language: z.enum(["ar", "en"]),
  email_verified_at: z.string().datetime().nullable(),
  manager_id: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  assigned_places: z.array(
    z.object({
      id: z.string().uuid(),
      place_name: z.string(),
    })
  ),
});

export type WorkerResponse = z.infer<typeof WorkerSchema>;


export const PutWorkerSchema = z.object({
  email: z.string().email(),
  fullname: z.string().trim().min(1),
  phone: z.string().nullable().optional(),
  preferred_language: z.enum(["ar", "en"]),
  status: z.enum([
    "ACTIVE",
    "DEACTIVATED",
  ]),
});

export type PutWorkerSchema = z.infer<typeof updateWorkerSchema>;
