"use client";

import {useState, type FormEvent} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {Button} from "@/app/components/ui/Button";
import {useAuth} from "@/app/context/AuthContext";
import type {ApiError} from "@/app/lib/axios";
import {
    PROJECT_STATUSES, deleteProject, getProjects, getTeams, saveProject,
    type Project, type ProjectPayload, type ProjectStatus, type Team,
} from "@/app/services/projects";

const field = "w-full rounded-lg border border-borderPrimary bg-backgroundSecondary px-3 py-2 text-textPrimary";
const statusLabel = (status: ProjectStatus) => status.replaceAll("_", " ").toLowerCase();
const dateLabel = (date: string | null) => date ? new Date(`${date}T00:00:00`).toLocaleDateString() : "Not set";

export default function ProjectsView({management = false}: {management?: boolean}) {
    const {user} = useAuth();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(0);
    const [limit, setLimit] = useState(10);
    const [teamId, setTeamId] = useState<number>();
    const [status, setStatus] = useState<ProjectStatus>();
    const [editing, setEditing] = useState<Project | "new" | null>(null);
    const teams = useQuery({queryKey: ["teams"], queryFn: getTeams});
    const projects = useQuery({
        queryKey: ["projects", user?.id, management, page, limit, teamId, status],
        queryFn: () => getProjects(!management, {page, limit, teamId, status}),
        enabled: !!user,
    });
    const remove = useMutation({
        mutationFn: deleteProject,
        onSuccess: async () => {
            if (page > 0 && projects.data?.projects.length === 1) setPage(page - 1);
            await queryClient.invalidateQueries({queryKey: ["projects"]});
            toast.success("Project deleted");
        },
        onError: (error: ApiError) => toast.error(error.message || "Unable to delete project"),
    });
    const teamNames = new Map(teams.data?.map(team => [team.id, team.name]));
    return (
        <main className="h-full overflow-y-auto bg-background p-6 text-textPrimary sm:p-10">
            <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-borderPrimary pb-6">
                <div>
                    <h1 className="text-2xl font-semibold">{management ? "Project Management" : "My Projects"}</h1>
                    <p className="mt-2 text-sm text-textSecondary">{management
                        ? "Create projects and assign them to teams."
                        : "Projects assigned to the teams you belong to."}</p>
                </div>
                {management && <Button onClick={() => setEditing("new")} disabled={editing !== null}>New project</Button>}
            </header>
            {editing !== null && <ProjectEditor key={editing === "new" ? "new" : editing.id}
                project={editing === "new" ? undefined : editing} teams={teams.data ?? []}
                teamsLoading={teams.isPending} teamsError={teams.isError} retryTeams={() => void teams.refetch()}
                onClose={() => setEditing(null)} onSaved={async () => {
                    setEditing(null);
                    await queryClient.invalidateQueries({queryKey: ["projects"]});
                }}/>}
            <div className="mb-6 flex flex-wrap gap-4">
                <label className="grid gap-2 text-sm">Team
                    <select className={field} value={teamId ?? ""} onChange={event => {
                        setTeamId(event.target.value ? Number(event.target.value) : undefined); setPage(0);
                    }}>
                        <option value="">All teams</option>
                        {teams.data?.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                    </select>
                </label>
                <label className="grid gap-2 text-sm">Status
                    <select className={field} value={status ?? ""} onChange={event => {
                        setStatus((event.target.value || undefined) as ProjectStatus | undefined); setPage(0);
                    }}>
                        <option value="">All statuses</option>
                        {PROJECT_STATUSES.map(value => <option key={value} value={value}>{statusLabel(value)}</option>)}
                    </select>
                </label>
            </div>
            {projects.isPending ? <p role="status">Loading projects…</p>
                : projects.isError ? <div role="alert" className="space-y-3">
                    <p>Unable to load projects. Please try again.</p><Button onClick={() => void projects.refetch()}>Retry</Button>
                </div>
                : projects.data.projects.length === 0 ? <p className="rounded-xl border border-borderPrimary p-8 text-textSecondary">
                    {teamId || status ? "No projects match these filters." : management ? "No projects yet. Create a project to get started." : "You have no projects assigned through team membership."}
                </p> : <div className="grid gap-4 lg:grid-cols-2">
                    {projects.data.projects.map(project => <article key={project.id} className="rounded-xl border border-borderPrimary bg-backgroundSecondary p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <h2 className="break-words text-lg font-semibold">{project.name}</h2>
                            <span className="rounded-full border border-borderPrimary px-3 py-1 text-xs capitalize">{statusLabel(project.status)}</span>
                        </div>
                        <p className="mt-2 text-sm text-textSecondary">{teamNames.get(project.teamId) ?? `Team ${project.teamId}`}</p>
                        <p className="my-5 whitespace-pre-wrap break-words text-sm">{project.description || "No description provided."}</p>
                        <dl className="flex flex-wrap gap-8 text-sm"><div><dt className="text-textSecondary">Start date</dt><dd>{dateLabel(project.startDate)}</dd></div>
                            <div><dt className="text-textSecondary">End date</dt><dd>{dateLabel(project.endDate)}</dd></div></dl>
                        {management && <div className="mt-5 flex gap-3 border-t border-borderPrimary pt-4">
                            <Button disabled={editing !== null} aria-label={`Edit ${project.name}`} onClick={() => setEditing(project)}>Edit</Button>
                            <Button disabled={remove.isPending} aria-label={`Delete ${project.name}`} onClick={() => {
                                if (window.confirm(`Delete project “${project.name}”?`)) remove.mutate(project.id);
                            }}>Delete</Button>
                        </div>}
                    </article>)}
                </div>}
            <div className="mt-6 flex flex-wrap items-center gap-4">
                <Button disabled={!projects.data?.hasPrevious || projects.isFetching} onClick={() => setPage(page - 1)}>Previous</Button>
                <span className="text-sm">Page {page + 1}</span>
                <Button disabled={!projects.data?.hasNext || projects.isFetching} onClick={() => setPage(page + 1)}>Next</Button>
                <label className="flex items-center gap-2 text-sm">Per page
                    <select className={field} value={limit} onChange={event => {setLimit(Number(event.target.value)); setPage(0);}}>
                        {[10, 20, 50, 100].map(size => <option key={size}>{size}</option>)}
                    </select>
                </label>
            </div>
        </main>
    );
}

function ProjectEditor({project, teams, teamsLoading, teamsError, retryTeams, onClose, onSaved}: {
    project?: Project; teams: Team[]; teamsLoading: boolean; teamsError: boolean; retryTeams: () => void;
    onClose: () => void; onSaved: () => Promise<void>;
}) {
    const [error, setError] = useState("");
    const [startDate, setStartDate] = useState(project?.startDate ?? "");
    const save = useMutation({
        mutationFn: (payload: ProjectPayload) => saveProject(project?.id, payload),
        onSuccess: async () => {toast.success(project ? "Project updated" : "Project created"); await onSaved();},
        onError: (error: ApiError) => setError(error.message || "Unable to save project"),
    });
    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const name = String(data.get("name") ?? "").trim();
        if (!name) {setError("Enter a project name."); return;}
        const endDate = String(data.get("endDate") ?? "");
        if (startDate && endDate && endDate < startDate) {setError("End date must be on or after start date."); return;}
        setError("");
        save.mutate({name, description: String(data.get("description") ?? "") || null,
            teamId: Number(data.get("teamId")), status: data.get("status") as ProjectStatus,
            startDate: startDate || null, endDate: endDate || null});
    }
    return <section aria-labelledby="project-editor-title" className="mb-8 rounded-xl border border-borderPrimary bg-backgroundSecondary p-5">
        <h2 id="project-editor-title" className="mb-4 text-lg font-semibold">{project ? "Edit project" : "New project"}</h2>
        <form onSubmit={submit}>
            <fieldset disabled={save.isPending} className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm">Name<input autoFocus className={field} name="name" required maxLength={100} defaultValue={project?.name}/></label>
                <label className="grid gap-2 text-sm">Team<select className={field} name="teamId" required defaultValue={project?.teamId ?? ""}>
                    <option value="" disabled>Select a team</option>
                    {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select></label>
                <label className="grid gap-2 text-sm sm:col-span-2">Description<textarea className={field} name="description" maxLength={2000} rows={3} defaultValue={project?.description ?? ""}/></label>
                <label className="grid gap-2 text-sm">Status<select className={field} name="status" defaultValue={project?.status ?? "PLANNED"}>
                    {PROJECT_STATUSES.map(value => <option key={value} value={value}>{statusLabel(value)}</option>)}
                </select></label>
                <div className="grid grid-cols-2 gap-4">
                    <label className="grid gap-2 text-sm">Start date<input className={field} type="date" name="startDate" value={startDate} onChange={event => setStartDate(event.target.value)}/></label>
                    <label className="grid gap-2 text-sm">End date<input className={field} type="date" name="endDate" min={startDate || undefined} defaultValue={project?.endDate ?? ""}/></label>
                </div>
                {error && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{error}</p>}
                {teamsError && <div role="alert" className="sm:col-span-2">Unable to load teams. <button type="button" className="underline" onClick={retryTeams}>Retry</button></div>}
                {!teamsLoading && !teamsError && !teams.length && <p className="text-sm sm:col-span-2">Create a team before assigning a project.</p>}
                <div className="flex gap-3 sm:col-span-2">
                    <Button type="submit" disabled={save.isPending || teamsLoading || teamsError || !teams.length}>{save.isPending ? "Saving…" : "Save project"}</Button>
                    <Button type="button" onClick={onClose}>Cancel</Button>
                </div>
            </fieldset>
        </form>
    </section>;
}
