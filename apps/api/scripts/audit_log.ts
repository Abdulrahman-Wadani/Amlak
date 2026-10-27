import { prisma } from "../src/db.ts";

interface AuditLogInput {
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  old_values?: string;
  new_values?: string;
  ip_address?: string | null;
}

export async function auditLog(input: AuditLogInput) {
  return prisma.auditLog.create({
    data: {
      user: { connect: { id: input.user_id } },
      action: input.action,
      entity_type: input.entity_type,
      entity_id: input.entity_id ?? null,
      old_values: input.old_values ?? null,
      new_values: input.new_values ?? null,
      ip_address: input.ip_address ?? null,
    },
  });
}
