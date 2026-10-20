import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { type SubmitEvent, useState } from "react"
import { signUpInput } from '@/lib/validators'
import { useAuth } from '@/lib/auth'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export const Route = createFileRoute('/signup')({
  component: SignUp,
})

type Fieldkey = "fullname" | "email" | "phone" | "password"

function SignUp() {
  const [fullname, setFullname] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<Partial<Record<Fieldkey, string>>>({})
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>){
    e.preventDefault()
    const result = signUpInput.safeParse({ fullname, email, phone, password })
    if (!result.success) {
      const map: Partial<Record<Fieldkey, string>> = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as Fieldkey
        if (!map[key]) map[key] = issue.message
      }
      setErrors(map)
      return
    }
    setErrors({})
    setLoading(true)
    await register(email, fullname)
    navigate({ to: "/home" })
  }

  return (
    <div className='flex min-h-screan items-center justify-center bg-background p-4'>
      <Card className="w-full max-w-sm p-8">
        <h1 className='mb-6 text-[28px] font-extrabold tracking-tight'>
          Create account
        </h1>
        <form
          onSubmit={handleSubmit}
          noValidate
          className='flex flex-col gap-5'
        >
          <div className='flex flex-col gap-2'>
            <Label htmlFor="fullname" className="text-sm font-bold">
              Full name <span className='text-crit-700'>*</span>
            </Label>
            <Input
              id="fullname"
              placeholder='Full name'
              className={`h-[42px] ${errors.fullname ? "border-crit-700 bg-crit-50" : ""} ${loading ? "opacity-60" : ""}`}
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              disabled={loading}
            />
            {errors.fullname && (
              <p className="flex items-center gap-1.5 text-xs text-crit-700">
                <span className="size-[6px] bg-crit" />
                {errors.fullname}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-sm font-bold">
              Eamil <span className="text-crit-700">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@amlak.com"
              className={`h-[42px] ${errors.email ? "border-crit-700 bg-crit-50" : ""} ${loading ? "opacity-60" : ""}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            {errors.email && (
              <p className='flex items-center gap-1.5 text-xs text-crit-700'>
                <span className='size-[6px] bg-crit' />
                {errors.email}
              </p>
            )}
          </div>

          <div className='flex flex-col gap-2'>
            <Label htmlFor="phone" className="text-sm font-bold">
              Phone <span className='text-crit-700'>*</span>
            </Label>
            <Input
              id="phone"
              type='tel'
              placeholder='05xxxxxxxx'
              className={`h-[42px] ${errors.phone ? "border-crit-700 bg-crit-50" : ""} ${loading ? "opacity-60" : ""}`}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
            />
            {errors.phone && (
              <p className='flex items-center gap-1.5 text-xs text-crit-700'>
                <span className='size-[6px] bg-crit' />
                {errors.phone}
              </p>
            )}
          </div>

          <div className='flex flex-col gap-2'>
            <label htmlFor='password' className='text-sm font-bold'>
              password <span className='text-crit-700'>*</span>
            </label>
            <Input
              id='password'
              type='password'
              placeholder='at least 8 characters'
              className={`h-[42px] ${errors.password ? "border-crit-700 bg-crit-50" : ""} ${loading ? "opacity-60" : ""}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            {errors.password && (
              <p className='flex items-center gap-1.5 text-xs text-crit-700'>
                <span className='size-[6px] bg-crit' />
                {errors.password}
              </p>
            )}
          </div>

          <Button
            type='submit'
            className="h-[42px] font-bold"
            disabled={loading}
          >
            {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>

          <p className='mt-4 text-center font-mono text-sm'>
            Already have an account?{" "}
            <Link to="/signin" className='font-bold underline'>
              Sign in
            </Link>
          </p>
      </Card>
    </div>
  )
}
