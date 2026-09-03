"use client";

import {useEffect, useState} from "react";
import {Button} from "@/app/components/ui/Button";
import Loader from "@/app/components/ui/Loader";
import {getAllDepartments} from "@/app/services/user-management/department";
import {assignUser, UserResponse} from "@/app/services/user-management/users";
import {useAuth} from "@/app/context/AuthContext";
import type {Role} from "@/app/lib/navigation";

type Props = {
    user: { userId: number; username: string } | null;
    open: boolean;
    onClose: () => void;
    onAssigned?: () => void;
};


const ROLE_OPTIONS: Role[] = ["DEPARTMENT_HEAD", "HR_MANAGER", "FINANCE_MANAGER", "EMPLOYEE", "USER"];

export default function AssignDialog({user, open, onClose, onAssigned}: Props) {
    const {user: currentUser} = useAuth();
    const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);
    const [role, setRole] = useState<string>("");
    const [departmentId, setDepartmentId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setRole("");
        setDepartmentId(null);
        setError(null);

        (async () => {
            try {
                const data = await getAllDepartments();
                const mapped = (data || []).map((d) => ({
                    id: (d.departmentId ?? d.id) as number,
                    name: (d.departmentName ?? d.name) as string,
                }));
                setDepartments(mapped);
            } catch (e) {
                setDepartments([]);
            }
        })();
    }, [open]);

    if (!open || !user) return null;

    const userRoles = (currentUser?.roles ?? []).map((r) => r.toUpperCase().replace(/\s+/g, "_"));
    const canAssignDepartment = userRoles.includes("SYSTEM_ADMIN");
    const canAssignRole = userRoles.some((r) => r === "SYSTEM_ADMIN" || r === "DEPARTMENT_HEAD");
    const isDepartmentHead = userRoles.includes("DEPARTMENT_HEAD");

    const submit = async () => {
        setLoading(true);
        setError(null);
        try {
            const payload: { role?: string; departmentId?: number | null } = {};
            if (canAssignRole && role) payload.role = role;
            if (canAssignDepartment) payload.departmentId = departmentId ?? null;

            await assignUser(user.userId, payload);
            onAssigned?.();
            onClose();
        } catch (err: any) {
            setError(err?.message ?? "Failed to assign user");
        } finally {
            setLoading(false);
        }
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
                    <Button onClick={onClose} disabled={loading}>
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
