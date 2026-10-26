import axios from "@/app/lib/axios";

export const PROJECT_STATUSES = ["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED"] as const;
export type ProjectStatus = typeof PROJECT_STATUSES[number];
export type Project = {
    id: number;
    name: string;
    description: string | null;
    teamId: number;
    status: ProjectStatus;
    startDate: string | null;
    endDate: string | null;
    createdAt: string;
};
export type ProjectPayload = Omit<Project, "id" | "createdAt">;
export type ProjectPage = {projects: Project[]; hasNext: boolean; hasPrevious: boolean};
export type Team = {id: number; name: string};
export async function getTeams(): Promise<Team[]> {
    return (await axios.get<Team[]>("/teams")).data;
}
export async function getProjects(my: boolean, params: {
    page: number; limit: number; teamId?: number; status?: ProjectStatus;
}): Promise<ProjectPage> {
    return (await axios.get<ProjectPage>(my ? "/projects/my" : "/projects", {params})).data;
}
export async function saveProject(id: number | undefined, payload: ProjectPayload): Promise<Project> {
    return (id === undefined
        ? await axios.post<Project>("/projects", payload)
        : await axios.put<Project>(`/projects/${id}`, payload)).data;
}
export async function deleteProject(id: number): Promise<void> {
    await axios.delete(`/projects/${id}`);
}
