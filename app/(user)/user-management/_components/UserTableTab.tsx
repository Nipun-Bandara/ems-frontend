"use client";

import {useEffect, useState, useMemo} from "react";
import {GridColDef} from "@mui/x-data-grid";
import {getAllUsers, UserResponse} from "@/app/services/user-management/users";
import {mapRolesToString} from "@/app/helpers/rolemapping";
import AssignDialog from "@/app/(user)/user-management/_components/AssignDialog";
import Loader from "@/app/components/ui/Loader";
import CustomDataGrid from "@/app/mui/custom/DataGrid";

interface UserTableTabProps {
    status: "all" | "unassigned";
    columns: GridColDef[];
}

type GridRow = Omit<UserResponse, "roles"> & {
    roles: string;
    requestedRole?: string;
    joinedOn?: string;
};

export default function UserTableTab({status, columns}: UserTableTabProps) {
    const [rows, setRows] = useState<GridRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<{ userId: number; username: string } | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Server-side pagination states
    const [paginationModel, setPaginationModel] = useState({
        page: 0,
        pageSize: 10,
    });
    const [rowCount, setRowCount] = useState(0);
    const [prevStatus, setPrevStatus] = useState(status);

    const fetch = async () => {
        setLoading(true);
        try {
            const assigned = status === "unassigned" ? false : undefined;
            const res = await getAllUsers({
                assigned,
                page: paginationModel.page,
                limit: paginationModel.pageSize,
            });

            const mapped = (res.users || []).map((user) => {
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
            setRows(mapped);

            // Dynamically calculate rowCount to trick DataGrid's pagination navigation controls
            if (res.hasNext) {
                // If there are more pages, set rowCount such that next page button is active
                setRowCount((paginationModel.page + 1) * paginationModel.pageSize + 1);
            } else {
                // If this is the last page, set rowCount precisely to the current total fetched
                setRowCount(paginationModel.page * paginationModel.pageSize + (res.users || []).length);
            }
        } catch (err) {
            setRows([]);
            setRowCount(0);
        } finally {
            setLoading(false);
        }
    };

    // If active tab/status changes, reset pagination to page 0 to avoid out-of-bounds requests
    useEffect(() => {
        if (status !== prevStatus) {
            setPrevStatus(status);
            setPaginationModel((prev) => ({...prev, page: 0}));
            return;
        }
        fetch();
    }, [status, paginationModel, prevStatus]);

    // Dynamically append the Actions column so we don't have to inject callback functions into row data
    const finalColumns = useMemo<GridColDef[]>(() => {
        return [
            ...columns,
            {
                field: "actions",
                headerName: "Actions",
                sortable: false,
                filterable: false,
                minWidth: 140,
                renderCell: (params) => (
                    <button
                        className="rounded bg-primary px-3 py-1 text-sm text-white"
                        onClick={() => {
                            setSelectedUser(params.row);
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
            {loading ? (
                <div className="flex h-full items-center justify-center">
                    <Loader/>
                </div>
            ) : (
                <CustomDataGrid
                    rows={rows}
                    columns={finalColumns}
                    getRowId={(row) => row.userId}
                    paginationMode="server"
                    paginationModel={paginationModel}
                    onPaginationModelChange={setPaginationModel}
                    pageSizeOptions={[10, 50, 100]}
                    rowCount={rowCount}
                />
            )}

            <AssignDialog
                user={selectedUser}
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onAssigned={fetch}
            />
        </>
    );
}
