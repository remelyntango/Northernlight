import type { Metadata } from "next";
import { ThreadComposer } from "@/components/editor/ThreadComposer";

export const metadata: Metadata = {
  title: "Start a discussion",
  robots: { index: false },
};

export default function NewThreadPage() {
  return <ThreadComposer />;
}
