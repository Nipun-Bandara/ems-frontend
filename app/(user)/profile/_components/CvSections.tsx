"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { type ApiError } from "@/app/lib/axios";
import { useFileUpload } from "@/app/hooks/useFileUpload";
import { employeeProfileKey } from "@/app/hooks/useEmployeeProfile";
import Modal from "../../organization/_components/Modal";
import type { components } from "@/app/types/employee-api";

type Section = "skills" | "education" | "experience";
type Entry = components["schemas"]["EmployeeSkill"] | components["schemas"]["EmployeeEducation"] | components["schemas"]["EmployeeExperience"];
type Cv = components["schemas"]["EmployeeCv"];
type Field = { name: string; label: string; type?: string; required?: boolean; max?: number; min?: number; step?: number };
const button = "rounded-lg border border-current/20 px-3 py-2 text-sm font-medium disabled:opacity-50";
const config: Record<Section, { title: string; singular: string; fields: Field[] }> = {
  skills: { title: "Skills", singular: "skill", fields: [
    { name: "name", label: "Skill name", required: true, max: 100 },
    { name: "proficiency", label: "Proficiency", type: "select", required: true },
    { name: "yearsOfExperience", label: "Years of experience", type: "number", required: true, min: 0, max: 100, step: 0.1 },
  ] },
  education: { title: "Education", singular: "education", fields: [
    { name: "institution", label: "Institution", required: true, max: 200 },
    { name: "qualification", label: "Qualification", required: true, max: 200 },
    { name: "fieldOfStudy", label: "Field of study", max: 200 },
    { name: "startYear", label: "Start year", type: "number", required: true, min: 1900, max: 2200 },
    { name: "endYear", label: "End year (leave blank if ongoing)", type: "number", min: 1900, max: 2200 },
    { name: "grade", label: "Grade", max: 100 },
  ] },
  experience: { title: "Experience", singular: "experience", fields: [
    { name: "company", label: "Company", required: true, max: 200 },
    { name: "title", label: "Job title", required: true, max: 200 },
    { name: "startDate", label: "Start date", type: "date", required: true },
    { name: "isCurrent", label: "I currently work here", type: "checkbox" },
    { name: "endDate", label: "End date", type: "date", required: true },
    { name: "description", label: "Description", type: "textarea", max: 5000 },
  ] },
};
const proficiencies = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"];
const label = (value: string) => value.charAt(0) + value.slice(1).toLowerCase();

