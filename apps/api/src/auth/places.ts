import type { CreatePlaceInput, Place, GetPlaceInput } from "@amlak/shared";
import { prisma } from "../db.ts";
import { sendEmail } from "../email.ts";
import { AppError } from "../errors.ts";
import { toUser } from "../users/present.ts";
import { hashCode, newVerificationCode } from "./codes.ts";
import { hashPassword, verifyPassword } from "./passwords.ts";
import { endSession, type Session, startSession } from "./sessions.ts";
import * as tokens from "./tokens.ts";

async function userIdFromToken(token: string): Promise<string> {
  const payload = await tokens.verifyAccessToken(token);
  return payload.user_id;
}

export async function createPlace(
  input: CreatePlaceInput,
  token: string
): Promise<Place> {
  const existing = await prisma.place.findFirst({
    where: { place_name: input.place_name,owner_id: input.owner_id },
  });

  if (existing) {
    return "This place name is already registered for this owner";
  }
  const ownerId = await userIdFromToken(token);
  const place = await prisma.place.create({
    data: {
      ...input,
      owner_id: ownerId,
      status: input.status ?? "ACTIVE",
      monthly_maintenance_budget:
        input.monthly_maintenance_budget ?? 0,
      currency: input.currency ?? "SAR",
      timezone: input.timezone ?? "Asia/Riyadh",
      id: crypto.randomUUID(),
    },
  });

  return place as Place;


}


export async function getPlacesById(input : GetPlaceInput,jwt_token: string): Promise<Place> {
  const ownerId = await userIdFromToken(jwt_token);
  const place = await prisma.place.findFirst({
    where: { id: input.place_id, owner_id: ownerId },
  });
  if (!place) {
    return {"message":"place not found"};
  }
  return place as Place;
}

export async function getPlaces(jwt_token: string): Promise<Place>{
    const ownerId = await userIdFromToken(jwt_token);
    const place = await prisma.place.findMany({
      where: { owner_id: ownerId },
    });

    return place as Place
}

export async function deletePlace(input: GetPlaceInput, jwt_token: string): Promise<Place>{
  const ownerId = await userIdFromToken(jwt_token);
  try{
    const place = await prisma.place.delete({
    where: {id: input.place_id, owner_id: ownerId}
  })
  
  return "Place removed Successfully"
  }
  catch(error){
    return "Place by this Id not exist"
  }
}

export async function editPlace(input: CreatePlaceInput,jwt_token: string,place_id: GetPlaceInput): Promise<Place>{
  const ownerId = await userIdFromToken(jwt_token);
  const place = await prisma.place.update({
    where: {id:place_id.place_id, owner_id:ownerId},
    data:input
  })
  return place as Place
}