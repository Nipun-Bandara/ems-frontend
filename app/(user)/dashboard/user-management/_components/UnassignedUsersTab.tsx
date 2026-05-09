"use client";

import { useEffect, useState } from "react";
import { GridColDef } from "@mui/x-data-grid";
import UserGridShell from "@/app/(user)/dashboard/user-management/_components/UserGridShell";
import { getAllUsers, UserDto } from "@/app/api/user-management/usersapi";
import AssignDialog from "@/app/(user)/dashboard/user-management/_components/AssignDialog";
import Loader from "@/app/components/ui/Loader";

export default function UnassignedUsersTab() {
	const [rows, setRows] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedUser, setSelectedUser] = useState<UserDto | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);

	const fetch = async () => {
		setLoading(true);
		try {
			const data = await getAllUsers("unassigned");
			const mapped = (data || []).map((u) => ({
				id: u.userId,
				username: u.username,
				email: u.email,
				requestedRole: (u.roles || []).join(", "),
				joinedOn: "-",
				departmentName: u.departmentName ?? "Not assigned",
				isAssigned: !!u.isAssigned,
				raw: u,
			}));
			setRows(mapped);
		} catch (err) {
			setRows([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetch();
	}, []);

	const columns: GridColDef[] = [
		{ field: "username", headerName: "Username", flex: 1, minWidth: 160 },
		{ field: "email", headerName: "Email", flex: 1, minWidth: 220 },
		{ field: "requestedRole", headerName: "Requested Role", flex: 1, minWidth: 160 },
		{ field: "joinedOn", headerName: "Joined On", flex: 1, minWidth: 140 },
		{
			field: "departmentName",
			headerName: "Department",
			flex: 1,
			minWidth: 160,
			renderCell: (params) => (
				<span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
					{params.value}
				</span>
			),
		},
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
						setSelectedUser(params.row.raw as UserDto);
						setDialogOpen(true);
					}}
				>
					Assign
				</button>
			),
		},
	];

	return (
		<>
			{loading ? (
				<div className="flex h-full items-center justify-center">
					<Loader />
				</div>
			) : (
				<UserGridShell title="Unassigned Users" description="Users waiting for assignment." rows={rows} columns={columns} />
			)}

			<AssignDialog user={selectedUser} open={dialogOpen} onClose={() => setDialogOpen(false)} onAssigned={() => fetch()} />
		</>
	);
}
