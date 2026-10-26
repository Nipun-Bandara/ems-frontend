"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/Button";
import type { ApiError } from "@/app/lib/axios";
import { addTeamMember, getTeam, removeTeamMember } from "@/app/services/teams";
import Modal from "./Modal";
import { inputClass } from "./TeamEditor";

export default function TeamDialog({ id, canEdit, userLabel, onClose }: {
  id: number; canEdit: boolean; userLabel: (id: number) => string; onClose: () => void;
}) {
  const cache = useQueryClient();
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");
  const detail = useQuery({ queryKey: ["teams", "detail", id], queryFn: () => getTeam(id) });
  const membership = useMutation({
    mutationFn: async ({ userId, remove }: { userId: number; remove: boolean }) => {
      if (remove) await removeTeamMember(id, userId);
      else await addTeamMember(id, userId);
    },
    onSuccess: async (_, action) => {
      await cache.invalidateQueries({ queryKey: ["teams"] });
      setUserId(""); setError("");
      toast.success(action.remove ? "Member removed" : "Member added");
    },
    onError: (error: ApiError) => setError(error.message ?? "Unable to update membership"),
  });
  const team = detail.data;
  return <Modal title={team?.name ?? "Team details"} onClose={onClose}>
    {detail.isPending && <p role="status">Loading team…</p>}
    {detail.isError && <p role="alert" className="text-red-600">Unable to load team. <button onClick={() => detail.refetch()} className="underline">Try again</button></p>}
    {team && <>
      <p className="mb-4 text-sm text-textSecondary">Lead: {team.leadUserId ? userLabel(team.leadUserId) : "Unassigned"} · {team.members.length} members</p>
      <ul className="divide-y divide-borderPrimary">
        {team.members.map((member) => <li key={member.userId} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div><p className="font-medium">{userLabel(member.userId)} {member.userId === team.leadUserId && <span className="text-xs text-primary">Lead</span>}</p><p className="text-xs text-textSecondary">User ID {member.userId} · Joined {new Date(member.joinedAt).toLocaleDateString()}</p></div>
          {canEdit && <Button disabled={membership.isPending} onClick={() => membership.mutate({ userId: member.userId, remove: true })}>Remove</Button>}
        </li>)}
      </ul>
      {!team.members.length && <p className="py-6 text-center text-textSecondary">No members yet.</p>}
      {canEdit && <form className="mt-5 flex items-end gap-3 border-t border-borderPrimary pt-4" onSubmit={(event) => {
        event.preventDefault(); setError("");
        const value = Number(userId);
        if (!Number.isSafeInteger(value) || value < 1) { setError("Enter a valid user ID."); return; }
        if (team.members.some((m) => m.userId === value)) { setError("This user is already a member."); return; }
        membership.mutate({ userId: value, remove: false });
      }}>
        <label className="flex-1 text-sm font-medium">User ID<input required type="number" min={1} step={1} value={userId} onChange={(e) => setUserId(e.target.value)} className={inputClass} /></label>
        <Button type="submit" disabled={membership.isPending}>Add member</Button>
      </form>}
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    </>}
  </Modal>;
}
