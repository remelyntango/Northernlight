"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateProfile, type ProfileState } from "@/app/actions/profile";
import { ImageUpload } from "@/components/editor/ImageUpload";
import {
  FormError,
  FormNotice,
  Input,
  Label,
  Textarea,
} from "@/components/ui/Field";
import type { Profile } from "@/lib/types";

function Save() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="grad-primary neu-xs neu-press cursor-pointer self-start rounded-[16px] px-5 py-2.5 text-sm font-semibold text-on-primary transition-all hover:brightness-110 disabled:opacity-55"
    >
      {pending ? "Saving…" : "Save profile"}
    </button>
  );
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState<ProfileState, FormData>(
    updateProfile,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      {state.error ? <FormError>{state.error}</FormError> : null}
      {state.ok ? <FormNotice>Profile saved.</FormNotice> : null}

      <div>
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          name="displayName"
          defaultValue={profile.display_name}
          required
          maxLength={60}
        />
      </div>

      <div>
        <Label htmlFor="bio" hint="Optional, 400 characters">
          Bio
        </Label>
        <Textarea
          id="bio"
          name="bio"
          defaultValue={profile.bio ?? ""}
          rows={3}
          maxLength={400}
          placeholder="Moved to Aarhus in 2021. Writes about the paperwork nobody warns you about."
        />
      </div>

      <div>
        <Label>Avatar</Label>
        <ImageUpload
          bucket="avatars"
          name="avatarUrl"
          initialUrl={profile.avatar_url}
          label="Avatar"
          aspect="h-28 w-28 rounded-full"
        />
      </div>

      <Save />
    </form>
  );
}
