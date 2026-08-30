import { DataGrid, DataGridProps } from "@mui/x-data-grid";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

function CustomNoRowsOverlay() {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        height: "100%",
        width: "100%",
      }}
    >
      <Typography sx={{ m: 5 }} variant="body1" color="text.secondary">
        No rows
      </Typography>
    </Box>
  );
}

export default function CustomDataGrid({ rows, columns, ...rest }: DataGridProps) {
  return (
    <Box
      sx={{
        height: "auto",
        width: "100%",
      }}
    >
      <DataGrid
        rows={rows}
        columns={columns}
        pageSizeOptions={[10, 50, 100]}
        slots={{ noRowsOverlay: CustomNoRowsOverlay }}
        {...rest}
      />
    </Box>
  );
}
