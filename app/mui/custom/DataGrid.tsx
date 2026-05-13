import { DataGrid as MuiDataGrid } from "@mui/x-data-grid";

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

export default function CustomDataGrid({ rows, columns }: { rows: any[]; columns: any[] }) {
    return (<MuiDataGrid
        rows={rows}
        columns={columns}
        disableRowSelectionOnClick
        pageSizeOptions={[5]}
        initialState={{
            pagination: { paginationModel: { pageSize: 5, page: 0 } },
        }}
        sx={gridSx}
    />)
}
