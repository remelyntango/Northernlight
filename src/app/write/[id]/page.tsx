import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArticleEditor } from "@/components/editor/ArticleEditor";
import { getArticleById } from "@/lib/queries";
import { getCurrentProfile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Edit article",
  robots: { index: false },
};

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [profile, article] = await Promise.all([
    getCurrentProfile(),
    getArticleById(id),
  ]);

  if (!profile) redirect(`/login?next=/write/${id}`);
  if (!article) notFound();

  // The RLS UPDATE policy would reject a save anyway; this just avoids showing
  // an editor that can't succeed.
  if (article.author_id !== profile.id && profile.role !== "admin") {
    redirect(`/articles/${article.slug}`);
  }

  return <ArticleEditor article={article} />;
}
