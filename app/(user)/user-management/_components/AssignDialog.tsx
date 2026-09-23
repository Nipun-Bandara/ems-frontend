"use client";

import {useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";

import {Button} from "@/app/components/ui/Button";
import Loader from "@/app/components/ui/Loader";
import {getAllDepartments} from "@/app/services/user-management/department";
import {assignUser} from "@/app/services/user-management/users";
import {useAuth} from "@/app/context/AuthContext";
import type {Role} from "@/app/lib/navigation";
import type {ApiError} from "@/app/lib/axios";

type Props = {
    user: { userId: number; username: string } | null;
    open: boolean;
    onClose: () => void;
};


const ROLE_OPTIONS: Role[] = ["DEPARTMENT_HEAD", "HR_MANAGER", "FINANCE_MANAGER", "EMPLOYEE", "USER"];

export default function AssignDialog({user, open, onClose}: Props) {
    const {user: currentUser} = useAuth();
    const queryClient = useQueryClient();
    const [role, setRole] = useState<string>("");
    const [departmentId, setDepartmentId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const closeDialog = () => {
        setRole("");
        setDepartmentId(null);
        setError(null);
        onClose();
    };

    const {data: departments = []} = useQuery({
        queryKey: ["departments"],
        queryFn: async () => {
            const data = await getAllDepartments();
            return (data || []).map((d) => ({
                id: (d.departmentId ?? d.id) as number,
                name: (d.departmentName ?? d.name) as string,
            }));
        },
        enabled: open,
    });

    const assignMutation = useMutation({
        mutationFn: (variables: { userId: number; payload: { role?: string; departmentId?: number | null } }) =>
            assignUser(variables.userId, variables.payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({queryKey: ["users"]});
            closeDialog();
        },
        onError: (err: ApiError) => {
            setError(err?.message ?? "Failed to assign user");
        },
    });

    if (!open || !user) return null;

    const userRoles = (currentUser?.roles ?? []).map((r) => r.toUpperCase().replace(/\s+/g, "_"));
    const canAssignDepartment = userRoles.includes("SYSTEM_ADMIN");
    const canAssignRole = userRoles.some((r) => r === "SYSTEM_ADMIN" || r === "DEPARTMENT_HEAD");
    const isDepartmentHead = userRoles.includes("DEPARTMENT_HEAD");

    const loading = assignMutation.isPending;

    const submit = () => {
        setError(null);
        const payload: { role?: string; departmentId?: number | null } = {};
        if (canAssignRole && role) payload.role = role;
        if (canAssignDepartment) payload.departmentId = departmentId ?? null;

        assignMutation.mutate({userId: user.userId, payload});
    };

    const visibleRoleOptions = ROLE_OPTIONS.filter((r) => {
        if (isDepartmentHead && r === "DEPARTMENT_HEAD") {
            return false;
        }
        return true;
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
                <h3 className="mb-2 text-lg font-semibold">Assign user: {user.username}</h3>
                <p className="mb-4 text-sm text-slate-600">Select role and department (as permitted).</p>

                <div className="mb-3">
                    <label className="mb-1 block text-sm font-medium">Role</label>
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full rounded-md border px-3 py-2"
                        disabled={!canAssignRole}
                    >
                        <option value="">-- select role --</option>
                        {visibleRoleOptions.map((r) => (
                            <option key={r} value={r}>
                                {r}
                            </option>
                        ))}
                    </select>
                </div>

                {!isDepartmentHead && (
                    <div className="mb-4">
                        <label className="mb-1 block text-sm font-medium">Department</label>
                        <select
                            value={departmentId ?? ""}
                            onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : null)}
                            className="w-full rounded-md border px-3 py-2"
                            disabled={!canAssignDepartment}
                        >
                            <option value="">-- none --</option>
                            {departments.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

                <div className="flex justify-end gap-2">
                    <Button onClick={closeDialog} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={loading || (!canAssignRole && !canAssignDepartment)}>
                        {loading ? <Loader size={18}/> : "Assign"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
