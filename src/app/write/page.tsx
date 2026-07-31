import type { Metadata } from "next";
import { ArticleEditor } from "@/components/editor/ArticleEditor";

export const metadata: Metadata = {
  title: "Write an article",
  robots: { index: false },
};

export default function WritePage() {
  return <ArticleEditor />;
}
