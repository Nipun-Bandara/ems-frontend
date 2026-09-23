"use client";

import {useMemo, useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import type {ColumnDef} from "@tanstack/react-table";
import {Pencil, Plus, Trash2} from "lucide-react";
import {toast} from "sonner";

import DesignationDialog, {
    type DepartmentOption,
} from "@/app/(user)/designation-management/_components/DesignationDialog";
import {Button} from "@/app/components/ui/Button";
import DataTable from "@/app/components/ui/DataTable";
import type {ApiError} from "@/app/lib/axios";
import {getAllDepartments} from "@/app/services/user-management/department";
import {
    deleteDesignation,
    type Designation,
    getDesignations,
} from "@/app/services/designations";

type DesignationRow = Designation & { departmentName: string };

export default function DesignationManagementPage() {
    const queryClient = useQueryClient();
    const [departmentId, setDepartmentId] = useState<number | undefined>();
    const [pagination, setPagination] = useState({pageIndex: 0, pageSize: 10});
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedDesignation, setSelectedDesignation] = useState<Designation | null>(null);

    const {data: rawDepartments = []} = useQuery({
        queryKey: ["departments"],
        queryFn: getAllDepartments,
    });

    const departments = useMemo<DepartmentOption[]>(() => rawDepartments.flatMap((department) => {
        const id = department.departmentId ?? department.id;
        const name = department.departmentName ?? department.name;
        return id != null && name ? [{id, name}] : [];
    }), [rawDepartments]);

    const {data, isFetching} = useQuery({
        queryKey: ["designations", departmentId, pagination.pageIndex, pagination.pageSize],
        queryFn: () => getDesignations({
            departmentId,
            page: pagination.pageIndex,
            limit: pagination.pageSize,
        }),
    });

    const departmentNames = useMemo(
        () => new Map(departments.map((department) => [department.id, department.name])),
        [departments],
    );
    const rows = useMemo<DesignationRow[]>(() => (data?.designations ?? []).map((designation) => ({
        ...designation,
        departmentName: departmentNames.get(designation.departmentId) ?? `Department ${designation.departmentId}`,
    })), [data, departmentNames]);

    const deleteMutation = useMutation({
        mutationFn: deleteDesignation,
        onSuccess: async () => {
            await queryClient.invalidateQueries({queryKey: ["designations"]});
            toast.success("Designation deleted");
        },
        onError: (error: ApiError) => toast.error(error.message ?? "Unable to delete designation"),
    });

    const columns = useMemo<ColumnDef<DesignationRow>[]>(() => [
        {accessorKey: "name", header: "Name", minSize: 180},
        {accessorKey: "departmentName", header: "Department", minSize: 180},
        {
            accessorKey: "description",
            header: "Description",
            minSize: 260,
            cell: ({getValue}) => getValue<string | null>() || "—",
        },
        {
            accessorKey: "createdAt",
            header: "Created",
            minSize: 150,
            cell: ({getValue}) => new Date(getValue<string>()).toLocaleDateString(),
        },
        {
            id: "actions",
            header: "Actions",
            enableSorting: false,
            enableGlobalFilter: false,
            minSize: 130,
            cell: ({row}) => (
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        aria-label={`Edit ${row.original.name}`}
                        className="rounded-md border border-borderPrimary p-2 text-textPrimary hover:bg-hoverPrimary"
                        onClick={() => {
                            setSelectedDesignation(row.original);
                            setDialogOpen(true);
                        }}
                    >
                        <Pencil className="h-4 w-4"/>
                    </button>
                    <button
                        type="button"
                        aria-label={`Delete ${row.original.name}`}
                        className="rounded-md border border-red-200 p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                            if (window.confirm(`Delete designation “${row.original.name}”?`)) {
                                deleteMutation.mutate(row.original.id);
                            }
                        }}
                    >
                        <Trash2 className="h-4 w-4"/>
                    </button>
                </div>
            ),
        },
    ], [deleteMutation]);

    return (
        <div className="flex h-full min-h-0 w-full bg-background">
            <div className="flex h-full min-h-0 w-full flex-col overflow-hidden p-5">
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-borderPrimary px-5 py-4 sm:px-6">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-textPrimary">Designation Management</h1>
                        <p className="mt-1 text-sm text-textSecondary">Manage roles within each department.</p>
                    </div>
                    <Button
                        frontIcon={<Plus className="h-4 w-4"/>}
                        onClick={() => {
                            setSelectedDesignation(null);
                            setDialogOpen(true);
                        }}
                    >
                        New designation
                    </Button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-5 py-4 sm:px-6">
                    <label className="flex shrink-0 items-center gap-3 text-sm font-medium text-textPrimary">
                        Department
                        <select
                            value={departmentId ?? ""}
                            onChange={(event) => {
                                setDepartmentId(event.target.value ? Number(event.target.value) : undefined);
                                setPagination((current) => ({...current, pageIndex: 0}));
                            }}
                            className="min-w-52 rounded-lg border border-borderPrimary bg-backgroundSecondary px-3 py-2 outline-none focus:border-primary"
                        >
                            <option value="">All departments</option>
                            {departments.map((department) => (
                                <option key={department.id} value={department.id}>{department.name}</option>
                            ))}
                        </select>
                    </label>

                    <div className="min-h-0 flex-1">
                        <DataTable
                            columns={columns}
                            data={rows}
                            getRowId={(row) => String(row.id)}
                            pageIndex={pagination.pageIndex}
                            pageSize={pagination.pageSize}
                            onPageChange={(pageIndex) => setPagination((current) => ({...current, pageIndex}))}
                            onPageSizeChange={(pageSize) => setPagination({pageIndex: 0, pageSize})}
                            hasNext={data?.hasNext ?? false}
                            hasPrevious={data?.hasPrevious ?? false}
                            isLoading={isFetching}
                            pageSizeOptions={[10, 20, 50, 100]}
                            filterPlaceholder="Filter designations..."
                        />
                    </div>
                </div>
            </div>

            {dialogOpen && (
                <DesignationDialog
                    open
                    designation={selectedDesignation}
                    departments={departments}
                    onClose={() => setDialogOpen(false)}
                />
            )}
        </div>
    );
}
