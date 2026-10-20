import { z } from "zod"
import { registerSchema } from "@amlak/shared"

export const signInInput = z.object({
  email: z
    .string()
    .min(1, "Email is required.")
    .pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Password is required."),
})

export const signUpInput = registerSchema

export type SignInInput = z.infer<typeof signInInput>
