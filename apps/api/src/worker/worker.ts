import type { WorkerResponse, UpdateWorkerInput,getWorkerSchema,PutWorkerSchema } from "@amlak/shared";
import { prisma } from "../db.ts";
import { sendEmail } from "../email.ts";
import { AppError } from "../errors.ts";
import { toUser } from "../users/present.ts";
import { hashCode, newVerificationCode } from "../auth/codes.ts";
import { hashPassword, verifyPassword } from "../auth/passwords.ts";
import { endSession, type Session, startSession } from "../auth/sessions.ts";
import * as tokens from "../auth/tokens.ts";
import { auditLog } from "../../scripts/audit_log.ts";


async function userIdFromToken(token: string) {
  const payload = await tokens.verifyAccessToken(token);
  return {user_id:payload.user_id,role:payload.role};
}
async function workers(token:string){
  const role = (await userIdFromToken(token)).role
  if (role == "WORKER"){
    throw new AppError("FORBIDDEN","YOU DON'T HAVE ACCESS");
  }
}



export async function createWorker(input: UpdateWorkerInput,jwt_token: string): Promise<WorkerResponse> {
  const ownerId = (await userIdFromToken(jwt_token)).user_id;
  workers(jwt_token);
  const managerRole = await prisma.role.findUniqueOrThrow({
		where: { name: "WORKER" },
	});
  const check = await prisma.user.findFirst({
    where: {
      email:input.email
    }
  });
  if (check){
    return {"message":"There is worker has the same email"}
  }
  const worker = await prisma.user.create({
    data:{
      ...input,
      picture_path: null,
      role_id: managerRole.id,
      status: "INVITED",
      email_verified_at: null,
      manager_id: ownerId,
      id: crypto.randomUUID()
    }
  });

  await auditLog({user_id: ownerId,
    action: "CREATE",
    entity_type: "WORKER",
    entity_id: worker.id,
  });
  return {
    ...worker,
    assigned_places: []
  } as WorkerResponse;
}

export async function getWorkerById(jwt_token:string, input: getWorkerSchema): Promise<WorkerResponse>{
  const ownerId = (await userIdFromToken(jwt_token)).user_id;
  workers(jwt_token);
  const worker = await prisma.user.findFirst({
    where: {
      id:input.worker_id,
      manager_id: ownerId
    },
    omit:{
      password_hash: true
    }
  });
  const assaign_places = await prisma.placeWorker.findMany({
    where:{
      worker_id:input.worker_id,
      is_active: true
    },
    select:{
      place:{
        select:{
          id:true,
          place_name:true
        }
      }
    }
  });
  await auditLog({user_id: ownerId,
    action: "GET",
    entity_type: "WORKER",
    entity_id: worker.id,
  });
  return {
    ...worker,
    assigned_places: assaign_places.map((assignment) => assignment.place),
  } as WorkerResponse;

}

export async function deleteWorkerById(jwt_token:string,wkId: getWorkerSchema){
  const ownerId = (await userIdFromToken(jwt_token)).user_id;
  workers(jwt_token);
  const managerRole = await prisma.role.findUniqueOrThrow({
		where: { name: "WORKER" },
	});
    const place_assigned = await prisma.placeWorker.deleteMany(
    {
      where:{
        worker_id:wkId.worker_id
      }
    }
  )
  try{
  const worker = await prisma.user.delete({
    where:{
      role_id: managerRole.id,
      id:wkId.worker_id,
      manager_id:ownerId,
      email_verified_at: null,
      role:{
        name:"WORKER"
      }
    },
    select:{
      id:true
    }
  })
  
  await auditLog({user_id: ownerId,
    action: "DELETE",
    entity_type: "WORKER",
    entity_id: wkId.worker_id,
  });
  return {"message":"Worker deleted successfully"};
  }
  catch(error){
    return {"message":"worker not exist or active"}
  }
  
  
}

export async function updateWorkerById(jwt_token:string,wkId:getWorkerSchema,input:PutWorkerSchema):Promise<WorkerResponse>{
  const ownerId = (await userIdFromToken(jwt_token)).user_id;
  workers(jwt_token);
  const workerId = wkId.worker_id;
  const worker = await prisma.user.findFirst({
    where:{
      id:workerId
    }
  })
  if(!worker){
    return {"message":"we don't have worker by this Id in our record"};
  }
  const update = await prisma.user.update({
    where:{
      manager_id:ownerId,
      id:workerId
    },
    data:{
      ...input
    },
    omit:{
      password_hash:true
    }
  })
await auditLog({user_id: ownerId,
    action: "UPDATE",
    entity_type: "WORKER",
    entity_id: workerId,
  });

  return update as WorkerResponse;

}

export async function getWorker(jwt_token:string): Promise<WorkerResponse>{
  const ownerId = (await userIdFromToken(jwt_token)).user_id;
  workers(jwt_token);
  const worker = await prisma.user.findMany({
    where: {
      manager_id: ownerId
    },
    omit:{
      password_hash: true
    }
  });
  const result = await Promise.all(
    worker.map(async (worker) => {
      const assignments = await prisma.placeWorker.findMany({
        where: {
          worker_id: worker.id,
          is_active: true,
        },
        select: {
          place: {
            select: {
              id: true,
              place_name: true,
            },
          },
        },
      });

      return {
        ...worker,
        assigned_places: assignments.map((assignment) => assignment.place),
      };
    })
  );

  await auditLog({
    user_id: ownerId,
    action: "GET",
    entity_type: "WORKER",
    entity_id: ownerId,
  });

  return result as WorkerResponse[];


}
