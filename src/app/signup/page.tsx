import type { Metadata } from "next";
import { AuthPanel } from "@/components/auth/AuthPanel";

export const metadata: Metadata = {
  title: "Sign up",
  description:
    "Create a free Nordlys account to post articles, start threads and join the conversation.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const target = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  return (
    <AuthPanel
      mode="signup"
      next={target}
      errorCode={error}
      googleEnabled={process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true"}
    />
  );
}
