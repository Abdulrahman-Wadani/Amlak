import { createFileRoute } from "@tanstack/react-router";
import { type SubmitEvent, useState } from "react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email || !password) {
      setError("Email and password are required.");
      setSuccess(false);
    } else {
      setError("");
      setSuccess(true);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm p-8">
        <h1 className="mb-6 text-[28px] font-extrabold tracking-tight">Sign in</h1>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-sm font-bold">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@amlak.com"
              className="h-[42px]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password" className="text-sm font-bold">
              Password <span className="text-crit-700">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="h-[42px]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-[12px]">
            <input type="checkbox" className="size-4 accent-primary" />
            Remember me
          </label>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>{error}</AlertTitle>
            </Alert>
          )}
          {success && (
            <Alert>
              <AlertTitle>Signed in (mock)</AlertTitle>
            </Alert>
          )}

          <Button type="submit" className="h-10 w-full">
            Sign in
          </Button>
        </form>
        {/* biome-ignore lint/a11y/useValidAnchor: placeholder link until /forgot-password route exists */}
        <a href="#" className="mt-4 inline-block text-sm text-info-700 hover:underline">
          Forgot password?
        </a>
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/signin")({ component: SignIn });
