import { z } from "zod"

export const signInInput = z.object({
  email: z
    .string()
    .min(1, "Email is required.")
    .pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Password is required."),
})

export const signUpInput = z.object({
  fullname: z.string().min(1, "Full name is required."),
  email: z
    .string()
    .min(1, "Email is required.")
    .pipe(z.email("Enter a valid email address.")),
  phone: z
    .string()
    .min(1, "Phone is required.")
    .regex(/^\+?[0-9]{9,14}$/, "Enter a valid phone number."),
  password: z.string().min(8,  "Password must at least 8 characters."),
})

export type SignInInput = z.infer<typeof signInInput>