export default function CvSection({ section, userId }: { section: Section; userId?: string }) {
  const client = useQueryClient();
  const endpoint = `/employees/${userId}/${section}`;
  const key = ["employee-cv-section", userId, section];
  const query = useQuery<Entry[], ApiError>({ queryKey: key, enabled: !!userId, queryFn: async () => (await api.get<Entry[]>(endpoint)).data });
  const [editing, setEditing] = useState<Entry | "new" | null>(null);
  const [deleting, setDeleting] = useState<Entry | null>(null);
  const mutation = useMutation({
    mutationFn: async ({ id, data }: { id?: number; data?: Record<string, unknown> }) => {
      if (!data) await api.delete(`${endpoint}/${id}`);
      else if (id) await api.put(`${endpoint}/${id}`, data);
      else await api.post(endpoint, data);
    },
    onSuccess: async () => { setEditing(null); setDeleting(null); await client.invalidateQueries({ queryKey: key }); },
  });
  const details = config[section];
  const error = mutation.error?.message || "Unable to save. Please try again.";
  return <div>
    <div className="mb-5 flex items-center justify-between gap-4">
      <h3 className="text-lg font-semibold">{details.title}</h3>
      <button type="button" className={button} disabled={!userId} onClick={() => { mutation.reset(); setEditing("new"); }}>Add {details.singular}</button>
    </div>
    {query.isPending ? <p role="status">Loading {section}…</p> : query.isError ? <div role="alert"><p>Unable to load {section}.</p><button type="button" className="underline" onClick={() => query.refetch()}>Try again</button></div> : query.data.length === 0 ? <p className="text-textSecondary">No {section} added yet.</p> : <ul className="space-y-4">{query.data.map((entry) => <li key={entry.id} className="rounded-xl border border-current/15 p-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div className="min-w-0 flex-1 break-words">
          {"name" in entry ? <><h4 className="font-semibold">{entry.name}</h4><p className="mt-1 text-textSecondary">{label(entry.proficiency)} · {entry.yearsOfExperience} years</p></> : "institution" in entry ? <><h4 className="font-semibold">{entry.qualification} · {entry.institution}</h4><p className="mt-1 text-textSecondary">{entry.fieldOfStudy}{entry.fieldOfStudy && " · "}{entry.startYear}–{entry.endYear ?? "Present"}{entry.grade && ` · ${entry.grade}`}</p></> : <><h4 className="font-semibold">{entry.title} · {entry.company}</h4><p className="mt-1 text-textSecondary">{entry.startDate}–{entry.isCurrent ? "Present" : entry.endDate}</p>{entry.description && <p className="mt-2 whitespace-pre-wrap">{entry.description}</p>}</>}
        </div>
        <div className="flex items-start gap-2">
          <button type="button" className={button} aria-label={`Edit ${details.singular}`} onClick={() => { mutation.reset(); setEditing(entry); }}>Edit</button>
          <button type="button" className={button} aria-label={`Delete ${details.singular}`} onClick={() => { mutation.reset(); setDeleting(entry); }}>Delete</button>
        </div>
      </div>
    </li>)}</ul>}
    {editing && <EntryDialog section={section} entry={editing === "new" ? undefined : editing} pending={mutation.isPending} error={mutation.isError ? error : undefined}
      onClose={() => { if (!mutation.isPending) setEditing(null); }} onSave={(data) => mutation.mutate({ id: editing === "new" ? undefined : editing.id, data })} />}
    {deleting && <Modal title={`Delete ${details.singular}?`} onClose={() => { if (!mutation.isPending) setDeleting(null); }}>
      <p>This entry will be removed from your profile.</p>
      {mutation.isError && <p role="alert" className="mt-3 text-red-500">{error}</p>}
      <div className="mt-6 flex justify-end gap-3"><button type="button" className={button} disabled={mutation.isPending} onClick={() => setDeleting(null)}>Cancel</button><button type="button" className={button} disabled={mutation.isPending} onClick={() => mutation.mutate({ id: deleting.id })}>{mutation.isPending ? "Deleting…" : "Delete"}</button></div>
    </Modal>}
  </div>;
}

function EntryDialog({ section, entry, pending, error, onClose, onSave }: { section: Section; entry?: Entry; pending: boolean; error?: string; onClose: () => void; onSave: (data: Record<string, unknown>) => void }) {
  const initial = entry ? entry as unknown as Record<string, unknown> : {};
  const [current, setCurrent] = useState(initial.isCurrent === true);
  const [validation, setValidation] = useState("");
  const details = config[section];
  return <Modal title={`${entry ? "Edit" : "Add"} ${details.singular}`} onClose={onClose}>
    <form onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const data: Record<string, unknown> = {};
      for (const field of details.fields) {
        const value = String(form.get(field.name) ?? "").trim();
        data[field.name] = field.type === "checkbox" ? current : field.type === "number" ? (value ? Number(value) : null) : (value || null);
      }
      if (section === "education" && data.endYear != null && Number(data.endYear) < Number(data.startYear)) { setValidation("End year must be on or after start year."); return; }
      if (section === "experience") {
        if (current) data.endDate = null;
        else if (String(data.endDate) < String(data.startDate)) { setValidation("End date must be on or after start date."); return; }
      }
      setValidation(""); onSave(data);
    }}>
      <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
        {details.fields.filter((field) => !(field.name === "endDate" && current)).map((field) => {
          const id = `cv-${field.name}`;
          const css = "mt-1 w-full rounded-lg border border-current/20 bg-backgroundPrimary px-3 py-2";
          return <div key={field.name} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
            <label htmlFor={id} className="block text-sm font-medium">{field.label}{field.required && " *"}</label>
            {field.type === "select" ? <select id={id} name={field.name} className={css} defaultValue={String(initial[field.name] ?? "INTERMEDIATE")} required>{proficiencies.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select> : field.type === "checkbox" ? <input id={id} name={field.name} type="checkbox" checked={current} onChange={(event) => setCurrent(event.target.checked)} className="mt-2 h-4 w-4" /> : field.type === "textarea" ? <textarea id={id} name={field.name} className={css} maxLength={field.max} rows={4} defaultValue={String(initial[field.name] ?? "")} /> : <input id={id} name={field.name} type={field.type ?? "text"} className={css} required={field.required} pattern={!field.type ? ".*\\S.*" : undefined} maxLength={field.type ? undefined : field.max} min={field.min} max={field.type === "date" ? new Date().toLocaleDateString("en-CA") : field.type === "number" ? field.max : undefined} step={field.type === "number" ? field.step ?? 1 : undefined} defaultValue={String(initial[field.name] ?? "")} />}
          </div>;
        })}
      </fieldset>
      {(validation || error) && <p role="alert" className="mt-4 text-red-500">{validation || error}</p>}
      <div className="mt-6 flex justify-end gap-3"><button type="button" className={button} disabled={pending} onClick={onClose}>Cancel</button><button type="submit" className={button} disabled={pending}>{pending ? "Saving…" : "Save"}</button></div>
    </form>
  </Modal>;
}

