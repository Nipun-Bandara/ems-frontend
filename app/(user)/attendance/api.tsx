import api from "@/app/lib/axios";
import type { components } from "./contract";
export type Session = components["schemas"]["AttendanceSession"];
export type Correction = components["schemas"]["AttendanceCorrection"];
const root = "/timesheets/attendance";
export const attendanceApi = {
  current: async () => (await api.get<components["schemas"]["AttendanceState"]>(`${root}/current`)).data,
  clockIn: async (requestId: string) => (await api.post<Session>(`${root}/clock-in`, { requestId } satisfies components["schemas"]["AttendanceClockIn"])).data,
  clockOut: async (id: string) => (await api.post<Session>(`${root}/${id}/clock-out`)).data,
  history: async (page: number, employeeId?: number) => (await api.get<components["schemas"]["AttendanceHistory"]>(`${root}/${employeeId ? "hr/" : ""}history`, { params: { page, size: 10, employeeId } })).data,
  correct: async (id: string, input: Correction) => (await api.post<Session>(`${root}/hr/${id}/corrections`, input)).data,
  audit: async (id: string) => (await api.get<components["schemas"]["AttendanceAudit"][]>(`${root}/${id}/corrections`)).data,
  summary: async (from: string, to: string) => (await api.get<components["schemas"]["AttendanceSummary"]>(`${root}/summary`, { params: { from, to } })).data,
};
export function displayTime(value: string | null, zone: string) {
  return value ? new Intl.DateTimeFormat("en-GB", { timeZone: zone, dateStyle: "medium", timeStyle: "long" }).format(new Date(value)) : "Open";
}
export function ErrorMessage({ error }: { error: unknown }) {
  return error ? <p role="alert">{(error as { message?: string }).message ?? "Request failed. Please reload and retry."}</p> : null;
}
