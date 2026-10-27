"use client";

import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/app/components/ui/Button";
import type { ApiError } from "@/app/lib/axios";
import { timesheetApi, type Entry, type Project, type Sheet } from "@/app/services/timesheets";

const field = "w-full rounded-lg border border-borderPrimary bg-background px-2 py-2 text-textPrimary disabled:opacity-60";
const schema = z.object({ rows: z.array(z.object({
  projectId: z.string().regex(/^[1-9]\d*$/, "Choose a project"),
  description: z.string().trim().min(1, "Describe your work").max(240),
  minutes: z.array(z.string().regex(/^\d*$/, "Use whole, nonnegative minutes")).length(7),
})).max(500) });
type Values = z.infer<typeof schema>;
const blank = () => ({ projectId: "", description: "", minutes: Array<string>(7).fill("") });
function dates(week: string) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${week}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + i); return d.toISOString().slice(0, 10);
  });
}
function rowsFrom(sheet: Sheet | null, days: string[]): Values {
  const rows: Values["rows"] = [];
  for (const e of sheet?.entries ?? []) {
    let row = rows.find(r => r.projectId === String(e.projectId) && r.description === e.description && r.minutes[days.indexOf(e.date)] === "");
    if (!row) { row = { ...blank(), projectId: String(e.projectId), description: e.description }; rows.push(row); }
    row.minutes[days.indexOf(e.date)] = String(e.minutes);
  }
  return { rows: rows.length ? rows : [blank()] };
}
function ErrorMessage({ error }: { error: unknown }) {
  return error ? <p role="alert" className="text-red-600">{(error as ApiError).message || "The request failed. Your edits are still here; retry when ready."}</p> : null;
}
export default function Timesheets() {
  const { user } = useAuth();
  const [week, setWeek] = useState("");
  const calendar = useQuery({ queryKey: ["timesheets", user?.id, "calendar"], queryFn: timesheetApi.calendar, enabled: !!user, retry: false });
  const selected = week || calendar.data?.currentWeekStart;
  return <main className="flex-1 overflow-auto p-6 text-textPrimary space-y-5">
    <h1 className="text-2xl font-semibold">My timesheets</h1>
    <p>Record whole minutes for each project and day. Submit your week when it is ready.</p>
    {calendar.isPending && <p role="status">Loading organization calendar…</p>}
    <ErrorMessage error={calendar.error} />{calendar.isError && <Button onClick={() => calendar.refetch()}>Retry calendar</Button>}
    {user && selected && calendar.data && <Weekly key={`${user.id}:${selected}`} userId={user.id} week={selected} timezone={calendar.data.timezone} changeWeek={setWeek} />}
  </main>;
}
function Weekly({ userId, week, timezone, changeWeek }: { userId: string; week: string; timezone: string; changeWeek: (week: string) => void }) {
  const sheets = useQuery({ queryKey: ["timesheets", userId, week], queryFn: () => timesheetApi.mine(week), retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false });
  const projects = useQuery({ queryKey: ["timesheet-projects", userId, week], queryFn: () => timesheetApi.projects(week), retry: false });
  return <>
    <p>Organization timezone: {timezone}. Weeks run Monday–Sunday.</p>
    {sheets.isPending ? <p role="status">Loading your week…</p> : sheets.isError ? <><ErrorMessage error={sheets.error} /><Button onClick={() => sheets.refetch()}>Retry timesheet</Button></> : <Editor initial={sheets.data[0] ?? null} week={week} projects={projects.data ?? []} projectsError={projects.error} projectsLoading={projects.isPending} retryProjects={() => { void projects.refetch(); }} changeWeek={changeWeek} />}
  </>;
}
function Editor({ initial, week, projects, projectsError, projectsLoading, retryProjects, changeWeek }: {
  initial: Sheet | null; week: string; projects: Project[]; projectsError: unknown; projectsLoading: boolean;
  retryProjects: () => void; changeWeek: (week: string) => void;
}) {
  const days = dates(week);
  const [sheet, setSheet] = useState(initial);
  const [pendingSubmit, setPendingSubmit] = useState<{ id: string; version: number } | null>(null);
  const [notice, setNotice] = useState("");
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: rowsFrom(initial, days) });
  const rows = useFieldArray({ control: form.control, name: "rows" });
  const values = useWatch({ control: form.control, name: "rows" });
  const totals = days.map((_, i) => values.reduce((sum, row) => sum + (Number(row.minutes?.[i]) || 0), 0));
  const frozen = !!sheet && sheet.status !== "DRAFT";
  const mutation = useMutation({ mutationFn: async ({ action, input }: { action: "save" | "submit"; input: Values }) => {
    setNotice("");
    if (action === "submit" && pendingSubmit) return timesheetApi.submit(pendingSubmit.id, pendingSubmit.version);
    const entries: Entry[] = input.rows.flatMap(row => row.minutes.flatMap((minutes, i) => minutes === "" ? [] : [{ date: days[i], projectId: Number(row.projectId), minutes: Number(minutes), description: row.description }]));
    if (totals.some(t => t > 1440)) throw new Error("Daily total cannot exceed 1440 minutes (24 hours). Your edits are retained.");
    const current = sheet ?? await timesheetApi.create(week);
    setSheet(current);
    if (current.status !== "DRAFT") throw new Error("This week is already submitted. Reload the saved sheet to view its frozen entries. Your local edits are retained.");
    const saved = await timesheetApi.save(current.id, { version: current.version, entries });
    setSheet(saved);
    if (action === "save") return saved;
    // Keep this exact sheet/version if the submission response is lost. Retry skips saving.
    setPendingSubmit({ id: saved.id, version: saved.version });
    return timesheetApi.submit(saved.id, saved.version);
  }, onSuccess: result => {
    setSheet(result); setPendingSubmit(null); form.reset(rowsFrom(result, days));
    setNotice(result.status === "SUBMITTED" ? "Submitted. These entries are frozen." : "Draft saved. You can return to this week later.");
    toast.success(result.status === "SUBMITTED" ? "Timesheet submitted" : "Draft saved");
  } });
  const reload = useMutation({ mutationFn: async () => sheet ? timesheetApi.get(sheet.id) : null, onSuccess: result => {
    setSheet(result); setPendingSubmit(null); form.reset(rowsFrom(result, days)); mutation.reset(); setNotice("Loaded the saved sheet.");
  } });
  const remove = useMutation({ mutationFn: async () => { if (sheet) await timesheetApi.remove(sheet.id, sheet.version); }, onSuccess: () => {
    setSheet(null); form.reset({ rows: [blank()] }); mutation.reset(); setNotice("Draft deleted.");
  } });
  const busy = mutation.isPending || reload.isPending || remove.isPending;
  const disabled = frozen || busy || !!pendingSubmit;
  const dirty = form.formState.isDirty;
  const openWeek = (value: string) => {
    const day = new Date(`${value}T12:00:00Z`);
    if (!Number.isNaN(day.getTime()) && day.getUTCDay() === 1) changeWeek(value);
    else setNotice("Choose a Monday to open a week.");
  };
  return <section className="space-y-4 rounded-xl border border-borderPrimary bg-backgroundSecondary p-5">
    <div className="flex flex-wrap items-center gap-4">
      <label>Week starting Monday<input aria-label="Week starting Monday" className={field} type="date" min="1900-01-01" max="9998-12-31" value={week} disabled={dirty || busy || !!pendingSubmit} onChange={e => openWeek(e.target.value)} /></label>
      <strong>{sheet?.status ?? "New draft"}</strong>
      <span>{dirty ? "Unsaved edits — save or reload before changing weeks." : "All edits saved"}</span>
    </div>
    {projectsLoading && <p role="status">Loading eligible projects…</p>}
    <ErrorMessage error={projectsError} />{!!projectsError && <Button onClick={retryProjects}>Retry projects</Button>}
    {!projectsLoading && !projectsError && projects.length === 0 && <p>No project memberships are available for this week. Ask your administrator to reconcile project and membership history.</p>}
    <p className="text-sm text-textSecondary">Use a row for each project and description. Blank days are omitted; zero is saved as a zero-minute entry. Maximum per day: 1440 minutes.</p>
    <form onSubmit={form.handleSubmit(input => mutation.mutate({ action: "save", input }))} className="space-y-4">
      <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-sm">
        <caption className="sr-only">Weekly project minutes and daily totals</caption>
        <thead><tr><th className="p-2 text-left">Project</th><th className="p-2 text-left">Description</th>{days.map(day => <th className="p-2" key={day}>{new Date(`${day}T12:00Z`).toLocaleDateString("en", { weekday: "short", timeZone: "UTC" })}<br />{day.slice(5)}</th>)}<th>Total</th><th>Actions</th></tr></thead>
        <tbody>{rows.fields.map((row, index) => {
          const selected = projects.find(p => String(p.id) === values[index]?.projectId);
          return <tr key={row.id}>
            <td className="p-2 min-w-40"><select className={field} aria-label={`Project row ${index + 1}`} disabled={disabled} {...form.register(`rows.${index}.projectId`)}>
              <option value="">Choose project</option>
              {values[index]?.projectId && !selected && <option value={values[index].projectId}>Project #{values[index].projectId} (unavailable)</option>}
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></td>
            <td className="p-2 min-w-48"><input className={field} aria-label={`Description row ${index + 1}`} maxLength={240} disabled={disabled} {...form.register(`rows.${index}.description`)} /></td>
            {days.map((day, i) => <td className="p-1" key={day}><input className={`${field} min-w-20`} type="number" step="1" min="0" max="1440" aria-label={`${day} minutes row ${index + 1}`} disabled={disabled || !selected?.eligibleDates.includes(day)} {...form.register(`rows.${index}.minutes.${i}`)} /></td>)}
            <td className="p-2 text-center">{values[index]?.minutes.reduce((sum, n) => sum + (Number(n) || 0), 0)}</td>
            <td className="p-2"><Button type="button" disabled={disabled} onClick={() => rows.remove(index)}>Remove row {index + 1}</Button></td>
          </tr>;
        })}</tbody>
        <tfoot><tr><th colSpan={2} className="p-2 text-left">Daily totals (minutes)</th>{totals.map((total, i) => <td key={days[i]} className={`p-2 text-center ${total > 1440 ? "text-red-600 font-bold" : ""}`}>{total}{total > 1440 && <span className="block">Over 24h</span>}</td>)}<td className="p-2 font-bold" aria-label="Weekly total">{totals.reduce((a, b) => a + b, 0)}</td><td /></tr></tfoot>
      </table></div>
      {form.formState.errors.rows && <p role="alert" className="text-red-600">Check every row: choose a project, add a short description, and use whole nonnegative minutes.</p>}
      <ErrorMessage error={mutation.error} /><ErrorMessage error={reload.error} /><ErrorMessage error={remove.error} />
      {notice && <p role="status">{notice}</p>}
      {pendingSubmit && <p role="alert">Submission has not been confirmed. Your saved entries are retained. Retry submission to retrieve its result, or reload the saved sheet to check its status.</p>}
      <div className="flex flex-wrap gap-3">
        {!frozen && <><Button type="button" disabled={disabled || rows.fields.length >= 500} onClick={() => rows.append(blank())}>Add project row</Button>
          <Button type="submit" disabled={disabled || !!projectsError || projectsLoading}>Save draft</Button>
          <Button type="button" disabled={busy || (!pendingSubmit && (dirty || !sheet || !totals.some(t => t > 0)))} onClick={form.handleSubmit(input => mutation.mutate({ action: "submit", input }))}>{pendingSubmit ? "Retry submission" : "Submit timesheet"}</Button></>}
        <Button type="button" disabled={busy} onClick={() => {
          if (!dirty || window.confirm("Discard unsaved edits and reload the saved sheet?")) reload.mutate();
        }}>Reload saved sheet</Button>
        {sheet?.status === "DRAFT" && <Button type="button" disabled={busy || !!pendingSubmit} onClick={() => { if (window.confirm("Delete this draft and its entries?")) remove.mutate(); }}>Delete draft</Button>}
      </div>
      {!frozen && dirty && <p>Save your draft before submitting. Submitted entries cannot be edited.</p>}
      {frozen && <p>Submitted entries are frozen. Review decisions will be available in a later item.</p>}
    </form>
  </section>;
}
