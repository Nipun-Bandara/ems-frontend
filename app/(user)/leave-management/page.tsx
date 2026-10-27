"use client";
import { useState } from "react";
import LeaveRequests from "./requests";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/Button";
import { useLeaves, useLeaveMutations, useLeaveEntries } from "@/app/hooks/useLeaves";
import type { Balance, LeaveType } from "@/app/services/leaves";
import type { ApiError } from "@/app/lib/axios";
const fieldClass = "mt-1 w-full rounded-lg border border-borderPrimary bg-background px-3 py-2 text-textPrimary";
const boxClass = "rounded-xl border border-borderPrimary bg-backgroundSecondary p-5 space-y-4";
const days = z.string().regex(/^-?\d{1,7}(\.\d{1,2})?$/, "Enter days with at most two decimal places");
const reason = z.string().trim().min(1, "A reason is required").max(500);
const allocationSchema = z.object({ typeId: z.uuid("Select a leave type"), days: days.refine(v => Number(v) >= 0, "Use zero or positive days"), reason });
const adjustmentSchema = z.object({ days: days.refine(v => Number(v) !== 0, "Enter a nonzero adjustment"), reason });
const typeSchema = z.object({ code: z.string().regex(/^[A-Z][A-Z0-9_]{0,39}$/, "Use uppercase letters, digits and underscores; start with a letter"), name: z.string().trim().min(1).max(100), active: z.boolean() });
function ErrorMessage({ error }: {
  error: unknown;
}) {
  if (!error)
    return null;
  const value = error as ApiError;
  return <p role="alert" className="text-sm text-red-600">{value.status === 403 ? "You do not have permission for this action, or the employee is not active in leave records." : value.message || "Unable to load leave information. Please retry."}</p>;
}
function Balances({ rows, select }: {
  rows: Balance[];
  select?: (row: Balance) => void;
}) {
  if (!rows.length)
    return <p className="text-textSecondary">No entitlement allocated for this year.</p>;
  return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Leave balances in days</caption>
    <thead><tr>{["Leave type", "Entitlement", "Adjustments", "Taken", "Reserved", "Available", ...(select ? ["Action"] : [])].map(v => <th className="p-3" key={v}>{v}</th>)}</tr></thead>
    <tbody>{rows.map(row => <tr className="border-t border-borderPrimary" key={row.id}>
      <th className="p-3 font-medium">{row.typeName}</th>{[row.entitlement, row.adjustments, row.taken, row.reserved, row.available].map((v, i) => <td className="p-3 tabular-nums" key={i}>{v}</td>)}
      {select && <td className="p-3"><Button onClick={() => select(row)}>Adjust / history</Button></td>}
    </tr>)}</tbody>
  </table></div>;
}
export default function LeaveManagementPage() {
  const [year, setYear] = useState(() => Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Colombo" }).format(new Date())));
  const [yearInput, setYearInput] = useState(() => String(year));
  const [employeeInput, setEmployeeInput] = useState("");
  const [employeeId, setEmployeeId] = useState<number>();
  const [selected, setSelected] = useState<Balance>();
  const [editingType, setEditingType] = useState<LeaveType | null | undefined>();
  const { admin, types, mine, entitlements, calendar } = useLeaves(year, employeeId);
  const yearValid = /^\d{4}$/.test(yearInput) && Number(yearInput) >= 1900 && Number(yearInput) <= 9999;
  return <main className="h-full overflow-y-auto bg-background p-5 text-textPrimary sm:p-8 space-y-6">
    <header><h1 className="text-2xl font-semibold">Leave management</h1><p className="mt-1 text-textSecondary">Requests, annual entitlements and balances, in days.</p></header>
    <label className="block max-w-40">Year<input aria-label="Year" className={fieldClass} type="number" min="1900" max="9999" value={yearInput} onChange={e => {
      setYearInput(e.target.value);
      setSelected(undefined);
      const next = Number(e.target.value); if (Number.isInteger(next) && next >= 1900 && next <= 9999) {
        setYear(next);
        setSelected(undefined);
      }
    }} /></label>
    {!yearValid && <p role="alert" className="text-sm text-red-600">Enter a year from 1900 to 9999. Balances still show {year}.</p>}
    {calendar.data && <p className="text-sm text-textSecondary">Calendar: {calendar.data.timezone} · {calendar.data.workweek.map(d => d.charAt(0) + d.slice(1).toLowerCase()).join(", ")}, excluding configured holidays.</p>}
    <section className={boxClass} aria-labelledby="my-balances"><h2 id="my-balances" className="text-lg font-semibold">My balances</h2>
      {mine.isPending ? <p role="status">Loading balances…</p> : mine.isError ? <><ErrorMessage error={mine.error} /><Button onClick={() => mine.refetch()}>Retry balances</Button></> : <Balances rows={mine.data} />}
    </section>
    <LeaveRequests />
    {admin && <ErrorMessage error={types.error} />}
    {admin ? <>
      <section className={boxClass} aria-labelledby="leave-types"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="leave-types" className="text-lg font-semibold">Leave types</h2><Button onClick={() => setEditingType(null)}>New leave type</Button></div>
        {types.isPending ? <p role="status">Loading leave types…</p> : types.isError ? <Button onClick={() => types.refetch()}>Retry types</Button> : types.data.length ? <ul className="space-y-2">{types.data.map(type => <li key={type.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-borderPrimary pt-3"><span>{type.name} <span className="text-textSecondary">({type.code}) · {type.active ? "Active" : "Inactive"}</span></span><Button onClick={() => setEditingType(type)}>Edit {type.code}</Button></li>)}</ul> : <p>No leave types yet. Create a type before allocating days.</p>}
        {editingType !== undefined && <TypeForm key={editingType?.id ?? "new"} type={editingType} close={() => setEditingType(undefined)} />}
      </section>
      <section className={boxClass} aria-labelledby="entitlements"><h2 id="entitlements" className="text-lg font-semibold">Employee entitlements</h2>
        <form className="flex flex-wrap items-end gap-3" onSubmit={e => {
          e.preventDefault(); const id = Number(employeeInput); if (Number.isSafeInteger(id) && id > 0) {
            setEmployeeId(id);
            setSelected(undefined);
            if (id === employeeId)
              void entitlements.refetch();
          }
        }}>
          <label>Employee user ID<input required min="1" max="9007199254740991" step="1" type="number" value={employeeInput} onChange={e => setEmployeeInput(e.target.value)} className={fieldClass} /></label>
          <Button type="submit">Load employee</Button>
        </form>
        {employeeId ? <>
          <p className="font-medium">Employee {employeeId} · {year}</p>
          {entitlements.isPending ? <p role="status">Loading entitlements…</p> : entitlements.isError ? <><ErrorMessage error={entitlements.error} /><Button onClick={() => entitlements.refetch()}>Retry entitlements</Button></> : <Balances rows={entitlements.data} select={setSelected} />}
          {yearValid && <AllocationForm key={`${employeeId}-${year}`} employeeId={employeeId} year={year} types={types.data ?? []} />}
          {yearValid && selected && <AdjustmentForm key={selected.id} balance={selected} close={() => setSelected(undefined)} />}
        </> : <p className="text-textSecondary">Enter an employee user ID to view or allocate entitlements.</p>}
      </section>
    </> : <p className="text-sm text-textSecondary">Type and entitlement administration requires HR Manager or System Admin access.</p>}
  </main>;
}
function AllocationForm({ employeeId, year, types }: {
  employeeId: number;
  year: number;
  types: LeaveType[];
}) {
  const { allocate } = useLeaveMutations();
  const form = useForm<z.infer<typeof allocationSchema>>({ resolver: zodResolver(allocationSchema), defaultValues: { typeId: "", days: "", reason: "" } });
  return <form className={boxClass} onSubmit={form.handleSubmit(async (values) => {
    try {
      await allocate.mutateAsync({ ...values, employeeId, year });
      toast.success("Entitlement allocated");
      form.reset();
    }
    catch { /* mutation error is rendered below */ }
  })}>
    <h3 className="font-semibold">Allocate annual entitlement</h3><p className="text-sm text-textSecondary">One allocation per employee, type and year. Use an adjustment to correct an existing allocation.</p>
    <label className="block">Leave type<select className={fieldClass} {...form.register("typeId")}><option value="">Choose a type</option>{types.filter(t => t.active).map(t => <option value={t.id} key={t.id}>{t.name}</option>)}</select></label>
    <label className="block">Allocated days<input inputMode="decimal" className={fieldClass} {...form.register("days")} /></label>
    <label className="block">Allocation reason<textarea maxLength={500} className={fieldClass} {...form.register("reason")} /></label>
    {Object.entries(form.formState.errors).map(([key, value]) => <p key={key} role="alert" className="text-red-600 text-sm">{value.message}</p>)}<ErrorMessage error={allocate.error} />
    <Button disabled={allocate.isPending || !types.some(t => t.active)} type="submit">{allocate.isPending ? "Allocating…" : "Allocate days"}</Button>
  </form>;
}
function AdjustmentForm({ balance, close }: {
  balance: Balance;
  close: () => void;
}) {
  const { adjust } = useLeaveMutations();
  const history = useLeaveEntries(balance.id);
  const [retry, setRetry] = useState<{
    fingerprint: string;
    key: string;
  } | null>(null);
  const form = useForm<z.infer<typeof adjustmentSchema>>({ resolver: zodResolver(adjustmentSchema), defaultValues: { days: "", reason: "" } });
  return <div className={boxClass}><h3 className="font-semibold">Adjust {balance.typeName} · employee {balance.employeeId} · {balance.year}</h3>
    <form className="space-y-3" onSubmit={form.handleSubmit(async (values) => {
      const fingerprint = JSON.stringify(values); const attempt = retry?.fingerprint === fingerprint ? retry : { fingerprint, key: crypto.randomUUID() }; setRetry(attempt); try {
        await adjust.mutateAsync({ ...values, id: balance.id, idempotencyKey: attempt.key });
        setRetry(null);
        form.reset();
        toast.success("Balance adjusted");
      }
      catch { /* Preserve the key for safe retry. */ }
    })}>
      <label className="block">Adjustment days<input inputMode="decimal" className={fieldClass} {...form.register("days")} /></label><p className="text-sm text-textSecondary">Enter positive days to add or negative days to deduct.</p>
      <label className="block">Adjustment reason<textarea maxLength={500} className={fieldClass} {...form.register("reason")} /></label>
      {Object.entries(form.formState.errors).map(([key, value]) => <p key={key} role="alert" className="text-red-600 text-sm">{value.message}</p>)}<ErrorMessage error={adjust.error} />
      <div className="flex gap-3"><Button disabled={adjust.isPending} type="submit">{adjust.isPending ? "Saving…" : "Apply adjustment"}</Button><Button type="button" disabled={adjust.isPending} onClick={close}>Close</Button></div>
    </form>
    <h4 className="font-medium">Balance history</h4>{history.isPending ? <p role="status">Loading history…</p> : history.isError ? <><ErrorMessage error={history.error} /><Button onClick={() => history.refetch()}>Retry history</Button></> : history.data.length ? <ul className="space-y-2">{history.data.map(entry => <li className="border-t border-borderPrimary pt-2 text-sm" key={entry.id}>{entry.kind} · {entry.days} days · actor {entry.actorId}<p>{entry.reason}</p><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time></li>)}</ul> : <p>No ledger entries yet.</p>}
  </div>;
}
function TypeForm({ type, close }: {
  type: LeaveType | null;
  close: () => void;
}) {
  const { saveType } = useLeaveMutations();
  const form = useForm<z.infer<typeof typeSchema>>({ resolver: zodResolver(typeSchema), defaultValues: { code: type?.code ?? "", name: type?.name ?? "", active: type?.active ?? true } });
  return <form className={boxClass} onSubmit={form.handleSubmit(async (values) => {
    try {
      await saveType.mutateAsync({ ...values, id: type?.id });
      toast.success("Leave type saved");
      close();
    }
    catch { /* mutation error is rendered below */ }
  })}>
    <h3 className="font-semibold">{type ? "Edit leave type" : "Create leave type"}</h3>
    <label className="block">Code<input maxLength={40} className={fieldClass} {...form.register("code")} /></label><label className="block">Name<input maxLength={100} className={fieldClass} {...form.register("name")} /></label>
    <label className="flex items-center gap-2"><input type="checkbox" {...form.register("active")} />Active</label>
    {Object.entries(form.formState.errors).map(([key, value]) => <p key={key} role="alert" className="text-red-600 text-sm">{value.message}</p>)}<ErrorMessage error={saveType.error} />
    <div className="flex gap-3"><Button type="submit" disabled={saveType.isPending}>{saveType.isPending ? "Saving…" : "Save leave type"}</Button><Button type="button" disabled={saveType.isPending} onClick={close}>Cancel</Button></div>
  </form>;
}
