"use client";

import Link from "next/link";
import { Receipts, useReceipts } from "./receipts";
import { useState } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/Button";
import { useAuth } from "@/app/context/AuthContext";
import type { ApiError } from "@/app/lib/axios";
import { claimsApi, type Claim, type Line } from "./api";

const field = "w-full rounded-lg border border-borderPrimary bg-background px-3 py-2 text-textPrimary disabled:opacity-60";
const lineSchema = z.object({
 category: z.string().trim().min(1, "Enter a category").max(80),
 expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose an expense date"),
 description: z.string().trim().min(1, "Enter a description").max(500),
 currency: z.string().regex(/^[A-Z]{3}$/),
 amount: z.string().regex(/^[0-9]{1,17}(\.[0-9]{1,2})?$/, "Use a positive amount with at most two decimal places").refine(value => /[1-9]/.test(value), "Amount must be positive"),
});
const schema = z.object({ lines: z.array(lineSchema).max(100) });
type Values = z.infer<typeof schema>;
const blank = (currency: string): Line => ({ category: "", expenseDate: "", description: "", currency, amount: "" });
function errorMessage(error: unknown) { return (error as ApiError)?.message || "The request failed. Your edits are retained; reload to check the saved state."; }
function exactTotal(lines: Partial<Line>[]) {
 let cents = BigInt(0);
 for (const line of lines) {
  if (!/^[0-9]{1,17}(\.[0-9]{1,2})?$/.test(line.amount ?? "")) continue;
  const [whole, fraction = ""] = line.amount!.split(".");
  cents += BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
 }
 return `${cents / BigInt(100)}.${String(cents % BigInt(100)).padStart(2, "0")}`;
}
function ClaimHistory({ claim }: { claim: Claim }) {
 return <details className="mt-4"><summary className="cursor-pointer">Claim history</summary><ol className="mt-2 space-y-2">{claim.history.map(h => <li key={h.id}>{h.action} · User {h.actorId} · {new Date(h.occurredAt).toLocaleString()}{h.reason && <p className="whitespace-pre-wrap">Reason: {h.reason}</p>}</li>)}</ol></details>;
}
function ClaimLines({ claim }: { claim: Claim }) {
 return <div className="overflow-x-auto"><table className="w-full text-left"><caption className="sr-only">Expense line items</caption><thead><tr>{["Category", "Expense date", "Description", "Currency", "Amount"].map(label => <th className="p-2" key={label}>{label}</th>)}</tr></thead><tbody>{claim.lines.map((l, i) => <tr key={i}>{[l.category, l.expenseDate, l.description, l.currency, l.amount].map((value, index) => <td className="p-2 whitespace-pre-wrap" key={index}>{value}</td>)}</tr>)}</tbody></table></div>;
}
function Editor({ claim, changed, removed }: { claim: Claim; changed: (claim: Claim) => void; removed: () => void }) {
 const receipts = useReceipts(claim.id);
 const [notice, setNotice] = useState("");
 const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { lines: claim.lines } });
 const rows = useFieldArray({ control: form.control, name: "lines" });
 const values = useWatch({ control: form.control, name: "lines" });
 const mutation = useMutation({
  mutationFn: async ({ action, input }: { action: "save" | "submit" | "withdraw" | "delete"; input?: Values }) => {
   if (action === "save") return claimsApi.save(claim.id, { version: claim.version, lines: input!.lines });
   if (action === "delete") { await claimsApi.remove(claim.id, claim.version); return null; }
   return claimsApi.transition(claim.id, action, claim.version);
  },
  onSuccess: result => { setNotice(""); if (result) changed(result); else removed(); toast.success("Claim updated"); },
  onError: error => setNotice(errorMessage(error)),
 });
 const draft = claim.status === "DRAFT";
 return <section className="space-y-4 rounded-xl border border-borderPrimary p-4" aria-label="Selected claim">
  <h2 className="text-xl font-semibold">{claim.status} · {claim.currency} {claim.total}</h2>
  <p className="break-all text-sm">Claim {claim.id}</p>
  {notice && <p role="alert">{notice}</p>}
  {draft ? <form onSubmit={form.handleSubmit(input => mutation.mutate({ action: "save", input }))} className="space-y-4">
   <fieldset disabled={mutation.isPending} className="space-y-4">
    <legend className="mb-2">Expense line items · {claim.currency}</legend>
    {rows.fields.map((row, i) => <div key={row.id} className="grid gap-3 rounded-lg border border-borderPrimary p-3 md:grid-cols-2">
     <h3 className="md:col-span-2 font-medium">Line {i + 1}</h3>
     <label>Category<input className={field} maxLength={80} {...form.register(`lines.${i}.category`)} /></label>
     <label>Expense date<input className={field} type="date" {...form.register(`lines.${i}.expenseDate`)} /></label>
     <label className="md:col-span-2">Description<input className={field} maxLength={500} {...form.register(`lines.${i}.description`)} /></label>
     <label>Currency<input className={field} readOnly {...form.register(`lines.${i}.currency`)} /></label>
     <label>Amount<input className={field} inputMode="decimal" {...form.register(`lines.${i}.amount`)} /></label>
     {(["category", "expenseDate", "description", "currency", "amount"] as const).map(name => form.formState.errors.lines?.[i]?.[name]?.message && <p role="alert" key={name}>{form.formState.errors.lines[i]?.[name]?.message}</p>)}
     <Button type="button" onClick={() => rows.remove(i)}>Remove line {i + 1}</Button>
    </div>)}
    <Button type="button" disabled={rows.fields.length >= 100} onClick={() => rows.append(blank(claim.currency))}>Add line</Button>
    <p>Draft total: <output>{claim.currency} {exactTotal(values)}</output></p>
    <div className="flex flex-wrap gap-2">
     <Button type="submit">Save draft</Button>
     <Button type="button" disabled={form.formState.isDirty || claim.lines.length === 0 || !receipts.data?.length} onClick={() => mutation.mutate({ action: "submit" })}>Submit claim</Button>
     <Button type="button" onClick={() => mutation.mutate({ action: "delete" })}>Delete draft</Button>
    </div>
    <p className="text-sm">Save your changes before submitting. Submitted lines are frozen.</p>
   </fieldset>
  </form> : <><ClaimLines claim={claim} />{claim.status === "SUBMITTED" && <Button disabled={mutation.isPending} onClick={() => mutation.mutate({ action: "withdraw" })}>Withdraw pending claim</Button>}</>}
  <Receipts id={claim.id} draft={draft} />
  <ClaimHistory claim={claim} />
 </section>;
}
function ReviewDetail({ id, changed }: { id: string; changed: () => void }) {
 const { user } = useAuth();
 const query = useQuery({ queryKey: ["claims", user?.id, "review", id], queryFn: () => claimsApi.detail(id) });
 const [reason, setReason] = useState(""); const [notice, setNotice] = useState("");
 const decision = useMutation({ mutationFn: (reject: boolean) => claimsApi.transition(id, reject ? "reject" : "approve", query.data!.version, reason),
  onSuccess: () => { toast.success("Review recorded"); changed(); }, onError: error => setNotice(errorMessage(error)),
 });
 if (query.isPending) return <p role="status">Loading claim…</p>;
 if (query.error) return <p role="alert">{errorMessage(query.error)}</p>;
 const claim = query.data;
 return <section aria-label="Review claim" className="space-y-4 rounded-xl border border-borderPrimary p-4">
  <h2 className="text-xl font-semibold">Employee {claim.employeeId} · {claim.status}</h2>
  <p className="break-all">Claim {claim.id}</p><ClaimLines claim={claim} />
  <p className="font-semibold">Total: {claim.currency} {claim.total}</p>
  {notice && <p role="alert">{notice}</p>}
  <label className="block">Review reason (required for rejection)<textarea className={field} maxLength={500} value={reason} disabled={decision.isPending} onChange={e => setReason(e.target.value)} /></label>
  <div className="flex flex-wrap gap-2">
   <Button disabled={decision.isPending || claim.status !== "SUBMITTED"} onClick={() => decision.mutate(false)}>Approve for reimbursement</Button>
   <Button disabled={decision.isPending || claim.status !== "SUBMITTED" || !reason.trim()} onClick={() => decision.mutate(true)}>Reject claim</Button>
  </div><Receipts id={claim.id} /><ClaimHistory claim={claim} />
 </section>;
}
export default function Claims({ review = false }: { review?: boolean }) {
 const { user } = useAuth(); const client = useQueryClient();
 const [selected, setSelected] = useState<Claim | null>(null); const [reviewId, setReviewId] = useState<string | null>(null);
 const key = ["claims", user?.id];
 const permissions = useQuery({ queryKey: [...key, "permissions"], queryFn: claimsApi.permissions, enabled: !!user });
 const allowed = review ? permissions.data?.reviewer : permissions.data?.active;
 const list = useQuery({ queryKey: [...key, review ? "inbox" : "mine"], queryFn: review ? claimsApi.inbox : claimsApi.mine, enabled: !!user && !!allowed });
 const refresh = () => client.invalidateQueries({ queryKey: key });
 const create = useMutation({ mutationFn: () => claimsApi.create(permissions.data!.currency), onSuccess: claim => { setSelected(claim); refresh(); }, onError: error => toast.error(errorMessage(error)) });
 const open = useMutation({ mutationFn: claimsApi.get, onSuccess: setSelected, onError: error => toast.error(errorMessage(error)) });
 return <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-textPrimary">
  <header className="space-y-2"><h1 className="text-2xl font-semibold">{review ? "Claim review" : "My expense claims"}</h1>
   <p>Approval authorizes reimbursement. Payment is handled separately.</p>
   <nav className="flex gap-4" aria-label="Claims navigation">{permissions.data?.active && <Link href="/claims">My claims</Link>}{permissions.data?.reviewer && <Link href="/claims/review">Review claims</Link>}</nav>
  </header>
  {permissions.isPending ? <p role="status">Checking claim permissions…</p> : permissions.error ? <p role="alert">{errorMessage(permissions.error)}</p> : !allowed ? <p role="alert">{review ? "Claim review is restricted to your reporting scope or HR." : "An active employee profile is required."}</p> : <>
   <div className="flex gap-3">{!review && <Button disabled={create.isPending} onClick={() => create.mutate()}>New claim</Button>}<Button disabled={list.isFetching} onClick={() => { refresh(); if (selected) open.mutate(selected.id); }}>Reload claims</Button></div>
   {list.isPending && <p role="status">Loading claims…</p>}{list.error && <p role="alert">{errorMessage(list.error)}</p>}
   {list.data?.length === 0 && <p>{review ? "No claims awaiting your review." : "No claims yet. Create a draft to get started."}</p>}
   <ul className="space-y-2">{list.data?.map(claim => <li key={claim.id}><button className="text-left w-full rounded-lg border border-borderPrimary p-3 hover:bg-backgroundSecondary" disabled={open.isPending} onClick={() => review ? setReviewId(claim.id) : open.mutate(claim.id)}>{review && `Employee ${claim.employeeId} · `}{claim.status} · {claim.currency} {claim.total} · {claim.lines.length} lines <span className="block text-sm break-all">{claim.id}</span></button></li>)}</ul>
   {!review && selected && <Editor key={`${selected.id}:${selected.version}`} claim={selected} changed={claim => { setSelected(claim); refresh(); }} removed={() => { setSelected(null); refresh(); }} />}
   {review && reviewId && <ReviewDetail key={reviewId} id={reviewId} changed={() => { setReviewId(null); refresh(); }} />}
  </>}
 </main>;
}
