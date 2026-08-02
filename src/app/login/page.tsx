import type { Metadata } from "next";
import { AuthPanel } from "@/components/auth/AuthPanel";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to write articles, start discussions and join the conversation.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const target = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  return (
    <AuthPanel
      mode="signin"
      next={target}
      errorCode={error}
      googleEnabled={process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true"}
    />
  );
}
