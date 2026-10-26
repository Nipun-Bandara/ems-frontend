"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/app/lib/axios";

export interface EmployeeProfile {
  userId: number;
  username: string;
  email: string;
  status: string;
  avatarUrl: string | null;
}

export const employeeProfileKey = (id?: string) => ["employee-profile", id];

export function useEmployeeProfile(id?: string) {
  return useQuery({
    queryKey: employeeProfileKey(id),
    enabled: !!id,
    queryFn: async () => (await api.get<EmployeeProfile>(`/employees/${id}`)).data,
    staleTime: 60_000,
    refetchInterval: 4 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });
}
