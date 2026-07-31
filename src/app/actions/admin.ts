"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const resolveSchema = z.object({
  id: z.uuid(),
  status: z.enum(["resolved", "dismissed"]),
});

/**
 * Every action here goes through RLS or a SECURITY DEFINER function that
 * re-checks is_admin() server-side. The /admin route guard in middleware only
 * avoids rendering a page a non-admin can't use — it is not the security
 * boundary.
 */
export async function resolveReport(formData: FormData) {
  const parsed = resolveSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase
    .from("reports")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id);

  revalidatePath("/admin");
}

const deleteSchema = z.object({
  kind: z.enum(["article", "thread", "comment"]),
  id: z.uuid(),
  reportId: z.uuid().optional(),
});

const TABLE = {
  article: "articles",
  thread: "threads",
  comment: "comments",
} as const;

export async function adminDeleteContent(formData: FormData) {
  const reportId = formData.get("reportId");
  const parsed = deleteSchema.safeParse({
    kind: formData.get("kind"),
    id: formData.get("id"),
    reportId: typeof reportId === "string" && reportId ? reportId : undefined,
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { kind, id } = parsed.data;

  if (kind === "comment") {
    // Soft delete, so replies underneath keep their shape.
    await supabase
      .from("comments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
  } else {
    await supabase.from(TABLE[kind]).delete().eq("id", id);
  }

  if (parsed.data.reportId) {
    await supabase
      .from("reports")
      .update({ status: "resolved" })
      .eq("id", parsed.data.reportId);
  }

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/articles");
  revalidatePath("/discussions");
}

const roleSchema = z.object({
  userId: z.uuid(),
  role: z.enum(["member", "admin"]),
});

export async function setUserRole(formData: FormData) {
  const parsed = roleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  // admin_set_role re-checks is_admin() inside the database.
  await supabase.rpc("admin_set_role", {
    target_user: parsed.data.userId,
    new_role: parsed.data.role,
  });

  revalidatePath("/admin");
}
