import { randomUUID } from "node:crypto";
import { type AuthUser, signAccessToken } from "../src/auth/tokens.ts";

const role = (process.argv[2] ?? "MANAGER") as AuthUser["role"];
console.log(await signAccessToken({ user_id: randomUUID(), role }));
