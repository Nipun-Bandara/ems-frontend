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

export type LeaveRequest = components["schemas"]["LeaveRequest"];
export type RequestInput = components["schemas"]["RequestInput"];
export type EstimateInput = components["schemas"]["EstimateInput"];
export type Workflow = components["schemas"]["Workflow"];
export type WorkflowStart = components["schemas"]["WorkflowStart"];
export type RequestAction = components["schemas"]["RequestAction"];
export const requestApi = {
  estimate: async (input: EstimateInput) => (await api.post<components["schemas"]["Estimate"]>("/leaves/requests/estimate", input)).data,
  submit: async (input: RequestInput) => (await api.post<LeaveRequest>("/leaves/requests", input)).data,
  mine: async () => (await api.get<LeaveRequest[]>("/leaves/requests/me")).data,
  inbox: async () => (await api.get<LeaveRequest[]>("/leaves/requests/inbox")).data,
  detail: async (id: string) => (await api.get<LeaveRequest>(`/leaves/requests/${id}`)).data,
  cancel: async (id: string, input: RequestAction) => (await api.post<LeaveRequest | Workflow>(`/leaves/requests/${id}/cancel`, input)).data,
  approve: async (id: string, input: WorkflowStart) => (await api.post<Workflow>(`/leaves/requests/${id}/approve`, input)).data,
  workflows: async (id: string) => (await api.get<Workflow[]>(`/leaves/requests/${id}/workflows`)).data,
  reject: async (id: string, input: RequestAction) => (await api.post<LeaveRequest>(`/leaves/requests/${id}/reject`, input)).data,
  route: async (id: string, input: components["schemas"]["RequestRoute"]) => (await api.post<LeaveRequest>(`/leaves/requests/${id}/route`, input)).data,
};
