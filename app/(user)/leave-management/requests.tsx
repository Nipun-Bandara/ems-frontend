"use client";

import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/app/components/ui/Button";
import { leaveApi, requestApi, type LeaveRequest } from "@/app/services/leaves";
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
  const types = useQuery({ queryKey: [...prefix, "request-types"], queryFn: leaveApi.types, enabled: !!user });
  const mine = useQuery({ queryKey: [...prefix, "requests", "me"], queryFn: requestApi.mine, enabled: !!user, retry: false });
  // Managers may have any identity role. The server scopes the inbox from local projections.
  const inbox = useQuery({ queryKey: [...prefix, "requests", "inbox"], queryFn: requestApi.inbox, enabled: !!user, retry: false });
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
      <p className="text-sm text-textSecondary">Working days exclude weekends and configured holidays. Half-day leave is available for a single working date. Approval will be available in a later release.</p>
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
    <section className={box} aria-labelledby="request-history"><h2 id="request-history" className="text-lg font-semibold">My request history</h2>
      {mine.isPending ? <p role="status">Loading requests…</p> : mine.isError ? <><ErrorMessage error={mine.error} /><Button onClick={() => mine.refetch()}>Retry requests</Button></> : mine.data.length ? mine.data.map(r => <RequestCard key={r.id} request={r} typeName={types.data?.find(t => t.id === r.typeId)?.name ?? r.typeId} own refresh={refresh} />) : <p>No leave requests yet.</p>}
    </section>
    <section className={box} aria-labelledby="review-inbox"><h2 id="review-inbox" className="text-lg font-semibold">Reviewer inbox</h2>
      <p className="text-sm text-textSecondary">Pending requests assigned to you. HR can also route requests to a different eligible reviewer.</p>
      {inbox.isPending ? <p role="status">Loading inbox…</p> : inbox.isError ? <><ErrorMessage error={inbox.error} /><Button onClick={() => inbox.refetch()}>Retry inbox</Button></> : inbox.data.length ? inbox.data.map(r => <RequestCard key={r.id} request={r} typeName={types.data?.find(t => t.id === r.typeId)?.name ?? r.typeId} own={false} refresh={refresh} />) : <p>No requests to review.</p>}
    </section>
  </>;
}

function RequestCard({ request: r, typeName, own, refresh }: { request: LeaveRequest; typeName: string; own: boolean; refresh: () => Promise<void> }) {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [approver, setApprover] = useState("");
  const retry = useRetryKey();
  const mutation = useMutation({ mutationFn: async (action: "cancel" | "reject" | "route") => {
    const values = { action, reason: reason.trim(), approver: action === "route" ? approver : undefined };
    const input = { reason: values.reason, idempotencyKey: retry.key(values) };
    return action === "route" ? requestApi.route(r.id, { ...input, approverId: Number(approver) }) : requestApi[action](r.id, input);
  }, onSuccess: async () => { retry.clear(); setReason(""); toast.success("Request updated"); await refresh(); } });
  const hr = !!user?.roles.includes("HR_MANAGER");
  const assigned = Number(user?.id) === r.approverId;
  const pending = r.status === "PENDING";
  return <article className="space-y-3 border-t border-borderPrimary pt-4">
    <h3 className="font-medium">{typeName} · {r.startDate} – {r.endDate} · {r.calculatedDays} days · {r.status.replaceAll("_", " ")}</h3>
    <p className="text-sm">Employee {r.employeeId} · reviewer {r.approverId} · {r.dayFraction === "HALF" ? "Half-day" : "Full days"}</p><p className="whitespace-pre-wrap">{r.reason}</p>
    <p className="text-xs text-textSecondary">Submitted <time dateTime={r.createdAt}>{new Date(r.createdAt).toLocaleString()}</time> · version {r.version}</p>
    {pending && <><label className="block">{own ? "Cancellation reason" : "Review reason"}<textarea maxLength={500} required className={field} value={reason} onChange={e => setReason(e.target.value)} /></label>
      <div className="flex flex-wrap gap-3">{(own || assigned) && <Button disabled={mutation.isPending || !reason.trim()} onClick={() => mutation.mutate(own ? "cancel" : "reject")}>{own ? "Cancel request" : "Reject request"}</Button>}{!own && <Button disabled title="Approval is not available until the next release">Approval unavailable</Button>}</div>
      {!own && hr && <div className="flex flex-wrap items-end gap-3"><label>New reviewer user ID<input type="number" min="1" step="1" className={field} value={approver} onChange={e => setApprover(e.target.value)} /></label><Button disabled={mutation.isPending || !reason.trim() || !Number.isSafeInteger(Number(approver)) || Number(approver) <= 0 || Number(approver) === r.approverId || Number(approver) === r.employeeId} onClick={() => mutation.mutate("route")}>Route to reviewer</Button></div>}
    </>}
    <ErrorMessage error={mutation.error} />
  </article>;
}
