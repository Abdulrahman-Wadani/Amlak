import { prisma } from "../db.ts";
import type {
  CreateAssetInput,
  UpdateAssetInput,
} from "@amlak/shared";
import { AppError } from "../errors.ts";
import * as tokens from "../auth/tokens.ts";

async function userIdFromToken(token: string) {
  const payload = await tokens.verifyAccessToken(token);
  return {user_id:payload.user_id,role:payload.role};
}


export async function getPlaceAssets(placeId: string,jwt_token:string) {
  const ownerId = (await userIdFromToken(jwt_token)).user_id;
  const place = await prisma.place.findUnique({
    where: { id: placeId },
  });

  if (!place) {
    throw new AppError("NOT_FOUND", "Place not found");
  }

  return prisma.asset.findMany({
    where: {
      place_id: placeId,
      deleted_at: null,
    },
  });
}

export async function createAsset(
  placeId: string,
  input: CreateAssetInput,
  jwt_token:string
) {
  const ownerId = (await userIdFromToken(jwt_token)).user_id;
  const place = await prisma.place.findUnique({
    where: { id: placeId },
  });

  if (!place) {
    throw new AppError("NOT_FOUND", "Place not found");
  }
  if (place.owner_id != ownerId){
    throw new AppError("FORBIDDEN","you don't have authorization");
  }

  return prisma.asset.create({
    data: {
      place_id: placeId,
      name: input.name,
      type: input.type,
      status: input.status ?? "ACTIVE",
      purchase_date: input.purchase_date ?? null,
    },
  });
}

export async function getAsset(assetId: string) {
  const asset = await prisma.asset.findFirst({
    where: {
      id: assetId,
    },
  });

  if (!asset) {
    throw new AppError("NOT_FOUND", "Asset not found");
  }


  return asset;
}

export async function updateAsset(
  assetId: string,
  input: UpdateAssetInput,
  jwt_token: string
) {
  const ownerId = (await userIdFromToken(jwt_token)).user_id;
  const asset = await prisma.asset.findFirst({
    where: {
      id: assetId,
    },
  });

  if (!asset) {
    throw new AppError("NOT_FOUND", "Asset not found");
  }
  const place = await prisma.place.findFirst({
    where:{
      id:asset.place_id
    }
  })
  if (place.owner_id != ownerId){
    throw new AppError("FORBIDDEN", "YOU DON'T HVAE AUTHORIZED");
  }


  return prisma.asset.update({
    where: { id: assetId },
    data: input,
  });
}

export async function deleteAsset(assetId: string,jwt_token: string) {
  const ownerId = (await userIdFromToken(jwt_token)).user_id;
  const asset = await prisma.asset.findFirst({
    where: {
      id: assetId,
      deleted_at: null,
    },
  });

  if (!asset) {
    throw new AppError("NOT_FOUND", "Asset not found");
  }

  await prisma.asset.delete({
    where:{
      id:assetId
    }
  });

  return { message: "Asset deleted successfully" };
}