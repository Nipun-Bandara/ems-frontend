"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/Button";
import type { ApiError } from "@/app/lib/axios";
import { createTeam, updateTeam, type Team, type TeamPayload } from "@/app/services/teams";
import Modal from "./Modal";

export type DepartmentOption = { id: number; name: string };
export const inputClass = "mt-1.5 w-full rounded-lg border border-borderPrimary bg-background px-3 py-2 text-textPrimary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

export default function TeamEditor({ team, departments, onClose }: {
  team: Team | null; departments: DepartmentOption[]; onClose: () => void;
}) {
  const cache = useQueryClient();
  const [name, setName] = useState(team?.name ?? "");
  const [departmentId, setDepartmentId] = useState(String(team?.departmentId ?? ""));
  const [leadUserId, setLeadUserId] = useState(String(team?.leadUserId ?? ""));
  const [error, setError] = useState("");
  const save = useMutation({
    mutationFn: (payload: TeamPayload) => team ? updateTeam(team.id, payload) : createTeam(payload),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ["teams"] });
      toast.success(team ? "Team updated" : "Team created");
      onClose();
    },
    onError: (error: ApiError) => setError(error.message ?? "Unable to save team"),
  });
  return <Modal title={team ? "Edit team" : "Create team"} onClose={onClose}>
    <form onSubmit={(event) => {
      event.preventDefault();
      setError("");
      if (!name.trim() || !departmentId || (leadUserId && (!Number.isSafeInteger(Number(leadUserId)) || Number(leadUserId) < 1))) {
        setError("Enter a team name, department and a valid lead user ID."); return;
      }
      save.mutate({ name: name.trim(), departmentId: Number(departmentId), leadUserId: leadUserId ? Number(leadUserId) : null });
    }} className="space-y-4">
      <label className="block text-sm font-medium">Team name<input autoFocus required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} /></label>
      <label className="block text-sm font-medium">Department<select required value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputClass}>
        <option value="">Select a department</option>
        {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select></label>
      <label className="block text-sm font-medium">Lead user ID (optional)<input type="number" min={1} step={1} value={leadUserId} onChange={(e) => setLeadUserId(e.target.value)} className={inputClass} /></label>
      <p className="text-sm text-textSecondary">Setting a lead does not add them to the team. Manage membership in the team details.</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-3"><Button type="button" onClick={onClose}>Cancel</Button><Button type="submit" disabled={save.isPending || !departments.length}>{save.isPending ? "Saving…" : "Save team"}</Button></div>
    </form>
  </Modal>;
}
