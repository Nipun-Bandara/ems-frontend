"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/app/components/ui/Button";
import { leaveApi, requestApi, type LeaveRequest, type Workflow, type WorkflowStart } from "@/app/services/leaves";
import type { ApiError } from "@/app/lib/axios";

const field = "mt-1 w-full rounded-lg border border-borderPrimary bg-background px-3 py-2 text-textPrimary";
const box = "rounded-xl border border-borderPrimary bg-backgroundSecondary p-5 space-y-4";
const schema = z.object({
  typeId: z.uuid("Select a leave type"),
  startDate: z.iso.date("Enter a start date"),
  endDate: z.iso.date("Enter an end date"),
  dayFraction: z.enum(["FULL", "HALF"]),
  reason: z.string().trim().min(1, "A reason is required").max(500),
}).refine(v => v.endDate >= v.startDate, { message: "End date must be on or after start date", path: ["endDate"] })
  .refine(v => v.dayFraction !== "HALF" || v.startDate === v.endDate, { message: "Half-day requires a single working date", path: ["dayFraction"] });

function ErrorMessage({ error }: { error: unknown }) {
  if (!error) return null;
  return <p role="alert" className="text-sm text-red-600">{(error as ApiError).message || "Unable to load leave requests. Please retry."}</p>;
}

// Keep keys across uncertain responses; changing input starts a new operation.
function useRetryKey() {
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);
  return { key: (input: unknown) => {
    const fingerprint = JSON.stringify(input);
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
    return attempt.current.key;
  }, clear: () => { attempt.current = null; } };
}

