import "dotenv/config";
import { prisma } from "../src/db.ts";

const roles = await prisma.role.count();
console.log(`Connected. roles: ${roles}`);
await prisma.$disconnect();
