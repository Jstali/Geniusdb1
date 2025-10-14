import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
} from "@tanstack/react-table";
import PivotConfigPanel from "./PivotConfigPanel";
import PivotTableView from "./PivotTableView";
import DraggableTableHeader from "./DraggableTableHeader";

// Custom cell renderer that handles all values including null and zero
const renderCellContent = (value, columnName) => {
  // Handle null and undefined explicitly
  if (value === null || value === undefined) {
    return "null";
  }
  
  // Handle empty string
  if (value === "") {
    return "";
  }
  
  // Handle zero explicitly (important: 0 should display as "0")
  if (value === 0 || value === "0") {
    return "0";
  }
  
  // Handle all other values by converting to string
  return String(value);
};

const DataTable = ({
  data = [],
  columns = [],
  onRowClick,
  loading,
  error,
  selectedColumns = [], // Add this prop
  onSelectedColumnsChange, // Add this prop to handle column selection changes
  onFilteredDataChange = () => {}, // Add this prop to expose filtered data to parent
  onFiltersChange = () => {}, // Add this prop to expose current filters to parent
  initialFilters = {}, // Add this prop to accept initial filters
  initialSortConfig = null, // Add this prop to accept initial sort configuration
  initialPaginationConfig = null, // Add this prop to accept initial pagination configuration
}) => {
  // Initialize all hooks first to maintain consistent order
  const [columnFilters, setColumnFilters] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [columnSizes, setColumnSizes] = useState({});
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [columnMultiSelectValues, setColumnMultiSelectValues] = useState({});
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const showColumnToggleRef = useRef(false);
  // Pivot table state
  const [isPivotMode, setIsPivotMode] = useState(false);
  const [pivotConfig, setPivotConfig] = useState(null);
  const [pivotError, setPivotError] = useState(null);
  // Column reordering state
  const [columnOrder, setColumnOrder] = useState([]);

  // Refs
  const tableRef = useRef(null);
  const dropdownRefs = useRef({});
  const columnToggleRef = useRef(null);
  const initialFiltersApplied = useRef(false);

  // Debugging logs
  console.log("DataTable: Component called with props", {
    data: `Array with ${data.length} items`,
    columns: `Array with ${columns.length} items`,
    loading,
    selectedColumns,
    initialFilters,
    componentKey: `table-${selectedColumns?.length || 0}-${JSON.stringify(selectedColumns || [])}`
  });


  // Set equal initial column sizes (Excel-like)
  const DEFAULT_COLUMN_WIDTH = 150;
  const MIN_COLUMN_WIDTH = 50;
  const MAX_COLUMN_WIDTH = 800;

  // Initialize all columns with equal width
  useEffect(() => {
    console.log("DataTable: useEffect for column sizes called", columns);
    if (columns && columns.length > 0) {
      const initialSizes = {};
      columns.forEach((col) => {
        if (col.accessorKey) {
          initialSizes[col.accessorKey] = DEFAULT_COLUMN_WIDTH;
        }
      });
      console.log("DataTable: Setting initial column sizes", initialSizes);
      setColumnSizes(initialSizes);
    }
  }, [columns]);

  // Initialize column order from localStorage or default order
  useEffect(() => {
    if (columns.length > 0 && columnOrder.length === 0) {
      const savedOrder = localStorage.getItem('geniusdb-column-order');
      if (savedOrder) {
        try {
          const parsedOrder = JSON.parse(savedOrder);
          // Validate that saved order contains valid column IDs
          const validOrder = parsedOrder.filter(columnId => 
            columns.some(col => col.accessorKey === columnId)
          );
          // Add any missing columns to the end
          const missingColumns = columns
            .filter(col => !validOrder.includes(col.accessorKey))
            .map(col => col.accessorKey);
          setColumnOrder([...validOrder, ...missingColumns]);
        } catch (error) {
          console.warn('Failed to parse saved column order:', error);
          setColumnOrder(columns.map(col => col.accessorKey));
        }
      } else {
        setColumnOrder(columns.map(col => col.accessorKey));
      }
    }
  }, [columns, columnOrder.length]);

  // Save column order to localStorage when it changes
  useEffect(() => {
    if (columnOrder.length > 0) {
      localStorage.setItem('geniusdb-column-order', JSON.stringify(columnOrder));
    }
  }, [columnOrder]);

  // Handle column reordering
  const handleColumnReorder = (newColumnOrder) => {
    console.log('DataTable: Column reordered', { old: columnOrder, new: newColumnOrder });
    setColumnOrder(newColumnOrder);
  };

  // Apply column visibility based on selected columns
  useEffect(() => {
    console.log("DataTable: Column visibility useEffect triggered", {
      columnsLength: columns?.length,
      selectedColumns,
      selectedColumnsLength: selectedColumns?.length
    });
    
    if (columns && columns.length > 0) {
      const visibility = {};
      columns.forEach((col) => {
        // If selectedColumns is provided and not empty, only show selected columns
        // If selectedColumns is empty array or not provided, show all columns by default
        if (selectedColumns && Array.isArray(selectedColumns) && selectedColumns.length > 0) {
          const isVisible = selectedColumns.includes(col.accessorKey);
          visibility[col.accessorKey] = isVisible;
          console.log(`DataTable: Column ${col.accessorKey} visibility: ${isVisible} (from selectedColumns)`);
        } else {
          // By default, all columns are visible when selectedColumns is empty or not provided
          visibility[col.accessorKey] = true;
          console.log(`DataTable: Column ${col.accessorKey} visibility: true (default - no selectedColumns or empty array)`);
        }
      });
      console.log("DataTable: Setting column visibility:", visibility);
      setColumnVisibility(visibility);
    }
  }, [columns, selectedColumns]);

  // Don't notify parent immediately to prevent re-renders that close the popup

  // Custom column visibility handler that also notifies parent
  const handleColumnVisibilityChange = (updater) => {
    // Update internal state
    setColumnVisibility(updater);

    // If onSelectedColumnsChange is provided, notify parent of changes
    if (onSelectedColumnsChange && typeof updater === "function") {
      // Get the updated visibility state
      const updatedVisibility = updater(columnVisibility);

      // Extract visible column keys
      const visibleColumns = Object.keys(updatedVisibility).filter(
        (key) => updatedVisibility[key]
      );

      // Notify parent of the change
      onSelectedColumnsChange(visibleColumns);
    } else if (onSelectedColumnsChange && typeof updater === "object") {
      // If updater is an object, use it directly
      const visibleColumns = Object.keys(updater).filter((key) => updater[key]);

      // Notify parent of the change
      onSelectedColumnsChange(visibleColumns);
    }
  };

  // Error handling for missing data
  if (loading) {
    return (
      <div className="rounded-lg shadow-sm bg-white p-8 text-center border">
        <div className="text-gray-600 text-lg font-medium mb-2">
          Loading data…
        </div>
        <p className="text-gray-500">
          Please wait while the table data is being loaded.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg shadow-sm bg-white p-8 text-center border">
        <div className="text-red-600 text-lg font-semibold mb-2">
          Error loading data
        </div>
        <p className="text-gray-500">{String(error)}</p>
      </div>
    );
  }
  if (!data) {
    console.log("DataTable: No data provided");
    return (
      <div className="rounded-lg shadow-sm bg-white p-8 text-center border">
        <div className="text-red-600 text-lg font-semibold mb-2">
          No Data Available
        </div>
        <p className="text-gray-500">
          Unable to load table data. Please try again later.
        </p>
        <p className="text-gray-400 text-sm mt-2">Data is null or undefined</p>
      </div>
    );
  }

  if (!columns) {
    console.log("DataTable: No columns provided");
    return (
      <div className="rounded-lg shadow-sm bg-white p-8 text-center border">
        <div className="text-red-600 text-lg font-semibold mb-2">
          No Columns Available
        </div>
        <p className="text-gray-500">
          Unable to load table columns. Please try again later.
        </p>
        <p className="text-gray-400 text-sm mt-2">
          Columns is null or undefined
        </p>
      </div>
    );
  }

  if (data.length === 0) {
    console.log("DataTable: Empty data array");
    return (
      <div className="rounded-lg shadow-sm bg-white p-8 text-center border">
        <div className="text-red-600 text-lg font-semibold mb-2">
          No Data Available
        </div>
        <p className="text-gray-500">The data array is empty.</p>
        <p className="text-gray-400 text-sm mt-2">Data array has 0 items</p>
      </div>
    );
  }

  if (columns.length === 0) {
    console.log("DataTable: Empty columns array");
    return (
      <div className="rounded-lg shadow-sm bg-white p-8 text-center border">
        <div className="text-red-600 text-lg font-semibold mb-2">
          No Columns Available
        </div>
        <p className="text-gray-500">The columns array is empty.</p>
        <p className="text-gray-400 text-sm mt-2">Columns array has 0 items</p>
      </div>
    );
  }

  console.log("DataTable: Creating table with", {
    dataLength: data.length,
    columnsLength: columns.length,
  });
  console.log("DataTable: Sample data record:", data[0]);
  console.log("DataTable: Sample columns:", columns.slice(0, 5));

  // Create columns with custom cell rendering
  const processedColumns = columns.map((col) => ({
    ...col,
    filterFn: col.accessorKey ? "multiSelect" : undefined,
    size: DEFAULT_COLUMN_WIDTH, // Set default size for TanStack table
    enableResizing: true, // Enable column resizing
    minSize: MIN_COLUMN_WIDTH, // Set minimum column width
    maxSize: MAX_COLUMN_WIDTH, // Set maximum column width
    cell: ({ getValue }) => {
      const value = getValue();
      return renderCellContent(value, col.accessorKey);
    },
  }));

  const table = useReactTable({
    data,
    columns: processedColumns,
    state: {
      columnFilters,
      globalFilter,
      sorting,
      pagination,
      columnVisibility,
      columnSizing: columnSizes,
    },
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: handleColumnVisibilityChange, // Use our custom handler
    onColumnSizingChange: setColumnSizes, // Add column sizing handler
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    filterFns: {
      multiSelect: (row, columnId, filterValues) => {
        if (!filterValues || filterValues.length === 0) return true;
        const cellValue = row.getValue(columnId);
        // Handle different data types
        if (Array.isArray(filterValues)) {
          return filterValues.some((val) =>
            String(cellValue).toLowerCase().includes(String(val).toLowerCase())
          );
        }
        return String(cellValue)
          .toLowerCase()
          .includes(String(filterValues).toLowerCase());
      },
    },
    columnResizeMode: "onChange", // Enable real-time column resizing
    enableColumnResizing: true, // Enable column resizing
    debugTable: false,
  });

  // Notify parent component when filtered data changes
  useEffect(() => {
    if (onFilteredDataChange && table) {
      const filteredRows = table.getFilteredRowModel().rows;
      const filteredData = filteredRows.map(row => row.original);
      console.log("DataTable: Notifying parent of filtered data change", {
        originalDataLength: data.length,
        filteredDataLength: filteredData.length,
        sampleFilteredData: filteredData.slice(0, 3)
      });
      onFilteredDataChange(filteredData);
    }
  }, [table, onFilteredDataChange, data.length, columnFilters, globalFilter, sorting, columnVisibility]);

  // Apply initial filters when they change (only once per initialFilters change)
  useEffect(() => {
    console.log("DataTable: Initial filters useEffect triggered", {
      initialFilters,
      hasInitialFilters: initialFilters && Object.keys(initialFilters).length > 0,
      currentColumnFilters: columnFilters,
      initialFiltersApplied: initialFiltersApplied.current
    });
    
    if (initialFilters && Object.keys(initialFilters).length > 0 && !initialFiltersApplied.current) {
      console.log("DataTable: Applying initial filters", initialFilters);
      
      const newColumnFilters = [];
      let newGlobalFilter = "";
      
      Object.entries(initialFilters).forEach(([columnId, filterValues]) => {
        if (columnId === "_global") {
          newGlobalFilter = filterValues;
          console.log("DataTable: Setting global filter:", newGlobalFilter);
        } else if (filterValues && filterValues.length > 0) {
          newColumnFilters.push({
            id: columnId,
            value: filterValues
          });
          console.log(`DataTable: Adding column filter for ${columnId}:`, filterValues);
        }
      });
      
      console.log("DataTable: Final column filters:", newColumnFilters);
      console.log("DataTable: Final global filter:", newGlobalFilter);
      
      setColumnFilters(newColumnFilters);
      setGlobalFilter(newGlobalFilter);
      
      // Update multi-select values for UI consistency
      const newMultiSelectValues = {};
      newColumnFilters.forEach(filter => {
        newMultiSelectValues[filter.id] = filter.value;
      });
      setColumnMultiSelectValues(newMultiSelectValues);
      
      initialFiltersApplied.current = true;
    } else if (!initialFilters || Object.keys(initialFilters).length === 0) {
      console.log("DataTable: No initial filters to apply");
      initialFiltersApplied.current = false;
    } else {
      console.log("DataTable: Initial filters already applied, skipping");
    }
  }, [initialFilters]);

  // Apply initial sort configuration
  useEffect(() => {
    if (initialSortConfig && initialSortConfig.sortBy && initialSortConfig.sortBy.length > 0) {
      console.log("DataTable: Applying initial sort config", initialSortConfig);
      setSorting(initialSortConfig.sortBy.map(sort => ({
        id: sort.id,
        desc: sort.desc || false
      })));
    }
  }, [initialSortConfig]);

  // ✅ Fixed missing setPageSize state - Apply initial pagination configuration
  useEffect(() => {
    if (initialPaginationConfig) {
      console.log("DataTable: Applying initial pagination config", initialPaginationConfig);
      if (initialPaginationConfig.pageSize || initialPaginationConfig.currentPage) {
        setPagination(prev => ({
          pageIndex: initialPaginationConfig.currentPage ? initialPaginationConfig.currentPage - 1 : prev.pageIndex, // Convert to 0-based index
          pageSize: initialPaginationConfig.pageSize || prev.pageSize
        }));
      }
    }
  }, [initialPaginationConfig]);

  // Notify parent component when filters change
  useEffect(() => {
    if (onFiltersChange) {
      // Convert columnFilters to a more readable format
      const filters = {};
      columnFilters.forEach(filter => {
        if (filter.value && filter.value.length > 0) {
          filters[filter.id] = filter.value;
        }
      });
      
      // Add global filter if present
      if (globalFilter) {
        filters._global = globalFilter;
      }
      
      console.log("DataTable: Notifying parent of filter changes", {
        columnFilters: filters,
        globalFilter
      });
      onFiltersChange(filters);
    }
  }, [columnFilters, globalFilter, onFiltersChange]);

  // Get unique values for each column
  const getColumnFilterOptions = useMemo(() => {
    if (!data || !columns) return {};
    const options = {};
    columns.forEach((column) => {
      if (column.accessorKey) {
        const uniqueValues = [
          ...new Set(
            data.map((row) => {
              const value = row[column.accessorKey];
              // Handle different data types
              if (value === null || value === undefined) return "null";
              if (value === 0 || value === "0") return "0";
              if (value === "") return "";
              if (typeof value === "object") return JSON.stringify(value);
              return String(value);
            })
          ),
        ];
        options[column.accessorKey] = uniqueValues
          .filter((val) => val !== undefined && val !== "")
          .slice(0, 500)
          .sort((a, b) => String(a).localeCompare(String(b)));
      }
    });
    return options;
  }, [data, columns]);

  // Export to CSV function
  const exportToCSV = () => {
    const visibleColumns = table.getVisibleLeafColumns();
    const rows = table.getFilteredRowModel().rows;

    // Create CSV header
    const header = visibleColumns.map((col) => col.columnDef.header).join(",");

    // Create CSV body
    const csvBody = rows
      .map((row) =>
        visibleColumns
          .map((col) => {
            const cellValue = row.getValue(col.id);
            // Use our custom rendering function for consistency
            const displayValue = renderCellContent(cellValue, col.id);
            // Escape commas and quotes in CSV
            const stringValue = String(displayValue || "");
            if (
              stringValue.includes(",") ||
              stringValue.includes('"') ||
              stringValue.includes("\n")
            ) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          })
          .join(",")
      )
      .join("\n");

    const csvContent = header + "\n" + csvBody;

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "data.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Handle clicking outside dropdowns to close them
  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.keys(dropdownRefs.current).forEach((columnId) => {
        if (
          dropdownRefs.current[columnId] &&
          !dropdownRefs.current[columnId].contains(event.target)
        ) {
          setOpenDropdowns((prev) => ({ ...prev, [columnId]: false }));
        }
      });

      // Don't auto-close the column toggle popup - let user close it manually
      // This prevents the annoying auto-close behavior when selecting columns
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // Note: Custom mouse event handlers removed - TanStack Table handles resizing internally

  // Toggle dropdown visibility
  const toggleDropdown = (columnId) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [columnId]: !prev[columnId],
    }));
  };

  // Handle multi-select filter changes
  const handleMultiSelectChange = (columnId, value, isChecked) => {
    setColumnMultiSelectValues((prev) => {
      const currentValues = prev[columnId] || [];
      let newValues;

      if (value === "SELECT_ALL") {
        if (isChecked) {
          // Select all values
          newValues = [...getColumnFilterOptions[columnId]];
        } else {
          // Deselect all values
          newValues = [];
        }
      } else {
        if (isChecked) {
          // Add value to selection
          newValues = [...currentValues, value];
        } else {
          // Remove value from selection
          newValues = currentValues.filter((v) => v !== value);
        }
      }

      // Update column filters immediately with the new values
      setColumnFilters((prevFilters) => {
        const otherFilters = prevFilters.filter((f) => f.id !== columnId);

        // Only apply filter if we have selected values
        if (newValues.length === 0) {
          return otherFilters; // No filter if nothing selected
        }

        return [...otherFilters, { id: columnId, value: newValues }];
      });

      return { ...prev, [columnId]: newValues };
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    setColumnFilters([]);
    setColumnMultiSelectValues({});
    setGlobalFilter("");
    setOpenDropdowns({});
  };

  // Clear specific column filter
  const clearColumnFilter = (columnId) => {
    console.log("DataTable: clearColumnFilter called for columnId:", columnId);
    console.log("DataTable: Current columnFilters before clear:", columnFilters);
    
    setColumnFilters((prev) => {
      const newFilters = prev.filter((f) => f.id !== columnId);
      console.log("DataTable: New columnFilters after clear:", newFilters);
      return newFilters;
    });
    
    setColumnMultiSelectValues((prev) => {
      const newValues = { ...prev, [columnId]: [] };
      console.log("DataTable: New columnMultiSelectValues after clear:", newValues);
      return newValues;
    });
  };

  // Calculate column size with fallback to default width
  const getColumnSize = (columnId) => {
    // Use TanStack Table's column sizing if available
    if (table) {
      const column = table.getColumn(columnId);
      if (column?.getSize) {
        return column.getSize();
      }
    }
    
    // Fallback to our custom state
    if (columnSizes[columnId]) {
      return columnSizes[columnId];
    }

    // Otherwise, use default width for all columns
    return DEFAULT_COLUMN_WIDTH;
  };

  // Get unique values for a column (for filter dropdowns)
  const getUniqueValues = (columnId) => {
    if (!data || !columnId) return [];
    
    const uniqueValues = [
      ...new Set(data.map((row) => {
        const val = row[columnId];
        // Convert null/undefined to "null" for display
        if (val === null || val === undefined) return "null";
        // Ensure zero is included
        if (val === 0 || val === "0") return "0";
        return val;
      }))
    ].filter((val) => val !== undefined && val !== "");
    
    return uniqueValues.sort();
  };

  // Handle select all change for filter dropdowns
  const handleSelectAllChange = (columnId, isChecked) => {
    if (isChecked) {
      // Select all unique values
      const allValues = getUniqueValues(columnId);
      setColumnMultiSelectValues((prev) => ({
        ...prev,
        [columnId]: allValues,
      }));
      setColumnFilters((prevFilters) => {
        const otherFilters = prevFilters.filter((f) => f.id !== columnId);
        return [...otherFilters, { id: columnId, value: allValues }];
      });
    } else {
      // Deselect all
      setColumnMultiSelectValues((prev) => ({
        ...prev,
        [columnId]: [],
      }));
      setColumnFilters((prevFilters) =>
        prevFilters.filter((f) => f.id !== columnId)
      );
    }
  };

  // Handle row click
  const handleRowClick = (row) => {
    const rowId = row.original.id || row.id;
    setSelectedRowId(rowId);
    if (onRowClick) {
      onRowClick(rowId);
    }
  };

  // Handle pivot table generation
  const handleGeneratePivot = (config) => {
    try {
      console.log("=== DATA TABLE: GENERATING PIVOT ===");
      console.log("Received pivot config:", config);
      console.log("Data being passed to pivot:", data);
      console.log("Data length:", data.length);
      console.log("Sample data items:", data.slice(0, 3));

      // Validate that we have data
      if (!data || data.length === 0) {
        const errorMsg = "No data available to generate pivot table";
        console.warn(errorMsg);
        setPivotError(errorMsg);
        return;
      }

      // Validate config
      if (!config) {
        const errorMsg = "Invalid pivot configuration";
        console.error(errorMsg);
        setPivotError(errorMsg);
        return;
      }

      // Log config details
      console.log("Config details:");
      console.log("- Rows:", config.rows);
      console.log("- Columns:", config.columns);
      console.log("- Values:", config.values);

      setPivotConfig(config);
      setPivotError(null);
      console.log("Pivot configuration set successfully");
    } catch (error) {
      console.error("Error generating pivot table:", error);
      setPivotError("Failed to generate pivot table: " + error.message);
    }
  };

  // Toggle between regular table and pivot table
  const toggleViewMode = () => {
    console.log("=== TOGGLING VIEW MODE ===");
    console.log("Current pivot mode:", isPivotMode);
    const newMode = !isPivotMode;
    setIsPivotMode(newMode);
    console.log("New pivot mode:", newMode);

    // Reset pivot config when switching back to regular table
    if (isPivotMode) {
      console.log("Switching to regular table mode - resetting pivot config");
      setPivotConfig(null);
      setPivotError(null);
    }
  };

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap gap-4 items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
        {/* Left side - Search and Table Toggle */}
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative text-blue-950">
              <input
                type="text"
                value={globalFilter ?? ""}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search all columns..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent "
              />
              <svg
                className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Table View Toggle - REMOVED as per requirements */}
        </div>

        {/* Right side - Action buttons */}
        <div className="flex items-center gap-2">
          {/* Column Visibility Toggle */}
          <div className="relative" ref={columnToggleRef}>
            <button
              onClick={() => {
                const newState = !showColumnToggleRef.current;
                showColumnToggleRef.current = newState;
                setShowColumnToggle(newState);
              }}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Columns
            </button>

            {showColumnToggle && (
              <div
                className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-2 max-h-60 overflow-y-auto">
                  <div className="pb-2 border-b border-gray-200 mb-2 flex justify-between items-center">
                    <p className="text-sm font-medium text-gray-700">
                      Toggle Columns
                    </p>
                    <button
                      onClick={() => {
                        // Apply changes when closing
                        if (onSelectedColumnsChange && columnVisibility) {
                          const visibleColumns = Object.keys(columnVisibility).filter(
                            (key) => columnVisibility[key]
                          );
                          onSelectedColumnsChange(visibleColumns);
                        }
                        showColumnToggleRef.current = false;
                        setShowColumnToggle(false);
                      }}
                      className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                      title="Close and Apply"
                    >
                      ×
                    </button>
                  </div>
                  {/* Select All / Deselect All buttons */}
                  <div className="flex space-x-2 mb-2 pb-2 border-b border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Select all columns
                        const newVisibility = {};
                        table.getAllLeafColumns().forEach((column) => {
                          newVisibility[column.id] = true;
                        });
                        setColumnVisibility(newVisibility);
                      }}
                      className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200"
                    >
                      ✅ Select All
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Deselect all columns (but keep at least one)
                        const allColumns = table.getAllLeafColumns();
                        const newVisibility = {};

                        // Keep the first column visible, hide the rest
                        allColumns.forEach((column, index) => {
                          newVisibility[column.id] = index === 0;
                        });

                        setColumnVisibility(newVisibility);
                      }}
                      className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200"
                    >
                      ❌ Deselect All
                    </button>
                  </div>
                  {table.getAllLeafColumns().map((column) => (
                    <label
                      key={column.id}
                      className="flex items-center px-2 py-1 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={column.getIsVisible()}
                        onChange={(e) => {
                          e.stopPropagation();
                          // Use a custom handler that doesn't trigger parent callbacks immediately
                          const newVisibility = {
                            ...columnVisibility,
                            [column.id]: e.target.checked
                          };
                          setColumnVisibility(newVisibility);
                        }}
                        className="mr-2 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        {column.columnDef.header}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pivot Table Toggle */}
          <button
            onClick={toggleViewMode}
            className={`px-3 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 ${
              isPivotMode
                ? "text-white bg-blue-600 border border-blue-600 focus:ring-blue-500"
                : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-gray-500"
            }`}
          >
            {isPivotMode ? "Switch to Regular Table" : "Switch to Pivot Table"}
          </button>

          {/* Export CSV Button */}
          <button
            onClick={exportToCSV}
            className="px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <svg
              className="w-4 h-4 mr-2 inline-block"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export CSV
          </button>

          {/* Clear Filters Button */}
          {(columnFilters.length > 0 || globalFilter) && (
            <button
              onClick={clearAllFilters}
              className="px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Active Filters */}
      {(columnFilters.length > 0 || globalFilter) && (
        <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-200">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-blue-800">
              Active Filters:
            </span>
            {globalFilter && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Global: {globalFilter}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("DataTable: Global filter remove button clicked");
                    setGlobalFilter("");
                  }}
                  className="ml-1 text-purple-600 hover:text-purple-800 cursor-pointer"
                >
                  ×
                </button>
              </span>
            )}
            {columnFilters.map((filter) => {
              const column = columns.find(
                (col) => col.accessorKey === filter.id
              );
              const filterValueCount = Array.isArray(filter.value)
                ? filter.value.length
                : 1;
              return (
                <span
                  key={filter.id}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {column?.header}: {filterValueCount} selected
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("DataTable: Filter remove button clicked for columnId:", filter.id);
                      clearColumnFilter(filter.id);
                    }}
                    className="ml-1 text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Pivot Configuration Panel */}
      {isPivotMode && !pivotConfig && (
        <PivotConfigPanel
          columns={columns}
          onDataGenerate={handleGeneratePivot}
          onCancel={() => setIsPivotMode(false)}
        />
      )}

      {/* Pivot Error Message */}
      {pivotError && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md border border-red-200">
          {pivotError}
        </div>
      )}

      {/* Table or Pivot Table View */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden table-container">
        {isPivotMode && pivotConfig ? (
          // Pivot Table View
          <div className="p-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Pivot Table</h3>
            </div>
            {data && data.length > 0 ? (
              <PivotTableView data={data} pivotConfig={pivotConfig} />
            ) : (
              <div className="text-center p-8 text-gray-500">
                <p>No data available for pivot table</p>
                <p className="text-sm mt-2">
                  Please ensure data is loaded correctly
                </p>
              </div>
            )}
          </div>
        ) : !isPivotMode ? (
          // Regular Table View
          <div className="overflow-x-auto min-h-[500px]">
            {table.getFilteredRowModel().rows.length === 0 ? (
              // Show "No matching records" message when there are zero results
              <div className="flex items-center justify-center min-h-[500px] text-gray-500 text-lg">
                No matching records found
              </div>
            ) : (
              <table
                className="min-w-full divide-y divide-gray-200"
                ref={tableRef}
                style={{ tableLayout: 'fixed', width: '100%' }}
              >
                <DraggableTableHeader
                  table={table}
                  columnFilters={columnFilters}
                  onColumnReorder={handleColumnReorder}
                  onSort={(header) => header.column.getToggleSortingHandler()}
                  onFilter={(columnId) => toggleDropdown(columnId)}
                  onColumnSizingChange={setColumnSizes}
                  getColumnSize={getColumnSize}
                  MIN_COLUMN_WIDTH={MIN_COLUMN_WIDTH}
                  MAX_COLUMN_WIDTH={MAX_COLUMN_WIDTH}
                  columnOrder={columnOrder}
                  setColumnOrder={setColumnOrder}
                  openDropdowns={openDropdowns}
                  toggleDropdown={toggleDropdown}
                  columnMultiSelectValues={columnMultiSelectValues}
                  getUniqueValues={getUniqueValues}
                  handleSelectAllChange={handleSelectAllChange}
                  handleMultiSelectChange={handleMultiSelectChange}
                  dropdownRefs={dropdownRefs}
                />
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* Actual Data Rows */}
                  {table.getPaginationRowModel().rows.map((row, idx) => {
                    const rowId = row.original.id || row.id;
                    const isSelected = selectedRowId === rowId;

                    return (
                      <tr
                        key={row.id}
                        id={`row-${rowId}`}
                        className={`cursor-pointer ${
                          idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                        } hover:bg-blue-50 ${isSelected ? "bg-yellow-100" : ""}`}
                        onClick={() => handleRowClick(row)}
                      >
                        {columnOrder.map((columnId) => {
                          const cell = row.getVisibleCells().find(
                            (c) => c.column.columnDef.accessorKey === columnId
                          );
                          if (!cell) return null;
                          
                          // Use consistent column sizing
                          const columnSize = getColumnSize(columnId);

                          return (
                            <td
                              key={cell.id}
                              className="text-sm text-gray-900 border-r border-gray-100 last:border-r-0"
                              style={{
                                width: `${columnSize}px`,
                                minWidth: `${MIN_COLUMN_WIDTH}px`,
                                maxWidth: `${MAX_COLUMN_WIDTH}px`,
                              }}
                            >
                              <div
                                className="px-4 py-3 truncate hover:text-blue-600"
                                title={String(cell.getValue())}
                              >
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {/* Placeholder Rows - Fill remaining space when fewer rows than page size */}
                  {Array.from({
                    length: Math.max(
                      0,
                      table.getState().pagination.pageSize -
                        table.getPaginationRowModel().rows.length
                    ),
                  }).map((_, placeholderIdx) => {
                    const actualRowCount = table.getPaginationRowModel().rows.length;
                    const isEvenRow = (actualRowCount + placeholderIdx) % 2 === 0;

                    return (
                      <tr
                        key={`placeholder-${placeholderIdx}`}
                        className={`${
                          isEvenRow ? "bg-white" : "bg-gray-50"
                        } pointer-events-none`}
                      >
                        {table.getVisibleLeafColumns().map((column) => {
                          const columnId = column.columnDef.accessorKey || column.id;
                          const columnSize = getColumnSize(columnId);

                          return (
                            <td
                              key={`placeholder-${placeholderIdx}-${columnId}`}
                              className="text-sm border-r border-gray-100 last:border-r-0"
                              style={{
                                width: `${columnSize}px`,
                                minWidth: `${MIN_COLUMN_WIDTH}px`,
                                maxWidth: `${MAX_COLUMN_WIDTH}px`,
                              }}
                            >
                              <div className="px-4 py-3 text-transparent select-none">
                                .
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        ) : null}
      </div>

      {/* Pagination Controls - Now OUTSIDE and BELOW the table */}
      {!isPivotMode && (
        <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <p className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-medium">
                  {table.getState().pagination.pageIndex *
                    table.getState().pagination.pageSize +
                    1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(
                    (table.getState().pagination.pageIndex + 1) *
                      table.getState().pagination.pageSize,
                    table.getFilteredRowModel().rows.length
                  )}
                </span>{" "}
                of{" "}
                <span className="font-medium">
                  {table.getFilteredRowModel().rows.length}
                </span>{" "}
                results
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={table.getState().pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
                className="rounded border-gray-300 text-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
              >
                {[5, 10, 20, 30, 40, 50].map((pageSize) => (
                  <option key={pageSize} value={pageSize}>
                    Show {pageSize}
                  </option>
                ))}
              </select>
              <div className="flex">
                <button
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ««
                </button>
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ‹
                </button>
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  Page {table.getState().pagination.pageIndex + 1} of{" "}
                  {table.getPageCount()}
                </span>
                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ›
                </button>
                <button
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  »»
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