export default function LeaveRequests() {
  const { user } = useAuth();
  const client = useQueryClient();
  const prefix = ["leaves", user?.id];
  const refresh = async () => { await client.invalidateQueries({ queryKey: ["leaves", user?.id] }); };
  const absences = useQuery({ queryKey: [...prefix, "calendar"], queryFn: leaveApi.calendar, enabled: !!user });
  const types = useQuery({ queryKey: [...prefix, "request-types"], queryFn: leaveApi.types, enabled: !!user });
  const mine = useQuery({ queryKey: [...prefix, "requests", "me"], queryFn: requestApi.mine, enabled: !!user, retry: false, refetchInterval: query => query.state.data?.some(r => r.status === "APPROVAL_IN_PROGRESS") ? 1500 : false });
  // Managers may have any identity role. The server scopes the inbox from local projections.
  const inbox = useQuery({ queryKey: [...prefix, "requests", "inbox"], queryFn: requestApi.inbox, enabled: !!user, retry: false, refetchInterval: query => query.state.data?.some(r => r.status === "APPROVAL_IN_PROGRESS") ? 1500 : false });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { typeId: "", startDate: "", endDate: "", dayFraction: "FULL", reason: "" } });
  const [startDate, endDate, dayFraction] = useWatch({ control: form.control, name: ["startDate", "endDate", "dayFraction"] });
  const preview = useQuery({
    queryKey: [...prefix, "estimate", startDate, endDate, dayFraction],
    queryFn: () => requestApi.estimate({ startDate, endDate, dayFraction }),
    enabled: !!user && /^\d{4}-\d{2}-\d{2}$/.test(startDate) && /^\d{4}-\d{2}-\d{2}$/.test(endDate),
    retry: false, staleTime: 0,
  });
  const retry = useRetryKey();
  const submit = useMutation({ mutationFn: requestApi.submit, onSuccess: async () => {
    retry.clear(); form.reset(); toast.success("Leave request submitted"); await refresh();
  } });
  return <>
    <section className={box} aria-labelledby="request-leave"><h2 id="request-leave" className="text-lg font-semibold">Request leave</h2>
      <p className="text-sm text-textSecondary">Working days exclude weekends and configured holidays. Half-day leave is available for a single working date. Approval progress is saved and can recover after interruptions.</p>
      <form className="space-y-4" onSubmit={form.handleSubmit(async values => {
        try { await submit.mutateAsync({ ...values, idempotencyKey: retry.key(values) }); } catch { /* Render the API error and retain the retry key. */ }
      })}>
        <label className="block">Request leave type<select className={field} {...form.register("typeId")}><option value="">Choose a type</option>{types.data?.filter(t => t.active).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        {types.isPending && <p role="status">Loading types…</p>}<ErrorMessage error={types.error} />{types.isError && <Button type="button" onClick={() => types.refetch()}>Retry request types</Button>}
        <div className="grid gap-4 sm:grid-cols-2"><label>Start date<input type="date" min="1900-01-01" max="9999-12-31" className={field} {...form.register("startDate")} /></label><label>End date<input type="date" min="1900-01-01" max="9999-12-31" className={field} {...form.register("endDate")} /></label></div>
        <label className="block">Day fraction<select className={field} {...form.register("dayFraction")}><option value="FULL">Full days</option><option value="HALF">Half-day</option></select></label>
        <div aria-live="polite">{preview.isFetching ? <p role="status">Calculating working days…</p> : preview.data ? <p>Server estimate: <strong>{preview.data.calculatedDays} days</strong>. Recalculated when submitted.</p> : <p>Choose dates to preview chargeable days.</p>}<ErrorMessage error={preview.error} />{preview.isError && <Button type="button" onClick={() => preview.refetch()}>Retry estimate</Button>}</div>
        <label className="block">Request reason<textarea maxLength={500} className={field} {...form.register("reason")} /></label>
        {Object.entries(form.formState.errors).map(([name, error]) => <p role="alert" className="text-sm text-red-600" key={name}>{error.message}</p>)}
        <ErrorMessage error={submit.error} /><Button type="submit" disabled={submit.isPending || !preview.data || preview.isError || preview.isFetching}>{submit.isPending ? "Submitting…" : "Submit leave request"}</Button>
      </form>
    </section>
    <section className={box} aria-labelledby="approved-calendar"><h2 id="approved-calendar" className="text-lg font-semibold">My approved absences</h2>
      {absences.isPending ? <p role="status">Loading calendar…</p> : absences.isError ? <ErrorMessage error={absences.error} /> : absences.data.absences.length ? absences.data.absences.map(a => <p key={a.requestId}>{a.startDate} – {a.endDate} · {a.dayFraction === "HALF" ? "Half-day" : "Full days"}</p>) : <p>No approved absences.</p>}
    </section>
    <section className={box} aria-labelledby="request-history"><h2 id="request-history" className="text-lg font-semibold">My request history</h2>
      {mine.isPending ? <p role="status">Loading requests…</p> : mine.isError ? <><ErrorMessage error={mine.error} /><Button onClick={() => mine.refetch()}>Retry requests</Button></> : mine.data.length ? mine.data.map(r => <RequestCard key={r.id} request={r} typeName={types.data?.find(t => t.id === r.typeId)?.name ?? r.typeId} own refresh={refresh} />) : <p>No leave requests yet.</p>}
    </section>
    <section className={box} aria-labelledby="review-inbox"><h2 id="review-inbox" className="text-lg font-semibold">Reviewer inbox</h2>
      <p className="text-sm text-textSecondary">Assigned requests and their approval progress. HR can also route requests to a different eligible reviewer.</p>
      {inbox.isPending ? <p role="status">Loading inbox…</p> : inbox.isError ? <><ErrorMessage error={inbox.error} /><Button onClick={() => inbox.refetch()}>Retry inbox</Button></> : inbox.data.length ? inbox.data.map(r => <RequestCard key={r.id} request={r} typeName={types.data?.find(t => t.id === r.typeId)?.name ?? r.typeId} own={false} refresh={refresh} />) : <p>No requests to review.</p>}
    </section>
  </>;
}

