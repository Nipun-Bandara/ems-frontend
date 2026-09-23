"use client";

import {useMemo, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import type {ColumnDef} from "@tanstack/react-table";

import {getAllUsers, UserResponse} from "@/app/services/user-management/users";
import {mapRolesToString} from "@/app/helpers/rolemapping";
import AssignDialog from "@/app/(user)/user-management/_components/AssignDialog";
import DataTable from "@/app/components/ui/DataTable";

interface UserTableTabProps {
    status: "all" | "unassigned";
    columns: ColumnDef<UserRow>[];
}

export type UserRow = Omit<UserResponse, "roles"> & {
    roles: string;
    requestedRole?: string;
    joinedOn?: string;
};

export default function UserTableTab({status, columns}: UserTableTabProps) {
    const [selectedUser, setSelectedUser] = useState<{ userId: number; username: string } | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });

    const {data, isFetching} = useQuery({
        queryKey: ["users", status, pagination.pageIndex, pagination.pageSize],
        queryFn: () =>
            getAllUsers({
                assigned: status === "unassigned" ? false : undefined,
                page: pagination.pageIndex,
                limit: pagination.pageSize,
            }),
    });

    const rows = useMemo<UserRow[]>(() => {
        return (data?.users ?? []).map((user) => {
            const base = {
                ...user,
                roles: mapRolesToString(user.roles),
            };
            if (status === "unassigned") {
                return {
                    ...base,
                    requestedRole: base.roles || "-",
                    joinedOn: "-",
                    departmentName: base.departmentName === "-" || !base.departmentName ? "Not assigned" : base.departmentName,
                };
            }
            return {
                ...base,
                departmentName: base.departmentName ?? "-",
            };
        });
    }, [data, status]);

    const finalColumns = useMemo<ColumnDef<UserRow>[]>(() => {
        return [
            ...columns,
            {
                id: "actions",
                header: "Actions",
                enableSorting: false,
                enableGlobalFilter: false,
                minSize: 140,
                cell: ({row}) => (
                    <button
                        className="rounded bg-primary px-3 py-1 text-sm text-white"
                        onClick={() => {
                            setSelectedUser(row.original);
                            setDialogOpen(true);
                        }}
                    >
                        Assign
                    </button>
                ),
            },
        ];
    }, [columns]);

    return (
        <>
            <DataTable
                columns={finalColumns}
                data={rows}
                getRowId={(row) => String(row.userId)}
                pageIndex={pagination.pageIndex}
                pageSize={pagination.pageSize}
                onPageChange={(pageIndex) => setPagination((prev) => ({...prev, pageIndex}))}
                onPageSizeChange={(pageSize) => setPagination({pageIndex: 0, pageSize})}
                hasNext={data?.hasNext ?? false}
                hasPrevious={data?.hasPrevious ?? false}
                isLoading={isFetching}
                pageSizeOptions={[10, 50, 100]}
                filterPlaceholder="Filter users..."
            />

            <AssignDialog
                user={selectedUser}
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
            />
        </>
    );
}
