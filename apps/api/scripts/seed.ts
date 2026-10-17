import { ROLES } from "../src/auth/roles.ts";
import { prisma } from "../src/db.ts";

for (const name of ROLES) {
	await prisma.role.upsert({
		where: { name },
		update: {},
		create: { name },
	});
}

console.log(`Roles: ${ROLES.join(", ")}`);
await prisma.$disconnect();
