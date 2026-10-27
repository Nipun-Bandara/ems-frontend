import api from "@/app/lib/axios";
import type { components } from "./contract";

export type Sheet = components["schemas"]["Sheet"];
export type Entry = components["schemas"]["Entry"];
export type Project = components["schemas"]["Project"];
export const timesheetApi = {
  permissions: async () => (await api.get<components["schemas"]["Permissions"]>("/timesheets/permissions")).data,
  inbox: async () => (await api.get<Sheet[]>("/timesheets/reviewer/inbox")).data,
  detail: async (id: string) => (await api.get<Sheet>(`/timesheets/reviewer/${id}`)).data,
  decide: async (id: string, reject: boolean, input: components["schemas"]["Review"]) => (await api.post<Sheet>(`/timesheets/${id}/${reject ? "reject" : "approve"}`, input)).data,
  reopen: async (id: string, version: number) => (await api.post<Sheet>(`/timesheets/${id}/reopen`, { version } satisfies components["schemas"]["Submit"])).data,
  calendar: async () => (await api.get<components["schemas"]["Calendar"]>("/timesheets/calendar")).data,
  mine: async (weekStart: string) => (await api.get<Sheet[]>("/timesheets/me", { params: { weekStart } })).data,
  projects: async (weekStart: string) => (await api.get<Project[]>("/timesheets/projects", { params: { weekStart } })).data,
  create: async (weekStart: string) => (await api.post<Sheet>("/timesheets", { weekStart } satisfies components["schemas"]["Create"])).data,
  save: async (id: string, input: components["schemas"]["Save"]) => (await api.put<Sheet>(`/timesheets/${id}`, input)).data,
  submit: async (id: string, version: number) => (await api.post<Sheet>(`/timesheets/${id}/submit`, { version } satisfies components["schemas"]["Submit"])).data,
  get: async (id: string) => (await api.get<Sheet>(`/timesheets/${id}`)).data,
  remove: async (id: string, version: number) => { await api.delete(`/timesheets/${id}`, { params: { version } }); },
};
