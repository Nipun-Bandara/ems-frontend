"use client";

import {useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";

import {Button} from "@/app/components/ui/Button";
import Loader from "@/app/components/ui/Loader";
import type {ApiError} from "@/app/lib/axios";
import {
    createDesignation,
    type Designation,
    type DesignationPayload,
    updateDesignation,
} from "@/app/services/designations";

export type DepartmentOption = { id: number; name: string };

type Props = {
    open: boolean;
    designation: Designation | null;
    departments: DepartmentOption[];
    onClose: () => void;
};

export default function DesignationDialog({open, designation, departments, onClose}: Props) {
    const queryClient = useQueryClient();
    const [name, setName] = useState(designation?.name ?? "");
    const [departmentId, setDepartmentId] = useState<number | "">(designation?.departmentId ?? "");
    const [description, setDescription] = useState(designation?.description ?? "");
    const [error, setError] = useState<string | null>(null);

    const mutation = useMutation({
        mutationFn: (payload: DesignationPayload) =>
            designation ? updateDesignation(designation.id, payload) : createDesignation(payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({queryKey: ["designations"]});
            toast.success(designation ? "Designation updated" : "Designation created");
            onClose();
        },
        onError: (apiError: ApiError) => setError(apiError.message ?? "Unable to save designation"),
    });

    if (!open) return null;

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        if (!name.trim() || departmentId === "") {
            setError("Name and department are required");
            return;
        }
        mutation.mutate({
            name: name.trim(),
            departmentId,
            description: description.trim() || null,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
            <form onSubmit={submit} className="w-full max-w-lg rounded-xl border border-borderPrimary bg-backgroundSecondary p-6 shadow-xl">
                <h2 className="text-xl font-semibold text-textPrimary">
                    {designation ? "Edit designation" : "Create designation"}
                </h2>

                <div className="mt-5 space-y-4">
                    <label className="block text-sm font-medium text-textPrimary">
                        Name
                        <input
                            autoFocus
                            value={name}
                            maxLength={100}
                            onChange={(event) => setName(event.target.value)}
                            className="mt-1.5 w-full rounded-lg border border-borderPrimary bg-background px-3 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                    </label>

                    <label className="block text-sm font-medium text-textPrimary">
                        Department
                        <select
                            value={departmentId}
                            onChange={(event) => setDepartmentId(event.target.value ? Number(event.target.value) : "")}
                            className="mt-1.5 w-full rounded-lg border border-borderPrimary bg-background px-3 py-2 outline-none focus:border-primary"
                        >
                            <option value="">Select a department</option>
                            {departments.map((department) => (
                                <option key={department.id} value={department.id}>{department.name}</option>
                            ))}
                        </select>
                    </label>

                    <label className="block text-sm font-medium text-textPrimary">
                        Description
                        <textarea
                            value={description}
                            maxLength={500}
                            rows={4}
                            onChange={(event) => setDescription(event.target.value)}
                            className="mt-1.5 w-full resize-none rounded-lg border border-borderPrimary bg-background px-3 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                    </label>
                </div>

                {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

                <div className="mt-6 flex justify-end gap-3">
                    <Button type="button" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
                    <Button type="submit" disabled={mutation.isPending || departments.length === 0}>
                        {mutation.isPending ? <Loader size={18}/> : designation ? "Save changes" : "Create"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