export function CvUpload({ userId }: { userId?: string }) {
  const client = useQueryClient();
  const key = ["employee-cv", userId];
  const endpoint = `/employees/${userId}/cv`;
  const cv = useQuery<Cv, ApiError>({ queryKey: key, enabled: !!userId, queryFn: async () => (await api.get<Cv>(endpoint)).data, refetchInterval: 4 * 60_000 });
  const download = useMutation({ mutationFn: async () => {
    const { data } = await api.get<Cv>(endpoint);
    if (!data.downloadUrl) throw new Error("No CV is available. Upload a CV first.");
    window.location.assign(data.downloadUrl);
  } });
  const types = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
  const upload = useFileUpload<Cv>({ uploadUrlEndpoint: `${endpoint}/upload-url`, callbackEndpoint: endpoint, allowedTypes: types, maxSize: 10 * 1024 * 1024, validationMessage: "Choose a PDF, DOC or DOCX document up to 10MB.", onComplete: (result) => {
    client.setQueryData(key, result);
    void client.invalidateQueries({ queryKey: employeeProfileKey(userId) });
  } });
  return <div className="mt-8 border-t border-current/15 pt-6">
    <h3 className="text-lg font-semibold">Your CV</h3>
    <p className="mb-3 mt-1 text-sm text-textSecondary">PDF, DOC or DOCX, up to 10MB.</p>
    {cv.isPending ? <p role="status">Loading CV…</p> : cv.isError ? <p role="alert">Unable to load your CV. <button type="button" className="underline" onClick={() => cv.refetch()}>Try again</button></p> : cv.data.cvObjectKey ? <button type="button" className={`${button} mb-3`} disabled={download.isPending || upload.isUploading} onClick={() => download.mutate()}>{download.isPending ? "Preparing…" : "Download CV"}</button> : <p className="mb-3 text-sm">No CV uploaded yet.</p>}
    <label className="block text-sm font-medium">{cv.data?.cvObjectKey ? "Replace CV" : "Upload CV"}<input type="file" accept={types.join(",")} disabled={!userId || upload.isUploading} className="mt-2 block w-full text-sm" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; download.reset(); if (file) void upload.upload(file); }} /></label>
    {upload.isUploading && <div role="status" className="mt-3"><progress max={100} value={upload.progress} className="w-full" /><p>{upload.progress < 99 ? `Uploading ${upload.progress}%` : "Saving CV…"}</p></div>}
    {!upload.isUploading && upload.progress === 100 && !upload.error && <p role="status" className="mt-3">CV uploaded.</p>}
    {(upload.error || download.error) && <p role="alert" className="mt-3 text-red-500">{upload.error || download.error?.message}</p>}
  </div>;
}
