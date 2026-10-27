"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { type ApiError } from "@/app/lib/axios";
import type { components } from "@/app/types/employee-api";

export type EmployeeProfile = components["schemas"]["EmployeeProfile"];
export type UpdateEmployeeProfile = components["schemas"]["UpdateEmployeeProfileRequest"];
export const employeeProfileKey = (id?: string) => ["employee-profile", id];

export function useEmployeeProfile(id?: string) {
  return useQuery<EmployeeProfile, ApiError>({
    queryKey: employeeProfileKey(id),
    enabled: !!id,
    queryFn: async () => (await api.get<EmployeeProfile>(`/employees/${id}`)).data,
    staleTime: 60_000,
    refetchInterval: 4 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });
}

export function useUpdateMyProfile(id?: string) {
  const queryClient = useQueryClient();
  return useMutation<EmployeeProfile, ApiError, UpdateEmployeeProfile>({
    mutationFn: async (profile) => (await api.put<EmployeeProfile>("/employees/me", profile)).data,
    onSuccess: async (profile) => {
      await queryClient.cancelQueries({ queryKey: employeeProfileKey(id) });
      queryClient.setQueryData(employeeProfileKey(id), profile);
    },
  });
}
