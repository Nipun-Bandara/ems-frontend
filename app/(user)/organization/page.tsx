"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/app/components/ui/Button";
import type { ApiError } from "@/app/lib/axios";
import { getAllDepartments } from "@/app/services/user-management/department";
import { getAllUsers, type UserResponse } from "@/app/services/user-management/users";
import { deleteTeam, getTeams, type Team } from "@/app/services/teams";
import TeamEditor, { type DepartmentOption } from "./_components/TeamEditor";
import TeamDialog from "./_components/TeamDialog";
import OrgChart from "./_components/OrgChart";

// The identity directory is restricted to admins and department heads. Everyone else
// can still browse the entire structure using the IDs supplied by org-service.
async function getDirectory() {
  const users: UserResponse[] = [];
  for (let page = 0; ; page++) {
    const result = await getAllUsers({ page, limit: 100 });
    users.push(...result.users);
    if (!result.hasNext) return users;
  }
}

export default function OrganizationPage() {
  const { user, isLoading } = useAuth();
  const canEdit = !!user?.roles.some((r) => r === "SYSTEM_ADMIN" || r === "DEPARTMENT_HEAD");
  const cache = useQueryClient();
  const [departmentId, setDepartmentId] = useState<number>();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editor, setEditor] = useState<{ team: Team | null } | null>(null);
  const teamsQuery = useQuery({ queryKey: ["teams", "list", departmentId], queryFn: () => getTeams(departmentId), enabled: !!user });
  const departmentsQuery = useQuery({ queryKey: ["departments"], queryFn: getAllDepartments, enabled: !!user });
  const directory = useQuery({ queryKey: ["organization-users"], queryFn: getDirectory, enabled: canEdit, retry: false });
  const departments: DepartmentOption[] = (departmentsQuery.data ?? []).flatMap((d) => {
    const id = d.departmentId ?? d.id; const name = d.departmentName ?? d.name;
    return id != null && name ? [{ id, name }] : [];
  });
  const teams = teamsQuery.data ?? [];
  const users = new Map((canEdit ? directory.data ?? [] : []).map((u) => [u.userId, u.username]));
  const userLabel = (id: number) => users.get(id) ?? `User #${id}`;
  const departmentLabel = (id: number) => departments.find((d) => d.id === id)?.name ?? `Department #${id}`;
  const deletion = useMutation({
    mutationFn: deleteTeam,
    onSuccess: async () => { await cache.invalidateQueries({ queryKey: ["teams"] }); toast.success("Team deleted"); },
    onError: (error: ApiError) => toast.error(error.message ?? "Unable to delete team"),
  });
  if (isLoading) return <p className="p-8" role="status">Loading organization…</p>;
  if (!user) return null;

  return <div className="h-full overflow-y-auto bg-background p-5 text-textPrimary sm:p-8">
    <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-semibold tracking-tight">Organization</h1><p className="mt-1 text-sm text-textSecondary">Explore departments, teams and the people behind them.</p></div>
      {canEdit && <Button frontIcon={<Plus size={16} />} disabled={!departments.length} onClick={() => setEditor({ team: null })}>New team</Button>}
    </header>
    <label className="mb-6 flex flex-wrap items-center gap-3 text-sm font-medium">Department
      <select value={departmentId ?? ""} onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : undefined)} className="rounded-lg border border-borderPrimary bg-backgroundSecondary px-3 py-2">
        <option value="">All departments</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
    </label>
    {(teamsQuery.isError || departmentsQuery.isError) && <div role="alert" className="mb-5 rounded-lg border border-red-200 p-4 text-red-600">Unable to load organization. <button className="underline" onClick={() => { void teamsQuery.refetch(); void departmentsQuery.refetch(); }}>Try again</button></div>}
    {directory.isError && <p role="status" className="mb-4 text-sm text-textSecondary">Names are unavailable. Members are shown by user ID.</p>}
    {(teamsQuery.isPending || departmentsQuery.isPending) && <p className="py-6" role="status">Loading organization…</p>}
    {teamsQuery.isSuccess && departmentsQuery.isSuccess && <>
      <OrgChart departments={departments.filter((d) => !departmentId || d.id === departmentId)} teams={teams} userLabel={userLabel} onOpen={setSelectedId} />
      <section aria-label="Teams" className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Teams <span className="text-sm font-normal text-textSecondary">({teams.length})</span></h2>
        {!teams.length && <div className="rounded-2xl border border-dashed border-borderPrimary p-10 text-center"><Users className="mx-auto mb-3 text-primary" /><p className="font-medium">No teams yet</p><p className="mt-1 text-sm text-textSecondary">{canEdit ? "Create a team to start building your organization." : "Teams will appear here once they are created."}</p></div>}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => <article key={team.id} className="flex flex-col rounded-2xl border border-borderPrimary bg-backgroundSecondary p-5">
            <div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="text-lg font-semibold text-primary">{team.name}</h3><p className="mt-1 flex items-center gap-1 text-xs text-textSecondary"><Building2 size={14} />{departmentLabel(team.departmentId)}</p></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">{team.members.length} members</span></div>
            <p className="mb-3 text-sm text-textSecondary">Lead: {team.leadUserId ? userLabel(team.leadUserId) : "Unassigned"}</p>
            <ul className="mb-5 flex-1 space-y-3">{team.members.slice(0, 5).map((m) => <li key={m.userId} className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Users size={16} /></span><span className="truncate text-sm">{userLabel(m.userId)}</span></li>)}{!team.members.length && <li className="text-sm text-textSecondary">No members yet</li>}{team.members.length > 5 && <li className="text-xs text-textSecondary">+{team.members.length - 5} more members</li>}</ul>
            <div className="flex flex-wrap items-center gap-2 border-t border-borderPrimary pt-4"><Button onClick={() => setSelectedId(team.id)}>View details</Button>{canEdit && <><button aria-label={`Edit ${team.name}`} onClick={() => setEditor({ team })} className="rounded-lg p-2 hover:bg-hoverPrimary"><Pencil size={17} /></button><button aria-label={`Delete ${team.name}`} disabled={deletion.isPending} onClick={() => { if (window.confirm(`Delete team “${team.name}” and its memberships?`)) deletion.mutate(team.id); }} className="rounded-lg p-2 text-red-600 hover:bg-hoverPrimary disabled:opacity-50"><Trash2 size={17} /></button></>}</div>
          </article>)}
        </div>
      </section>
    </>}
    {editor && canEdit && <TeamEditor team={editor.team} departments={departments} onClose={() => setEditor(null)} />}
    {selectedId !== null && <TeamDialog id={selectedId} canEdit={canEdit} userLabel={userLabel} onClose={() => setSelectedId(null)} />}
  </div>;
}
