import type { CreatePlaceInput, Place, GetPlaceInput,getWorkerSchema,removeWorkerSchema } from "@amlak/shared";
import { prisma } from "../db.ts";
import { sendEmail } from "../email.ts";
import { AppError } from "../errors.ts";
import { toUser } from "../users/present.ts";
import { hashCode, newVerificationCode } from "../auth/codes.ts";
import { hashPassword, verifyPassword } from "../auth/passwords.ts";
import { endSession, type Session, startSession } from "../auth/sessions.ts";
import * as tokens from "../auth/tokens.ts";
import { auditLog } from "../../scripts/audit_log.ts";


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
  await auditLog({user_id: ownerId,
    action: "CREATE",
    entity_type: "PLACE",
    entity_id: place.id,
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
  await auditLog({user_id: ownerId,
    action: "GET",
    entity_type: "PLACE",
    entity_id: place.id,
});
  return place as Place;
}

export async function getPlaces(jwt_token: string): Promise<Place>{
    const ownerId = await userIdFromToken(jwt_token);
    const place = await prisma.place.findMany({
      where: { owner_id: ownerId },
    });
    await auditLog({
    user_id: ownerId,
    action: "GET",
    entity_type: "PLACE",
    entity_id: ownerId,
    });
    return place as Place
}

export async function deletePlace(input: GetPlaceInput, jwt_token: string): Promise<Place>{
  const ownerId = await userIdFromToken(jwt_token);
  try{
    const place = await prisma.place.delete({
    where: {id: input.place_id, owner_id: ownerId}
  })
  await auditLog({user_id: ownerId,
    action: "DELETE",
    entity_type: "PLACE",
    entity_id: input.place_id,
  });
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
  await auditLog({user_id: ownerId,
    action: "UPDATE",
    entity_type: "PLACE",
    entity_id: place_id.place_id,
  });
  return place as Place
}

export async function assignedPlace(jwt_token:string,place:GetPlaceInput){
  const ownerId = await userIdFromToken(jwt_token);
  const placeId = place.place_id;
  const isManager = await prisma.place.findFirst({
    where:{
      owner_id: ownerId,
      id: placeId
  }
  });
  if (!isManager){
    return {"message":"you don't authorized or worker not exist"};
  }
  const assigned = await prisma.placeWorker.findMany({
    where:{
      place_id:placeId
    },
    select:{
      id:true,
      place_id:true,
      worker:{
        select:{
          id:true,
          fullname:true,
          phone:true,
          status:true
        }
      },
      assigned_by:true,
      assigned_at:true,
      created_at:true,
      updated_at:true
    }
  });
  await auditLog({user_id: ownerId,
    action: "GET",
    entity_type: "PLACE",
    entity_id: placeId,
  });
  return assigned;

}


export async function assignWorker(jwt_token:string,place:GetPlaceInput,worker:getWorkerSchema){
  const ownerId = await userIdFromToken(jwt_token);
  const place_id = place.place_id;
  const worker_id = worker.worker_id;
  const isowner = await prisma.place.findFirst({
    where:{
      owner_id:ownerId
    }
  });
  if (!isowner){
    return {"message":"You don't have authorized"};
  }
  const assign = await prisma.placeWorker.create({
    data:{
      id:crypto.randomUUID(),
      place_id:place_id,
      worker_id:worker_id,
      assigned_by:ownerId,
      is_active:true
    },
    include:{
      worker:{
        select:{
        id:true,
        fullname:true,
        phone:true,
        status:true
      }
      }
    }
  });

  await auditLog({user_id: ownerId,
    action: "CREATE",
    entity_type: "PLACE",
    entity_id: assign.id,
  });
  return assign;


}

export async function unassign(jwt_token:string,place:removeWorkerSchema){
  const ownerId = await userIdFromToken(jwt_token);
  const place_id = place.place_id;
  const worker_id = place.worker_id;
  const isowner = await prisma.place.findFirst({
    where:{
      owner_id:ownerId,
      id:place_id
    }
  });
  if (!isowner){
    return {"message":"You don't have authorized"};
  }
  const assign = await prisma.placeWorker.findFirst({
    where:{
      place_id:place_id,
      worker_id:worker_id
    },
    select:{
      id:true
    }
  });
  if (!assign){
    return {"message":"you don't have authorized."};
  }
  const unassign = await prisma.placeWorker.delete({
    where:{
      id:assign.id
    }
  });
  await auditLog({user_id: ownerId,
    action: "DELETE",
    entity_type: "PLACE",
    entity_id: assign.id,
  });
  return unassign;

}