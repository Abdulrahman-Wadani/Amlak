export type PlaceStatus = "ACTIVE" | "INACTIVE";
export interface Place {
  id: string;
  place_name: string;
  place_type: string;
  city: string;
  address: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  status: PlaceStatus;
  monthly_maintenance_budget: number;
  currency: string;
  timezone: string;
  created_at: Date;
  updated_at: Date;
  owner_id: string;
}

import { z } from "zod";

export const createPlaceSchema = z.object({
  place_name: z.string().trim().min(1),
  place_type: z.string().trim().min(1),
  city: z.string().trim().min(1),
  address: z.string().optional(),
  description: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  status: z
    .enum(["ACTIVE", "INACTIVE", "UNDER_MAINTENANCE"])
    .optional(),
  monthly_maintenance_budget: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  timezone: z.string().min(1).optional(),
});

export type CreatePlaceInput = z.infer<typeof createPlaceSchema>;

export const getPlaceSchema = z.object({
  place_id: z.string().trim().min(1),
});

export type GetPlaceInput = z.infer<typeof getPlaceSchema>;


export const removeWorkerSchema = z.object({
  place_id: z.string().uuid(),
  worker_id: z.string().uuid(),
});

export type RemoveWorkerInput = z.infer<typeof removeWorkerSchema>;
