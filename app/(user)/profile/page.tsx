"use client";

import { useState } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/context/AuthContext";
import { employeeProfileKey, useEmployeeProfile, useUpdateMyProfile, type EmployeeProfile, type UpdateEmployeeProfile } from "@/app/hooks/useEmployeeProfile";
import { useFileUpload } from "@/app/hooks/useFileUpload";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/app/components/ui/Tabs";
import CvSection, { CvUpload } from "./_components/CvSections";
import { UserRound, Pencil, Check } from "lucide-react";

const phone = z.string().max(30).refine((v) => !v || /^\+?[0-9][0-9 ()-]{5,29}$/.test(v), "Enter a valid phone number");
const id = z.string().refine((v) => !v || (/^[1-9]\d*$/.test(v) && Number.isSafeInteger(Number(v))), "Enter a positive whole number");
const date = (pastOnly: boolean) => z.string().refine((v) => {
  if (!v) return true;
  const parsed = new Date(`${v}T00:00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(parsed.getTime()) && (pastOnly ? parsed < today : parsed <= today);
}, pastOnly ? "Choose a date before today" : "Choose today or an earlier date");
const schema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50),
  lastName: z.string().trim().min(1, "Last name is required").max(50),
  phone,
  dateOfBirth: date(true),
  address: z.string().trim().max(500),
  emergencyContactName: z.string().trim().max(100),
  emergencyContactPhone: phone,
  designationId: id,
  joinDate: date(false),
  reportingManagerUserId: id,
});
type Form = z.infer<typeof schema>;
type Field = { name: keyof Form; label: string; type?: string; maxLength?: number; hint?: string };
const basic: Field[] = [
  { name: "firstName", label: "First name", maxLength: 50 },
  { name: "lastName", label: "Last name", maxLength: 50 },
  { name: "designationId", label: "Designation ID", type: "number", hint: "Use the designation assigned by your HR team." },
  { name: "joinDate", label: "Join date", type: "date" },
  { name: "reportingManagerUserId", label: "Reporting manager user ID", type: "number", hint: "Ask your HR team if you are unsure." },
];
const personal: Field[] = [
  { name: "phone", label: "Phone", type: "tel", maxLength: 30 },
  { name: "dateOfBirth", label: "Date of birth", type: "date" },
  { name: "address", label: "Address", maxLength: 500 },
  { name: "emergencyContactName", label: "Emergency contact name", maxLength: 100 },
  { name: "emergencyContactPhone", label: "Emergency contact phone", type: "tel", maxLength: 30 },
];
function values(profile: EmployeeProfile): Form {
  return Object.fromEntries([...basic, ...personal].map(({ name }) => [name, String(profile[name] ?? "")])) as Form;
}
function payload(form: Form): UpdateEmployeeProfile {
  return {
    ...form,
    phone: form.phone || null, dateOfBirth: form.dateOfBirth || null,
    address: form.address || null, emergencyContactName: form.emergencyContactName || null,
    emergencyContactPhone: form.emergencyContactPhone || null,
    designationId: form.designationId ? Number(form.designationId) : null,
    joinDate: form.joinDate || null,
    reportingManagerUserId: form.reportingManagerUserId ? Number(form.reportingManagerUserId) : null,
  };
}

export default function ProfilePage() {
  const { user } = useAuth();
  const profile = useEmployeeProfile(user?.id);
  return (
    <main className="min-h-full w-full overflow-y-auto bg-backgroundPrimary p-4 text-textPrimary sm:p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold">Your profile</h1>
        <p className="mb-8 mt-2 text-sm text-textSecondary">Keep your details and emergency contacts up to date.</p>
        {profile.isPending ? <p role="status">Loading profile…</p> : profile.isError ? (
          <div role="alert" className="rounded-xl bg-backgroundSecondary p-6">
            <p>{profile.error.status === 404 ? "Your profile is being prepared. Please try again shortly." : "Unable to load your profile."}</p>
            <button className="mt-3 underline" onClick={() => profile.refetch()}>Try again</button>
          </div>
        ) : <ProfileDetails key={user?.id} profile={profile.data} userId={user?.id} />}
      </div>
    </main>
  );
}

function ProfileDetails({ profile, userId }: { profile: EmployeeProfile; userId?: string }) {
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState("basic");
  const [saved, setSaved] = useState(false);
  const update = useUpdateMyProfile(userId);
  const queryClient = useQueryClient();
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: values(profile) });
  const { upload, progress, isUploading, error } = useFileUpload<EmployeeProfile>({
    uploadUrlEndpoint: `/employees/${userId}/avatar/upload-url`,
    callbackEndpoint: `/employees/${userId}/avatar`,
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    maxSize: 5 * 1024 * 1024,
    onComplete: async (updated) => {
      await queryClient.cancelQueries({ queryKey: employeeProfileKey(userId) });
      queryClient.setQueryData(employeeProfileKey(userId), updated);
    },
  });
  const busy = update.isPending || isUploading;
  const button = "inline-flex items-center justify-center gap-2 rounded-lg border border-current/20 px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50";

  async function save(data: Form) {
    if (data.reportingManagerUserId === userId) {
      setTab("basic");
      form.setError("reportingManagerUserId", { message: "You cannot report to yourself" });
      return;
    }
    try {
      const result = await update.mutateAsync(payload(data));
      form.reset(values(result));
      setEditing(false);
      setSaved(true);
    } catch { /* Mutation error is shown below; keep the user's draft. */ }
  }
  function invalid(errors: FieldErrors<Form>) {
    setTab(basic.some(({ name }) => errors[name]) ? "basic" : "personal");
  }
  function fields(items: Field[]) {
    return <div className="grid gap-6 sm:grid-cols-2">{items.map(({ name, label, type = "text", maxLength, hint }) => (
      <div key={name} className={name === "address" ? "sm:col-span-2" : ""}>
        {editing ? <>
          <label htmlFor={name} className="mb-2 block text-sm font-medium">{label}{["firstName", "lastName"].includes(name) && " *"}</label>
          <input form="profile-details-form" {...form.register(name)} id={name} type={type} maxLength={maxLength} required={name === "firstName" || name === "lastName"} min={type === "number" ? 1 : undefined}
            step={type === "number" ? 1 : undefined} aria-invalid={!!form.formState.errors[name]}
            aria-describedby={form.formState.errors[name] ? `${name}-error` : hint ? `${name}-hint` : undefined}
            className="w-full rounded-lg border border-current/20 bg-backgroundPrimary px-3 py-2.5 text-sm outline-offset-2" />
          {hint && <p id={`${name}-hint`} className="mt-1 text-xs text-textSecondary">{hint}</p>}
          {form.formState.errors[name] && <p id={`${name}-error`} role="alert" className="mt-1 text-sm text-red-500">{form.formState.errors[name]?.message}</p>}
        </> : <><p className="text-sm text-textSecondary">{label}</p><p className="mt-1 whitespace-pre-wrap break-words font-medium">{profile[name] || "Not provided"}</p></>}
      </div>
    ))}</div>;
  }

  return <section className="rounded-2xl bg-backgroundSecondary p-5 sm:p-8">
    <div className="mb-8 flex flex-wrap items-center gap-5">
      {profile.avatarUrl ? (
        // Signed URLs are fetched directly, without an image proxy or disk cache.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatarUrl} alt="Your profile photo" className="h-24 w-24 rounded-full object-cover" />
      ) : <UserRound aria-label="No profile photo" className="h-24 w-24 rounded-full bg-backgroundPrimary p-5" />}
      <div className="min-w-0 flex-1">
        <h2 className="break-words text-xl font-semibold">{[profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.username}</h2>
        <p className="break-all text-sm text-textSecondary">{profile.email}</p>
        <label className="mt-3 block text-sm">
          <span className="mb-1 block font-medium">Change profile photo</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || editing || !userId}
            onChange={(event) => {
              const file = event.target.files?.[0]; event.target.value = "";
              if (file) void upload(file);
            }} className="block w-full text-xs" />
        </label>
        <p className="mt-1 text-xs text-textSecondary">JPEG, PNG or WebP, up to 5MB.</p>
      </div>
      {!editing && <button type="button" className={button} disabled={busy} onClick={() => {
        form.reset(values(profile)); update.reset(); setSaved(false); setTab("basic"); setEditing(true);
      }}><Pencil size={16} />Edit profile</button>}
    </div>
    {isUploading && <div role="status" className="mb-4"><progress value={progress} max={100} className="w-full" /><p>{progress < 99 ? `Uploading ${progress}%` : "Saving photo…"}</p></div>}
    {!isUploading && progress === 100 && !error && <p role="status" className="mb-4">Profile photo updated.</p>}
    {error && <p role="alert" className="mb-4 text-red-500">{error}</p>}
    {saved && <p role="status" className="mb-4 flex items-center gap-2"><Check size={16} />Profile saved.</p>}
    <div>
      <form id="profile-details-form" noValidate onSubmit={form.handleSubmit(save, invalid)} />
      <fieldset disabled={update.isPending} className="min-w-0">
        <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
          <TabsList className="mb-7 max-w-full overflow-x-auto border-b border-current/10 pb-3">
            <TabsTrigger value="basic" className="px-4 py-2">Basic info</TabsTrigger>
            <TabsTrigger value="personal" className="px-4 py-2">Personal info</TabsTrigger>
            <TabsTrigger value="skills" className="px-4 py-2" disabled={editing}>Skills</TabsTrigger>
            <TabsTrigger value="education" className="px-4 py-2" disabled={editing}>Education</TabsTrigger>
            <TabsTrigger value="experience" className="px-4 py-2" disabled={editing}>Experience</TabsTrigger>
          </TabsList>
          <TabsContent value="basic" keepMounted>
            <dl className="mb-6 grid gap-6 sm:grid-cols-2">
              <div><dt className="text-sm text-textSecondary">Username</dt><dd className="mt-1 break-words font-medium">{profile.username}</dd></div>
              <div><dt className="text-sm text-textSecondary">Email</dt><dd className="mt-1 break-all font-medium">{profile.email}</dd></div>
              <div><dt className="text-sm text-textSecondary">Department</dt><dd className="mt-1 font-medium">{profile.departmentId ? `Department ${profile.departmentId}` : "Not assigned"}</dd></div>
              <div><dt className="text-sm text-textSecondary">Status</dt><dd className="mt-1 font-medium">{profile.status}</dd></div>
            </dl>
            {fields(basic)}
          </TabsContent>
          <TabsContent value="personal" keepMounted>{fields(personal)}</TabsContent>
          {(["skills", "education", "experience"] as const).map((section) => <TabsContent key={section} value={section}>
            <CvSection section={section} userId={userId} />
          </TabsContent>)}
        </Tabs>
        {editing && <>
          {update.isError && <p role="alert" className="mt-6 text-sm text-red-500">{update.error.message || "Unable to save your profile. Please try again."}</p>}
          <div className="mt-8 flex justify-end gap-3 border-t border-current/10 pt-5">
            <button type="button" className={button} onClick={() => { form.reset(values(profile)); setEditing(false); update.reset(); }}>Cancel</button>
            <button type="submit" form="profile-details-form" className={`${button} bg-textPrimary text-backgroundPrimary`} disabled={busy}>{update.isPending ? "Saving…" : "Save changes"}</button>
          </div>
        </>}
      </fieldset>
    </div>
    <CvUpload userId={userId} />
  </section>;
}
