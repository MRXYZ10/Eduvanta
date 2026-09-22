import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

// Wrapped in Suspense because LoginForm reads useSearchParams() (the
// post-login "next" redirect target), which Next.js requires during
// static generation of a page that also has client-side search params.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
