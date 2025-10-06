import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
  AlertTitle,
  Paper,
  Drawer,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from "@mui/material";
import {
  FilterList as FilterListIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import DataTable from "./DataTable";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#dc004e",
    },
  },
});

// Add prop for updating table data in Dashboard
const TableView = ({ updateTableData }) => {
  console.log(
    "TableView: Component initialized with updateTableData:",
    !!updateTableData
  );

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const isFetching = useRef(false); // Prevent multiple fetches

  // Generate columns dynamically from the data with consistent keys
  const generateColumns = (data) => {
    console.log("TableView: generateColumns called with data:", data);
    if (!data || data.length === 0) {
      console.log("TableView: generateColumns returning empty array - no data");
      return [];
    }

    const columns = Object.keys(data[0]).map((key) => ({
      accessorKey: key,
      header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
    }));
    console.log("TableView: generateColumns returning:", columns);
    return columns;
  };

  useEffect(() => {
    console.log(
      "TableView: useEffect triggered, isFetching:",
      isFetching.current
    );

    // Prevent multiple fetches
    if (isFetching.current) {
      console.log("TableView: Data fetch already in progress, skipping");
      return;
    }

    const fetchData = async () => {
      try {
        isFetching.current = true;
        setLoading(true);
        console.log("TableView: Starting data fetch...");

        const API_BASE =
          import.meta.env.VITE_API_BASE || "http://localhost:8000";

        // First, trigger the data processing script
        const processResponse = await fetch(`${API_BASE}/process/transformers`);
        if (!processResponse.ok) {
          throw new Error(
            `HTTP error while processing data! status: ${processResponse.status}`
          );
        }
        const processResult = await processResponse.json();
        if (processResult.status === "error") {
          throw new Error(processResult.message);
        }
        console.log("Data processing result:", processResult);

        // Then fetch the transformer data from the backend API
        const response = await fetch(`${API_BASE}/data/transformers`);
        if (!response.ok) {
          throw new Error(
            `HTTP error while fetching data! status: ${response.status}`
          );
        }
        const jsonData = await response.json();
        console.log("Fetched transformer data:", jsonData.length, "records");
        console.log("Sample data:", jsonData.slice(0, 3));

        // Set the transformer data directly
        setData(jsonData);
        // Generate columns and pass both data and columns to Dashboard
        const generatedColumns = generateColumns(jsonData);
        console.log("TableView: Generated columns:", generatedColumns);
        if (updateTableData) {
          console.log(
            "TableView: Calling updateTableData with data and columns"
          );
          updateTableData(jsonData, generatedColumns);
        }
        console.log("TableView: Data fetch completed successfully");
      } catch (err) {
        setError("Failed to fetch data from backend: " + err.message);
        console.error("TableView: Error fetching data:", err);
        console.error("TableView: Error stack:", err.stack);
      } finally {
        isFetching.current = false;
        console.log("TableView: Setting loading to false");
        setLoading(false);
        console.log("TableView: Loading state set to false");
      }
    };

    fetchData();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isFetching.current = false;
    };
  }, [updateTableData]);

  // Generate columns dynamically from the data with consistent keys
  const columns = React.useMemo(() => {
    console.log("TableView: useMemo columns called with data:", data);
    const result = generateColumns(data);
    console.log("TableView: useMemo columns returning:", result);
    return result;
  }, [data]);

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleFilterChange = (column, value) => {
    setFilters((prev) => ({
      ...prev,
      [column]: value,
    }));
  };

  const filteredData = React.useMemo(() => {
    if (Object.keys(filters).length === 0) return data;

    return data.filter((row) => {
      return Object.entries(filters).every(([column, value]) => {
        if (!value || value === "all") return true;
        return row[column] === value;
      });
    });
  }, [data, filters]);

  const renderFilterDrawer = () => (
    <Drawer
      anchor="right"
      open={drawerOpen}
      onClose={toggleDrawer}
      sx={{
        "& .MuiDrawer-paper": {
          width: 300,
          p: 2,
        },
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6">Filters</Typography>
        <IconButton onClick={toggleDrawer} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {columns.slice(0, 5).map((column) => {
          // Get unique values for this column
          const uniqueValues = [
            ...new Set(data.map((row) => row[column.accessorKey])),
          ].filter((val) => val !== null && val !== undefined && val !== "");

          return (
            <FormControl key={column.accessorKey} fullWidth size="small">
              <InputLabel>{column.header}</InputLabel>
              <Select
                value={filters[column.accessorKey] || "all"}
                label={column.header}
                onChange={(e) =>
                  handleFilterChange(column.accessorKey, e.target.value)
                }
              >
                <MenuItem value="all">All</MenuItem>
                {uniqueValues.slice(0, 10).map((value) => (
                  <MenuItem key={value} value={value}>
                    {String(value).length > 30
                      ? String(value).substring(0, 30) + "..."
                      : String(value)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        })}

        <Button
          variant="outlined"
          onClick={() => setFilters({})}
          sx={{
            mt: 2,
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              transform: "scale(1.05)",
              boxShadow: 2,
            },
          }}
        >
          Clear All Filters
        </Button>
      </Box>
    </Drawer>
  );

  if (loading) {
    console.log("TableView: Rendering loading state");
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Transformer Data
          </Typography>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 400,
            }}
          >
            <CircularProgress size={60} />
          </Box>
        </Container>
      </ThemeProvider>
    );
  }

  if (error) {
    console.log("TableView: Rendering error state", error);
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Transformer Data
          </Typography>
          <Alert severity="error">
            <AlertTitle>Error!</AlertTitle>
            {error}
          </Alert>
        </Container>
      </ThemeProvider>
    );
  }

  console.log("TableView: Rendering main content", {
    dataLength: data.length,
    filteredDataLength: filteredData.length,
    columnsLength: columns.length,
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Transformer Data
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={toggleDrawer}
            sx={{
              height: "fit-content",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                transform: "scale(1.05)",
                boxShadow: 2,
              },
            }}
          >
            Filters
          </Button>
        </Box>

        {/* Table View Content */}
        <Box sx={{ mb: 3 }}>
          {console.log("TableView: Rendering table content", {
            dataLength: data.length,
            filteredDataLength: filteredData.length,
            columnsLength: columns.length,
          })}
          {filteredData.length > 0 ? (
            <DataTable data={filteredData} columns={columns} onFilteredDataChange={() => {}} />
          ) : data.length > 0 ? (
            // If filteredData is empty but we have data, show all data
            <DataTable data={data} columns={columns} onFilteredDataChange={() => {}} />
          ) : (
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <Typography variant="h6" color="text.secondary">
                No data available.
              </Typography>
            </Paper>
          )}
        </Box>

        {/* Filter Drawer */}
        {renderFilterDrawer()}
      </Container>
    </ThemeProvider>
  );
};

export default TableView;