type Decision = "approve" | "cancel";
type SavedAttempt = { action: Decision; input: WorkflowStart };
const terminal = (state: Workflow["state"]) => ["APPROVED", "APPROVAL_FAILED", "CANCELLED"].includes(state);

function RequestCard({ request: r, typeName, own, refresh }: { request: LeaveRequest; typeName: string; own: boolean; refresh: () => Promise<void> }) {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [approver, setApprover] = useState("");
  const [confirmation, setConfirmation] = useState<Decision | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const retry = useRetryKey();
  const storageKey = `leave-decision:${user?.id}:${r.id}`;
  const [attempt, setAttempt] = useState<SavedAttempt | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const workflows = useQuery({ queryKey: ["leaves", user?.id, "workflows", r.id, r.version], queryFn: () => requestApi.workflows(r.id), enabled: !!user, retry: false, refetchInterval: query => query.state.data?.some(w => !terminal(w.state)) ? 1500 : false });
  const active = workflows.data?.find(w => !terminal(w.state));
  const latest = workflows.data?.at(-1);
  const completed = useRef<string | null>(null);
  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey);
    if (saved) {
      try {
        const value = JSON.parse(saved) as SavedAttempt;
        if (["approve", "cancel"].includes(value.action) && value.input?.idempotencyKey) {
          // Restore the exact request after a reload, including its original version.
          queueMicrotask(() => { setAttempt(value); setUncertain(true); });
        }
      } catch { sessionStorage.removeItem(storageKey); }
    }
  }, [storageKey]);
  useEffect(() => {
    if (!latest || !terminal(latest.state) || active || completed.current === latest.id) return;
    completed.current = latest.id;
    void refresh();
  }, [latest, active, refresh]);
  useEffect(() => {
    if (confirmation) dialog.current?.showModal();
    else dialog.current?.close();
  }, [confirmation]);
  const mutation = useMutation({ mutationFn: async (action: "reject" | "route") => {
    const values = { action, reason: reason.trim(), approver: action === "route" ? approver : undefined };
    const input = { reason: values.reason, idempotencyKey: retry.key(values) };
    return action === "route" ? requestApi.route(r.id, { ...input, approverId: Number(approver) }) : requestApi.reject(r.id, input);
  }, onSuccess: async () => { retry.clear(); setReason(""); toast.success("Request updated"); await refresh(); } });
  const decision = useMutation({ mutationFn: async (saved: SavedAttempt) => {
    return requestApi[saved.action](r.id, saved.input);
  }, onSuccess: async () => {
    sessionStorage.removeItem(storageKey); setAttempt(null); setUncertain(false); setReason("");
    await refresh();
  }, onError: async (error) => {
    // A definitive rejection can be reconciled without inventing another workflow.
    const status = (error as unknown as ApiError).status;
    if ([400, 403, 409].includes(status)) {
      try {
        await requestApi.workflows(r.id);
        sessionStorage.removeItem(storageKey); setAttempt(null); setUncertain(false);
      } catch { setUncertain(true); }
    } else setUncertain(true);
    await refresh();
  } });
  const confirm = () => {
    if (!confirmation) return;
    const saved = { action: confirmation, input: { version: r.version, reason: reason.trim(), idempotencyKey: crypto.randomUUID() } };
    // Save before sending; an HTTP error does not establish that the transaction failed.
    sessionStorage.setItem(storageKey, JSON.stringify(saved));
    setAttempt(saved); setConfirmation(null); decision.mutate(saved);
  };
  const hr = !!user?.roles.includes("HR_MANAGER");
  const assigned = Number(user?.id) === r.approverId && Number(user?.id) !== r.employeeId;
  const pending = r.status === "PENDING";
  const canCancel = own && ["PENDING", "APPROVAL_IN_PROGRESS", "APPROVED"].includes(r.status);
  const busy = decision.isPending || mutation.isPending || !!active;
  return <article className="space-y-3 border-t border-borderPrimary pt-4">
    <h3 className="font-medium">{typeName} · {r.startDate} – {r.endDate} · {r.calculatedDays} days · {r.status.replaceAll("_", " ")}</h3>
    <p className="text-sm">Employee {r.employeeId} · reviewer {r.approverId} · {r.dayFraction === "HALF" ? "Half-day" : "Full days"}</p><p className="whitespace-pre-wrap">{r.reason}</p>
    <p className="text-xs text-textSecondary">Submitted <time dateTime={r.createdAt}>{new Date(r.createdAt).toLocaleString()}</time> · version {r.version}</p>
    <div aria-live="polite">{latest && <p role="status">{latest.operation === "CANCEL" ? "Cancellation" : "Approval"}: {latest.state.replaceAll("_", " ")} · workflow {latest.id} · attempts {latest.attempts}</p>}
      {latest?.state === "APPROVAL_FAILED" && <p role="alert">Approval failed. The balance has been restored and the calendar entry removed. {latest.error}</p>}
      {active && <p role="status">Progress is saved. You can leave this page while processing continues.</p>}
    </div>
    <ErrorMessage error={workflows.error} />
    {(canCancel || (pending && !own)) && <>
      <label className="block">{own ? "Cancellation reason" : "Review reason"}<textarea maxLength={500} required disabled={!!attempt || decision.isPending} className={field} value={attempt?.input.reason ?? reason} onChange={e => setReason(e.target.value)} /></label>
      <div className="flex flex-wrap gap-3">
        {canCancel && <Button disabled={decision.isPending || !!attempt || !reason.trim() || active?.operation === "CANCEL"} onClick={() => setConfirmation("cancel")}>Cancel request</Button>}
        {pending && !own && assigned && <><Button disabled={busy || !!attempt || !reason.trim()} onClick={() => setConfirmation("approve")}>Approve request</Button><Button disabled={busy || !!attempt || !reason.trim()} onClick={() => mutation.mutate("reject")}>Reject request</Button></>}
      </div>
      {pending && !own && hr && <div className="flex flex-wrap items-end gap-3"><label>New reviewer user ID<input type="number" min="1" step="1" className={field} value={approver} onChange={e => setApprover(e.target.value)} /></label><Button disabled={busy || !!attempt || !reason.trim() || !Number.isSafeInteger(Number(approver)) || Number(approver) <= 0 || Number(approver) === r.approverId || Number(approver) === r.employeeId} onClick={() => mutation.mutate("route")}>Route to reviewer</Button></div>}
    </>}
    {uncertain && attempt && <div role="alert"><p>The response was not confirmed. Progress is being checked. Retry the saved decision to retrieve its result; it uses the same key and version.</p><Button disabled={decision.isPending} onClick={() => decision.mutate(attempt)}>Retry saved decision</Button></div>}
    <ErrorMessage error={mutation.error || decision.error} />
    <dialog ref={dialog} onCancel={() => setConfirmation(null)} className="m-auto max-w-md space-y-4 rounded-xl border border-borderPrimary bg-background p-6 text-textPrimary backdrop:bg-black/50" aria-labelledby={`confirm-${r.id}`}>
      <h3 id={`confirm-${r.id}`} className="text-lg font-semibold">{confirmation === "approve" ? "Approve this leave?" : "Cancel this leave?"}</h3>
      <p>{r.startDate} – {r.endDate} · {r.calculatedDays} days</p><p>{confirmation === "approve" ? "Approval will debit the reserved balance and add an absence to the calendar." : "Cancellation will restore the balance and remove any approved absence."}</p>
      <p className="whitespace-pre-wrap">{reason}</p><div className="flex gap-3"><Button onClick={() => setConfirmation(null)}>Go back</Button><Button onClick={confirm}>Confirm {confirmation === "approve" ? "approval" : "cancellation"}</Button></div>
    </dialog>
  </article>;
}
