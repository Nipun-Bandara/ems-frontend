import axios from "@/app/lib/axios";

export type TeamMember = { userId: number; joinedAt: string };
export type Team = {
  id: number;
  name: string;
  departmentId: number;
  leadUserId: number | null;
  createdAt: string;
  members: TeamMember[];
};
export type TeamPayload = Pick<Team, "name" | "departmentId" | "leadUserId">;

export async function getTeams(departmentId?: number): Promise<Team[]> {
  return (await axios.get("/teams", { params: { departmentId } })).data;
}
export async function getTeam(id: number): Promise<Team> {
  return (await axios.get(`/teams/${id}`)).data;
}
export async function createTeam(payload: TeamPayload): Promise<Team> {
  return (await axios.post("/teams", payload)).data;
}
export async function updateTeam(id: number, payload: TeamPayload): Promise<Team> {
  return (await axios.put(`/teams/${id}`, payload)).data;
}
export async function deleteTeam(id: number): Promise<void> {
  await axios.delete(`/teams/${id}`);
}
export async function addTeamMember(id: number, userId: number): Promise<Team> {
  return (await axios.post(`/teams/${id}/members`, { userId })).data;
}
export async function removeTeamMember(id: number, userId: number): Promise<void> {
  await axios.delete(`/teams/${id}/members/${userId}`);
}
