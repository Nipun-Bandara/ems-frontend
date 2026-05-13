"use client";

import { useEffect, useState } from "react";
import { GridColDef } from "@mui/x-data-grid";
import { getAllUsers, UserDto } from "@/app/api/user-management/usersapi";
import AssignDialog from "@/app/(user)/user-management/_components/AssignDialog";
import Loader from "@/app/components/ui/Loader";
import CustomDataGrid from "@/app/mui/custom/DataGrid";

interface AllUsersTabProps {
	columns: GridColDef[];
}

export default function AllUsersTab({ columns }: AllUsersTabProps) {
	const [rows, setRows] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedUser, setSelectedUser] = useState<UserDto | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);

	const fetch = async () => {
		setLoading(true);
		try {
			const data = await getAllUsers();
			const mapped = (data || []).map((u) => ({
				id: u.userId,
				username: u.username,
				email: u.email,
				departmentName: u.departmentName ?? "-",
				isAssigned: !!u.isAssigned,
				roles: (u.roles || []).join(", "),
				isBanned: !!u.isBanned,
				raw: u,
				onActionClick: () => {
					setSelectedUser(u);
					setDialogOpen(true);
				},
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

	return (
		<>
			{loading ? (
				<div className="flex h-full items-center justify-center">
					<Loader />
				</div>
			) : (
				<CustomDataGrid
					rows={rows}
					columns={columns}

				/>
			)}

			<AssignDialog
				user={selectedUser}
				open={dialogOpen}
				onClose={() => setDialogOpen(false)}
				onAssigned={() => fetch()}
			/>
		</>
	);
}
