"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/app/components/ui/Button";
import { attendanceApi, displayTime, ErrorMessage } from "../attendance/api";

type Action = { kind: "in"; id: string } | { kind: "out"; id: string };
export default function AttendanceClock() {
  const { user } = useAuth();
  return user ? <ActiveClock key={user.id} /> : <p role="status">Loading attendance session…</p>;
}
function readPending(actor: string | undefined): Action | null {
  if (typeof window === "undefined" || !actor) return null;
  try {
    const parsed = JSON.parse(sessionStorage.getItem(`attendance-operation:${actor}`) ?? "null") as Action | null;
    return parsed && (parsed.kind === "in" || parsed.kind === "out") && typeof parsed.id === "string" ? parsed : null;
  } catch { return null; }
}
function ActiveClock() {
  const { user } = useAuth();
  const client = useQueryClient();
  const busy = useRef(false);
  const [pending, setPending] = useState<Action | null>(() => readPending(user?.id));
  const state = useQuery({ queryKey: ["attendance", user?.id, "current"], queryFn: attendanceApi.current, enabled: !!user, retry: false, refetchInterval: 30000, refetchOnMount: "always" });
  const action = useMutation({ mutationFn: async (input: Action) => {
    // Only the pending operation token is stored here. All attendance records come from the server.
    sessionStorage.setItem(`attendance-operation:${user?.id}`, JSON.stringify(input));
    return input.kind === "in" ? attendanceApi.clockIn(input.id) : attendanceApi.clockOut(input.id);
  }, onSuccess: () => {
    sessionStorage.removeItem(`attendance-operation:${user?.id}`);
    setPending(null);
    void client.invalidateQueries({ queryKey: ["attendance"] });
  }, onError: (error: { status?: number }) => {
    if (error.status && error.status >= 400 && error.status < 500 && error.status !== 401) {
      sessionStorage.removeItem(`attendance-operation:${user?.id}`);
      setPending(null);
    }
    void client.invalidateQueries({ queryKey: ["attendance"] });
  }, onSettled: () => { busy.current = false; } });
  const open = state.data?.sessions[0];
  function send() {
    if (busy.current || !user) return;
    let operation = pending ?? readPending(user.id);
    operation ??= open ? { kind: "out", id: open.id } : { kind: "in", id: crypto.randomUUID() };
    busy.current = true;
    setPending(operation);
    action.mutate(operation);
  }
  return <section className="rounded-xl border border-borderPrimary p-5 space-y-3 text-textPrimary">
    <h2 className="text-xl font-semibold">Attendance clock</h2>
    <p>Recorded presence only. Timesheet approval and leave checks remain separate.</p>
    {state.isPending && <p role="status">Loading server attendance…</p>}
    <ErrorMessage error={state.error} /><ErrorMessage error={action.error} />
    {state.data && !state.isError && <>
      <p role="status">{open ? `Clocked in since ${displayTime(open.clockIn, state.data.timezone)}` : "No open session"} · {state.data.timezone}</p>
      <Button disabled={action.isPending || state.isFetching} onClick={send}>{pending ? "Retry clock action" : open ? "Clock out" : "Clock in"}</Button>
    </>}
    {action.isError && <p>Reload server status before starting another action. Retry keeps the original operation.</p>}
    <Button onClick={() => { void state.refetch(); }}>Reload attendance status</Button>
    <Link className="block underline" href="/attendance">Attendance history and corrections</Link>
  </section>;
}
