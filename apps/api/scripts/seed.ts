import { emailSchema, passwordSchema, phoneSchema, ROLES } from "@amlak/shared";
import { hashPassword } from "../src/auth/passwords.ts";
import { prisma } from "../src/db.ts";

for (const name of ROLES) {
	await prisma.role.upsert({
		where: { name },
		update: {},
		create: { name },
	});
}
console.log(`Roles: ${ROLES.join(", ")}`);

await seedAdmin();
await prisma.$disconnect();

/**
 * Creates the first Admin from ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_PHONE
 * (ADMIN_NAME is optional). Without them no Admin is created. Running it
 * again leaves an existing Admin as it is, password included.
 */
async function seedAdmin(): Promise<void> {
	const email = process.env.ADMIN_EMAIL;
	const password = process.env.ADMIN_PASSWORD;
	const phone = process.env.ADMIN_PHONE;
	if (!email || !password || !phone) {
		console.log(
			"No Admin created: set ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_PHONE",
		);
		return;
	}

	const existing = await prisma.user.findUnique({
		where: { email: emailSchema.parse(email) },
		include: { role: true },
	});
	if (existing?.role.name === "ADMIN") {
		console.log(`Admin ${existing.email} already exists; left unchanged`);
		return;
	}
	if (existing) {
		throw new Error(
			`${existing.email} is a ${existing.role.name} account; use another ADMIN_EMAIL`,
		);
	}

	const adminRole = await prisma.role.findUniqueOrThrow({
		where: { name: "ADMIN" },
	});
	const admin = await prisma.user.create({
		data: {
			role_id: adminRole.id,
			email: emailSchema.parse(email),
			password_hash: await hashPassword(passwordSchema.parse(password)),
			phone: phoneSchema.parse(phone),
			fullname: process.env.ADMIN_NAME ?? "Amlak Admin",
			status: "ACTIVE",
			email_verified_at: new Date(),
		},
	});
	console.log(`Admin ${admin.email} created`);
}
