"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/app/components/ui/Button";
import AttendanceClock from "../dashboard/attendance-clock";
import { attendanceApi, displayTime, ErrorMessage, type Session } from "./api";

const correctionSchema = z.object({
  clockIn: z.iso.datetime({ offset: true }),
  clockOut: z.union([z.literal(""), z.iso.datetime({ offset: true })]),
  reason: z.string().trim().min(1, "A correction reason is required.").max(500),
}).refine(v => !v.clockOut || Date.parse(v.clockOut) >= Date.parse(v.clockIn), { path: ["clockOut"], message: "Clock-out must not precede clock-in." });

export default function Attendance() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [employee, setEmployee] = useState("");
  const [target, setTarget] = useState<number | undefined>();
  const [editing, setEditing] = useState<Session | null>(null);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [period, setPeriod] = useState<{ from: string; to: string } | null>(null);
  const state = useQuery({ queryKey: ["attendance", user?.id, "current"], queryFn: attendanceApi.current, enabled: !!user, retry: false });
  const history = useQuery({ queryKey: ["attendance", user?.id, "history", target, page], queryFn: () => attendanceApi.history(page, target), enabled: !!user && (!target || !!state.data?.hr), retry: false });
  const audit = useQuery({ queryKey: ["attendance", user?.id, "audit", auditId], queryFn: () => attendanceApi.audit(auditId!), enabled: !!user && !!auditId, retry: false });
  const summary = useQuery({ queryKey: ["attendance", user?.id, "summary", period], queryFn: () => attendanceApi.summary(period!.from, period!.to), enabled: !!user && !!period, retry: false });
  const zone = state.data?.timezone ?? history.data?.timezone ?? "UTC";
  return <main className="flex-1 overflow-auto p-6 space-y-5 text-textPrimary">
    <h1 className="text-2xl font-semibold">Attendance</h1>
    <AttendanceClock key={user?.id} />
    <p>Dates and times use {zone}. Overnight sessions remain one session; period summaries split closed-session presence at local midnight. Open sessions are excluded from duration totals.</p>
    {state.data?.hr && <form className="flex gap-3" onSubmit={e => { e.preventDefault(); setPage(0); setTarget(employee ? Number(employee) : undefined); setAuditId(null); }}>
      <label>Employee ID (blank for own)<input className="block border p-2" type="number" min="1" step="1" value={employee} onChange={e => setEmployee(e.target.value)} /></label>
      <Button type="submit">Load employee attendance</Button>
    </form>}
    <h2 className="text-xl font-semibold">{target ? `Employee #${target}` : "My"} history</h2>
    <ErrorMessage error={history.error} />
    {history.isPending && <p role="status">Loading history…</p>}
    {history.data && !history.isError && <>
      {history.data.total === 0 && <p>No attendance recorded.</p>}
      <div className="overflow-auto"><table className="w-full text-left"><caption>Recorded presence in {zone}</caption>
        <thead><tr><th>Clock-in</th><th>Clock-out</th><th>Duration</th><th>Actions</th></tr></thead>
        <tbody>{history.data.items.map(s => <tr key={s.id}>
          <td className="p-2">{displayTime(s.clockIn, zone)}</td><td className="p-2">{displayTime(s.clockOut, zone)}</td><td className="p-2">{s.durationSeconds == null ? "Open" : `${s.durationSeconds} seconds`}</td>
          <td className="p-2"><Button onClick={() => setAuditId(s.id)}>Correction history</Button>{state.data?.hr && <Button onClick={() => setEditing(s)}>Correct session</Button>}</td>
        </tr>)}</tbody>
      </table></div>
      <div className="flex gap-3"><Button disabled={page === 0 || history.isFetching} onClick={() => setPage(page - 1)}>Previous</Button><span>Page {page + 1} · {history.data.total} sessions</span><Button disabled={(page + 1) * 10 >= history.data.total || history.isFetching} onClick={() => setPage(page + 1)}>Next</Button></div>
    </>}
    <ErrorMessage error={audit.error} />
    {audit.data && <section><h2 className="text-xl font-semibold">Correction history</h2>{audit.data.length === 0 && <p>No corrections.</p>}<ul>{audit.data.map(a => <li className="border p-3" key={a.id}>
      HR #{a.actorId} · {displayTime(a.correctedAt, zone)} · {a.reason}<br />Before: {displayTime(a.beforeIn, zone)} → {displayTime(a.beforeOut, zone)}<br />After: {displayTime(a.afterIn, zone)} → {displayTime(a.afterOut, zone)}
    </li>)}</ul></section>}
    <section className="space-y-3"><h2 className="text-xl font-semibold">My period summary</h2>
      <form className="flex gap-3" onSubmit={e => { e.preventDefault(); setPeriod({ from, to }); }}><label>From<input className="block border p-2" type="date" required value={from} onChange={e => setFrom(e.target.value)} /></label><label>To<input className="block border p-2" type="date" required min={from} value={to} onChange={e => setTo(e.target.value)} /></label><Button type="submit">Show summary</Button></form>
      <ErrorMessage error={summary.error} />
      {summary.data && !summary.isError && <><p>Total recorded presence: {summary.data.days.reduce((n, d) => n + d.recordedSeconds, 0)} seconds · {summary.data.openSessions} open sessions excluded</p><ul>{summary.data.days.map(d => <li key={d.date}>{d.date}: {d.recordedSeconds} seconds</li>)}</ul></>}
    </section>
    {editing && state.data?.hr && <CorrectionDialog session={editing} zone={zone} close={() => setEditing(null)} />}
  </main>;
}

