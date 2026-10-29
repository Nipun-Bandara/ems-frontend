import api from "@/app/lib/axios";
import type { components } from "./contract";
export type Claim = components["schemas"]["Claim"];
export type Line = components["schemas"]["Line"];
export type Permissions = components["schemas"]["Permissions"];
export const claimsApi = {
 permissions: async () => (await api.get<Permissions>("/claims/permissions")).data,
 mine: async () => (await api.get<Claim[]>("/claims/me")).data,
 create: async (currency: string) => (await api.post<Claim>("/claims", { currency } satisfies components["schemas"]["Create"])).data,
 get: async (id: string) => (await api.get<Claim>(`/claims/${id}`)).data,
 save: async (id: string, input: components["schemas"]["Save"]) => (await api.put<Claim>(`/claims/${id}`, input)).data,
 remove: async (id: string, version: number) => { await api.delete(`/claims/${id}`, { params: { version } }); },
 transition: async (id: string, action: "submit" | "withdraw" | "approve" | "reject", version: number, reason?: string) => (await api.post<Claim>(`/claims/${id}/${action}`, { version, reason } satisfies components["schemas"]["Transition"])).data,
 inbox: async () => (await api.get<Claim[]>("/claims/reviewer/inbox")).data,
 detail: async (id: string) => (await api.get<Claim>(`/claims/reviewer/${id}`)).data,
};
