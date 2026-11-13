import { createRootRoute, Outlet } from "@tanstack/react-router"
import { AuthProvider } from "@/lib/auth"
import { LanguageProvider } from "@/lib/i18n"

export const Route = createRootRoute({
  component: () => (
    <LanguageProvider>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </LanguageProvider>
  ),
})
