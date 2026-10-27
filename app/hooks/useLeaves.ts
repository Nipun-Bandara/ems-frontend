"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/context/AuthContext";
import { leaveApi, type Allocation, type Adjustment, type TypeInput } from "@/app/services/leaves";
import type { ApiError } from "@/app/lib/axios";
export function useLeaves(year: number, employeeId?: number) {
  const { user } = useAuth();
  const admin = !!user?.roles.some(role => role === "HR_MANAGER" || role === "SYSTEM_ADMIN");
  const prefix = ["leaves", user?.id];
  const types = useQuery({ queryKey: [...prefix, "types"], queryFn: leaveApi.types, enabled: admin });
  const mine = useQuery({ queryKey: [...prefix, "mine", year], queryFn: () => leaveApi.mine(year), enabled: !!user, retry: false });
  const entitlements = useQuery({
    queryKey: [...prefix, "entitlements", employeeId, year],
    queryFn: () => leaveApi.entitlements(employeeId!, year), enabled: admin && !!employeeId, retry: false
  });
  const calendar = useQuery({ queryKey: [...prefix, "calendar"], queryFn: leaveApi.calendar, enabled: !!user });
  return { admin, types, mine, entitlements, calendar };
}
export function useLeaveMutations() {
  const client = useQueryClient();
  const { user } = useAuth();
  const invalidate = async () => { await client.invalidateQueries({ queryKey: ["leaves", user?.id] }); };
  const allocate = useMutation<unknown, ApiError, Allocation>({ mutationFn: leaveApi.allocate, onSuccess: invalidate });
  const adjust = useMutation<unknown, ApiError, Adjustment & {
    id: string;
  }>({ mutationFn: leaveApi.adjust, onSuccess: invalidate });
  const saveType = useMutation<unknown, ApiError, TypeInput & {
    id?: string;
  }>({ mutationFn: leaveApi.saveType, onSuccess: invalidate });
  return { allocate, adjust, saveType };
}
export function useLeaveEntries(id?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["leaves", user?.id, "entries", id], queryFn: () => leaveApi.entries(id!),
    enabled: !!id && !!user?.roles.some(role => role === "HR_MANAGER" || role === "SYSTEM_ADMIN"), retry: false
  });
}
