import api from "@/app/lib/axios";
import type { components } from "@/app/types/leave-api";
export type LeaveType = components["schemas"]["LeaveType"];
export type TypeInput = components["schemas"]["TypeInput"];
export type Balance = components["schemas"]["Balance"];
export type Allocation = components["schemas"]["Allocation"];
export type Adjustment = components["schemas"]["Adjustment"];
export type Entry = components["schemas"]["Entry"];
export const leaveApi = {
  types: async () => (await api.get<LeaveType[]>("/leaves/types")).data,
  saveType: async ({ id, ...input }: TypeInput & {
    id?: string;
  }) => (id ? await api.put<LeaveType>(`/leaves/types/${id}`, input) : await api.post<LeaveType>("/leaves/types", input)).data,
  mine: async (year: number) => (await api.get<Balance[]>("/leaves/balances/me", { params: { year } })).data,
  entitlements: async (employeeId: number, year: number) => (await api.get<Balance[]>("/leaves/entitlements", { params: { employeeId, year } })).data,
  allocate: async (input: Allocation) => (await api.post<Balance>("/leaves/entitlements", input)).data,
  adjust: async ({ id, ...input }: Adjustment & {
    id: string;
  }) => (await api.post<Entry>(`/leaves/entitlements/${id}/adjustments`, input)).data,
  entries: async (id: string) => (await api.get<Entry[]>(`/leaves/entitlements/${id}/entries`)).data,
  calendar: async () => (await api.get<components["schemas"]["Calendar"]>("/leaves/calendar")).data,
};
