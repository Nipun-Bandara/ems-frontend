"use client";

import { DataGrid, type GridColDef } from "@mui/x-data-grid";

type UserGridShellProps = {
	title: string;
	description: string;
	rows: Array<Record<string, unknown> & { id: number | string }>;
	columns: GridColDef[];
};

const gridSx = {
	border: 0,
	borderRadius: 3,
	"& .MuiDataGrid-columnHeaders": {
		backgroundColor: "#f8fafc",
		color: "#0f172a",
		fontWeight: 600,
	},
	"& .MuiDataGrid-cell": {
		borderBottom: "1px solid #e2e8f0",
	},
	"& .MuiDataGrid-row:hover": {
		backgroundColor: "#f8fafc",
	},
};

export default function UserGridShell({
	title,
	description,
	rows,
	columns,
}: UserGridShellProps) {
	return (
		<div className="flex h-full min-h-0 w-full flex-col rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
			<div className="mb-4 shrink-0">
				<h2 className="text-lg font-semibold text-slate-900">{title}</h2>
				<p className="mt-1 text-sm text-slate-500">{description}</p>
			</div>

			<div className="min-h-0 flex-1 overflow-hidden rounded-xl bg-white">
				<DataGrid
					rows={rows}
					columns={columns}
					disableRowSelectionOnClick
					pageSizeOptions={[5]}
					initialState={{
						pagination: { paginationModel: { pageSize: 5, page: 0 } },
					}}
					sx={gridSx}
				/>
			</div>
		</div>
	);
}