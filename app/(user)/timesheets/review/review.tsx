"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/app/components/ui/Button";
import { timesheetApi, type Sheet } from "../api";
import History from "../history";

const schema = z.object({ reason: z.string().trim().max(500) });
function ErrorMessage({ error }: { error: unknown }) {
  return error ? <p role="alert">{(error as Error).message || "Request failed. Reload and try again."}</p> : null;
}
export default function Review() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const permissions = useQuery({ queryKey: ["timesheet-permissions", user?.id], queryFn: timesheetApi.permissions, enabled: !!user, retry: false });
  const inbox = useQuery({ queryKey: ["timesheet-inbox", user?.id], queryFn: timesheetApi.inbox, enabled: !!user && !!permissions.data?.reviewer, retry: false });
  const detail = useQuery({ queryKey: ["timesheet-review", user?.id, selected], queryFn: () => timesheetApi.detail(selected!), enabled: !!selected && !!permissions.data?.reviewer, retry: false });
  return <main className="flex-1 overflow-auto p-6 text-textPrimary space-y-5">
    <h1 className="text-2xl font-semibold">Review timesheets</h1>
    <Link href="/timesheets" className="underline">My timesheets</Link>
    <ErrorMessage error={permissions.error} /><ErrorMessage error={inbox.error} />
    {permissions.data && !permissions.data.reviewer && <p role="alert">You do not have permission to review timesheets.</p>}
    {permissions.data?.reviewer && <>
      <Button onClick={() => { void inbox.refetch(); if (selected) void detail.refetch(); }}>Reload inbox and detail</Button>
      {inbox.isPending && <p role="status">Loading submitted timesheets…</p>}
      {inbox.data?.length === 0 && <p>No submitted timesheets in your review scope.</p>}
      <ul className="space-y-2">{inbox.data?.map(sheet => <li key={sheet.id}>
        <Button onClick={() => setSelected(sheet.id)}>Review employee #{sheet.employeeId}, week {sheet.weekStart} — {sheet.entries.reduce((n, e) => n + e.minutes, 0)} minutes</Button>
      </li>)}</ul>
      {selected && detail.isPending && <p role="status">Loading entry detail…</p>}
      <ErrorMessage error={detail.error} />
      {detail.data && !detail.isError && <Decision key={`${user?.id}:${detail.data.id}:${detail.data.version}`} sheet={detail.data} actor={user?.id ?? ""} />}
    </>}
  </main>;
}
function Decision({ sheet, actor }: { sheet: Sheet; actor: string }) {
  const client = useQueryClient();
  const [result, setResult] = useState<Sheet | null>(null);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { reason: "" } });
  const decision = useMutation({ mutationFn: ({ reject, reason }: { reject: boolean; reason: string }) => timesheetApi.decide(sheet.id, reject, { version: sheet.version, reason }), onSuccess: data => {
    setResult(data);
    void client.invalidateQueries({ queryKey: ["timesheet-inbox"] });
    void client.invalidateQueries({ queryKey: ["timesheet-review"] });
  } });
  const shown = result ?? sheet;
  const permitted = shown.status === "SUBMITTED" && String(shown.employeeId) !== actor;
  const send = (reject: boolean) => form.handleSubmit(({ reason }) => {
    if (reject && !reason.trim()) { form.setError("reason", { message: "A rejection reason is required." }); return; }
    decision.mutate({ reject, reason });
  })();
  return <section className="space-y-4 rounded-xl border border-borderPrimary p-5">
    <h2 className="text-xl font-semibold">Employee #{shown.employeeId} — {shown.weekStart}</h2>
    <p role="status">{shown.status} · Version {shown.version}</p>
    <div className="overflow-auto"><table className="w-full text-left"><caption>Submitted entry detail</caption>
      <thead><tr><th>Date</th><th>Project</th><th>Description</th><th>Minutes</th></tr></thead>
      <tbody>{shown.entries.map((e, i) => <tr key={i}><td className="p-2">{e.date}</td><td className="p-2">#{e.projectId}</td><td className="p-2 whitespace-pre-wrap">{e.description}</td><td className="p-2">{e.minutes}</td></tr>)}</tbody>
      <tfoot><tr><th colSpan={3}>Total minutes</th><td>{shown.entries.reduce((n, e) => n + e.minutes, 0)}</td></tr></tfoot>
    </table></div>
    <History sheet={shown} />
    {permitted && <form onSubmit={e => { e.preventDefault(); void send(true); }} className="space-y-3">
      <label className="block">Reason (required to reject)<textarea className="block w-full rounded border border-borderPrimary p-2" maxLength={500} disabled={decision.isPending} aria-invalid={!!form.formState.errors.reason} {...form.register("reason")} /></label>
      {form.formState.errors.reason && <p role="alert">{form.formState.errors.reason.message}</p>}
      <ErrorMessage error={decision.error} />
      {decision.isError && <p>Reload the detail before retrying if the sheet changed. Your reason is retained.</p>}
      <div className="flex gap-3"><Button type="button" disabled={decision.isPending} onClick={() => { void send(false); }}>Approve timesheet</Button><Button type="submit" disabled={decision.isPending}>Reject timesheet</Button></div>
    </form>}
  </section>;
}
