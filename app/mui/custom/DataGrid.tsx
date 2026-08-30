import { DataGrid as MuiDataGrid, DataGridProps } from "@mui/x-data-grid";

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

export default function CustomDataGrid({ rows, columns, ...rest }: DataGridProps) {
    return (
        <MuiDataGrid
            rows={rows}
            columns={columns}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 50, 100]}
            sx={gridSx}
            {...rest}
        />
    );
}