function CorrectionDialog({ session, zone, close }: { session: Session; zone: string; close: () => void }) {
  const client = useQueryClient();
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useForm<z.infer<typeof correctionSchema>>({ resolver: zodResolver(correctionSchema), defaultValues: { clockIn: session.clockIn, clockOut: session.clockOut ?? "", reason: "" } });
  const correction = useMutation({ mutationFn: (v: z.infer<typeof correctionSchema>) => attendanceApi.correct(session.id, { version: session.version, clockIn: v.clockIn, clockOut: v.clockOut || null, reason: v.reason }), onSuccess: () => { void client.invalidateQueries({ queryKey: ["attendance"] }); close(); } });
  return <dialog ref={node => { dialog.current = node; if (node && !node.open) node.showModal(); }} aria-labelledby="correction-title" onCancel={e => { e.preventDefault(); if (!correction.isPending) close(); }} className="m-auto max-w-xl rounded-xl border p-6 bg-background text-textPrimary">
    <h2 id="correction-title" className="text-xl font-semibold">HR attendance correction</h2>
    <p>Current: {displayTime(session.clockIn, zone)} → {displayTime(session.clockOut, zone)}</p>
    <p>Enter full ISO timestamps with an explicit offset (for example 2026-10-28T22:00:00+05:30). A closed session cannot be reopened.</p>
    <form className="space-y-3" onSubmit={form.handleSubmit(v => correction.mutate(v))}>
      <label className="block">Clock-in<input className="block border p-2 w-full" {...form.register("clockIn")} /></label>
      <label className="block">Clock-out (blank only for an open session)<input className="block border p-2 w-full" {...form.register("clockOut")} /></label>
      <label className="block">Reason<textarea className="block border p-2 w-full" maxLength={500} {...form.register("reason")} /></label>
      {Object.entries(form.formState.errors).map(([name, e]) => <p role="alert" key={name}>{name}: {e.message}</p>)}
      <ErrorMessage error={correction.error} />
      {correction.isError && <p>Inputs are retained. If the version changed, close and reload history before correcting again.</p>}
      <Button type="submit" disabled={correction.isPending}>Save correction</Button><Button type="button" disabled={correction.isPending} onClick={close}>Cancel</Button>
    </form>
  </dialog>;
}
