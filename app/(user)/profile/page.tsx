"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/context/AuthContext";
import { employeeProfileKey, useEmployeeProfile, type EmployeeProfile } from "@/app/hooks/useEmployeeProfile";
import { useFileUpload } from "@/app/hooks/useFileUpload";
import { UserRound } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const profile = useEmployeeProfile(user?.id);
  const queryClient = useQueryClient();
  const { upload, progress, isUploading, error } = useFileUpload<EmployeeProfile>({
    uploadUrlEndpoint: `/employees/${user?.id}/avatar/upload-url`,
    callbackEndpoint: `/employees/${user?.id}/avatar`,
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    maxSize: 5 * 1024 * 1024,
    onComplete: (updated) => queryClient.setQueryData(employeeProfileKey(user?.id), updated),
  });

  return (
    <main className="min-h-full w-full overflow-y-auto bg-backgroundPrimary p-8 text-textPrimary">
      <h1 className="mb-8 text-3xl font-bold">Your profile</h1>
      {profile.isPending ? <p>Loading profile…</p> : profile.isError ? (
        <div role="alert"><p>Unable to load your profile.</p><button onClick={() => profile.refetch()}>Try again</button></div>
      ) : (
        <section className="max-w-lg space-y-5 rounded-xl bg-backgroundSecondary p-6">
          {profile.data.avatarUrl ? (
            // Signed URLs are fetched directly, without an image proxy or disk cache.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.data.avatarUrl} alt="Your profile photo" className="h-28 w-28 rounded-full object-cover" />
          ) : <UserRound aria-label="No profile photo" className="h-28 w-28 rounded-full p-5" />}
          <div><h2 className="text-xl font-semibold">{profile.data.username}</h2><p>{profile.data.email}</p></div>
          <label className="block space-y-2">
            <span className="block font-medium">Change profile photo</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={isUploading || !user}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void upload(file);
              }} className="block w-full text-sm" />
          </label>
          <p className="text-sm">JPEG, PNG or WebP. Maximum 5MB.</p>
          {isUploading && <div role="status"><progress value={progress} max={100} className="w-full" /><p>{progress < 99 ? `Uploading ${progress}%` : "Saving photo…"}</p></div>}
          {!isUploading && progress === 100 && !error && <p role="status">Profile photo updated.</p>}
          {error && <p role="alert" className="text-red-500">{error}</p>}
        </section>
      )}
    </main>
  );
}
