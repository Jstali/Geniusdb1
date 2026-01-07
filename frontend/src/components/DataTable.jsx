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
  showFullSites = false, // Add this prop for site filtering toggle
  onToggleFullSites = () => {}, // Add this prop to handle site filtering toggle
}) => {
  // Stringify initialFilters for stable dependency
  const initialFiltersKey = JSON.stringify(initialFilters || {});
  
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
  const isManuallyToggling = useRef(false); // Track when user is manually toggling columns
  
  // Track if we're applying initial filters (to prevent circular updates)
  const isApplyingInitialFilters = useRef(false);
  const lastAppliedFiltersRef = useRef("");
  
  // Apply initialFilters whenever they change
  useEffect(() => {
    console.log("=== DataTable Filter useEffect ===");
    console.log("initialFiltersKey:", initialFiltersKey);
    console.log("lastAppliedFiltersRef.current:", lastAppliedFiltersRef.current);
    console.log("Are they equal?", lastAppliedFiltersRef.current === initialFiltersKey);
    
    // Only apply if filters actually changed
    if (lastAppliedFiltersRef.current === initialFiltersKey) {
      console.log("DataTable: SKIPPING - filters unchanged");
      return;
    }
    
    console.log("DataTable: APPLYING filters (they changed)");
    isApplyingInitialFilters.current = true;
    lastAppliedFiltersRef.current = initialFiltersKey;
    const parsedFilters = JSON.parse(initialFiltersKey);
    
    if (!parsedFilters || Object.keys(parsedFilters).length === 0) {
      console.log("DataTable: Filters are empty, clearing columnFilters");
      setColumnFilters([]);
      setColumnMultiSelectValues({});
      // Allow user filters to propagate after a short delay
      setTimeout(() => { isApplyingInitialFilters.current = false; }, 100);
      return;
    }
    
    console.log("DataTable: Filters are NOT empty, applying:", parsedFilters);
    
    const newColumnFilters = Object.entries(parsedFilters)
      .filter(([key, val]) => key !== "_global" && val && val.length > 0)
      .map(([id, value]) => ({ id, value }));
    
    const newMultiSelectValues = Object.entries(parsedFilters)
      .filter(([key, val]) => key !== "_global" && val && val.length > 0)
      .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {});
    
    console.log("DataTable: Setting columnFilters to:", newColumnFilters);
    console.log("DataTable: Setting columnMultiSelectValues to:", newMultiSelectValues);
    setColumnFilters(newColumnFilters);
    setColumnMultiSelectValues(newMultiSelectValues);
    
    setTimeout(() => { isApplyingInitialFilters.current = false; }, 200);
  }, [initialFiltersKey]);

  // Site filtering logic - filter data based on showFullSites prop
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    if (showFullSites) {
      return data; // Show all sites
    }

    // Filter for limited sites: 10 green, 20 amber, 70 red
    const greenSites = data.filter(item => item["Generation Headroom Mw"] >= 50);
    const amberSites = data.filter(item => 
      item["Generation Headroom Mw"] >= 20 && item["Generation Headroom Mw"] < 50
    );
    const redSites = data.filter(item => item["Generation Headroom Mw"] < 20);

    // Take limited number of sites from each category
    const limitedGreenSites = greenSites.slice(0, 10);
    const limitedAmberSites = amberSites.slice(0, 20);
    const limitedRedSites = redSites.slice(0, 70);

    return [...limitedGreenSites, ...limitedAmberSites, ...limitedRedSites];
  }, [data, showFullSites]);
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
  const initialPaginationApplied = useRef(false);

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
  const DEFAULT_COLUMN_WIDTH = 250;
  const MIN_COLUMN_WIDTH = 120;
  const MAX_COLUMN_WIDTH = 1000;

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
    // Skip this update if user is manually toggling columns to prevent loop
    if (isManuallyToggling.current) {
      console.log("DataTable: Skipping column visibility update - user is manually toggling");
      return;
    }
    
    console.log("DataTable: Column visibility useEffect triggered", {
      columnsLength: columns?.length,
      selectedColumns,
      selectedColumnsLength: selectedColumns?.length,
      isManuallyToggling: isManuallyToggling.current
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
  console.log("DataTable: Column accessorKeys:", columns.map(col => col.accessorKey));
  console.log("DataTable: First row data values:", data[0] ? Object.values(data[0]).slice(0, 10) : 'No data');
  console.log("DataTable: First row column names:", data[0] ? Object.keys(data[0]) : 'No data');
  console.log("DataTable: Sample data for search test:", data.slice(0, 3).map(row => ({
    rowIndex: data.indexOf(row),
    columns: Object.keys(row),
    values: Object.values(row).slice(0, 5)
  })));

  // Create columns with custom cell rendering
  const processedColumns = columns.map((col) => ({
    ...col,
    filterFn: col.accessorKey ? "multiSelect" : undefined,
    enableGlobalFilter: true, // Enable global filtering for each column
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
    data: filteredData,
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
    enableGlobalFilter: true, // Explicitly enable global filtering
    globalFilterFn: (row, columnId, value) => {
      // Custom global filter function to search ONLY column data values
      if (!value || value.trim() === '') return true;
      
      const searchValue = value.toLowerCase().trim();
      
      // Get the original row data - this contains only the actual column data
      const rowData = row.original;
      
      // Search through each column's data value only
      const matches = Object.entries(rowData).some(([columnName, cellValue]) => {
        // Skip null, undefined, and empty values
        if (cellValue === null || cellValue === undefined || cellValue === '') return false;
        
        // Convert cell value to string and search in the actual data
        const cellString = String(cellValue).toLowerCase();
        const found = cellString.includes(searchValue);
        
        // Debug logging for matches - show actual data values
        if (found && row.index < 3) {
          console.log('Found match in column data:', {
            columnName,
            actualDataValue: cellValue,
            searchValue,
            rowIndex: row.index
          });
        }
        
        return found;
      });
      
      // Debug logging for first few rows - show actual data structure
      if (row.index < 2) {
        console.log('Searching column data:', {
          searchValue,
          rowIndex: row.index,
          actualColumnData: Object.fromEntries(
            Object.entries(rowData).filter(([key, value]) => 
              value !== null && value !== undefined && value !== ''
            )
          ),
          matches
        });
      }
      
      return matches;
    },
    filterFns: {
      multiSelect: (row, columnId, filterValues) => {
        if (!filterValues || filterValues.length === 0) return true;
        const cellValue = row.getValue(columnId);
        
        if (Array.isArray(filterValues)) {
          return filterValues.some((val) => {
            // Try numeric comparison first
            const cellNum = parseFloat(cellValue);
            const filterNum = parseFloat(val);
            if (!isNaN(cellNum) && !isNaN(filterNum)) {
              return cellNum === filterNum;
            }
            // Fall back to string comparison
            return String(cellValue).toLowerCase().trim() === String(val).toLowerCase().trim();
          });
        }
        
        const cellNum = parseFloat(cellValue);
        const filterNum = parseFloat(filterValues);
        if (!isNaN(cellNum) && !isNaN(filterNum)) {
          return cellNum === filterNum;
        }
        return String(cellValue).toLowerCase().trim() === String(filterValues).toLowerCase().trim();
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
        originalDataLength: filteredData.length,
        filteredDataLength: filteredData.length,
        globalFilter: globalFilter,
        columnFilters: columnFilters,
        showFullSites: showFullSites,
        sampleFilteredData: filteredData.slice(0, 3)
      });
      onFilteredDataChange(filteredData);
    }
  }, [table, onFilteredDataChange, filteredData.length, columnFilters, globalFilter, sorting, columnVisibility, showFullSites]);

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
    console.log("DataTable: Initial pagination config useEffect triggered", {
      initialPaginationConfig,
      hasInitialPaginationConfig: initialPaginationConfig && (initialPaginationConfig.pageSize || initialPaginationConfig.currentPage),
      currentPagination: pagination,
      initialPaginationApplied: initialPaginationApplied.current
    });
    
    // Only apply initial pagination if it hasn't been applied yet
    if (initialPaginationConfig && (initialPaginationConfig.pageSize || initialPaginationConfig.currentPage) && !initialPaginationApplied.current) {
      console.log("DataTable: Applying initial pagination config", initialPaginationConfig);
      setPagination(prev => ({
        pageIndex: initialPaginationConfig.currentPage ? initialPaginationConfig.currentPage - 1 : prev.pageIndex, // Convert to 0-based index
        pageSize: initialPaginationConfig.pageSize || prev.pageSize
      }));
      initialPaginationApplied.current = true;
    } else if (!initialPaginationConfig || (!initialPaginationConfig.pageSize && !initialPaginationConfig.currentPage)) {
      console.log("DataTable: No initial pagination to apply, resetting flag");
      initialPaginationApplied.current = false;
    } else if (initialPaginationApplied.current) {
      console.log("DataTable: Initial pagination already applied, skipping");
    }
  }, [initialPaginationConfig, pagination]);

  // Monitor global filter changes
  useEffect(() => {
    console.log("DataTable: Global filter changed:", globalFilter);
  }, [globalFilter]);

  // Monitor table filtered rows
  useEffect(() => {
    if (table) {
      const filteredRows = table.getFilteredRowModel().rows;
      console.log("DataTable: Table filtered rows changed:", {
        totalRows: filteredData.length,
        filteredRows: filteredRows.length,
        globalFilter: globalFilter,
        columnFilters: columnFilters.length,
        showFullSites: showFullSites
      });
    }
  }, [table, globalFilter, columnFilters, filteredData.length, showFullSites]);

  // Monitor pagination state changes
  useEffect(() => {
    if (table) {
      const paginationState = table.getState().pagination;
      console.log("DataTable: Pagination state changed:", {
        pageIndex: paginationState.pageIndex,
        pageSize: paginationState.pageSize,
        canNextPage: table.getCanNextPage(),
        canPreviousPage: table.getCanPreviousPage(),
        pageCount: table.getPageCount()
      });
    }
  }, [table, pagination]);

  // Track user-applied filters (excluding initial filters from saved views)
  const [userAppliedFilters, setUserAppliedFilters] = useState({
    columnFilters: [],
    globalFilter: ""
  });

  // Store onFiltersChange in a ref to avoid dependency issues
  const onFiltersChangeRef = useRef(onFiltersChange);
  onFiltersChangeRef.current = onFiltersChange;

  // Notify parent component when filters change (but not when applying initial filters)
  useEffect(() => {
    // Skip notifying parent when we're applying initial filters to prevent circular updates
    if (isApplyingInitialFilters.current) {
      console.log("DataTable: Skipping onFiltersChange - applying initial filters");
      return;
    }
    
    if (onFiltersChangeRef.current) {
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
      
      console.log("DataTable: Notifying parent of filter changes", filters);
      onFiltersChangeRef.current(filters);
    }
  }, [columnFilters, globalFilter]);

  // Track when user applies filters
  useEffect(() => {
    setUserAppliedFilters({
      columnFilters: columnFilters,
      globalFilter: globalFilter
    });
  }, [columnFilters, globalFilter]);

  // Check if user has applied any filters (excluding global search)
  const hasUserAppliedFilters = useMemo(() => {
    const hasColumnFilters = userAppliedFilters.columnFilters.length > 0;
    // Don't count global search as a filter - it's just a search
    // const hasGlobalFilter = userAppliedFilters.globalFilter && userAppliedFilters.globalFilter.trim() !== '';
    return hasColumnFilters; // Only count column filters, not global search
  }, [userAppliedFilters]);

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
          newValues = [...getUniqueValues(columnId)];
        } else {
          // Deselect all values
          newValues = [];
        }
      } else {
        // Helper for comparison
        const valuesMatch = (v1, v2) => {
          const n1 = parseFloat(v1);
          const n2 = parseFloat(v2);
          if (!isNaN(n1) && !isNaN(n2)) return n1 === n2;
          return String(v1) === String(v2);
        };
        
        if (isChecked) {
          // Add value to selection (avoid duplicates)
          if (!currentValues.some(v => valuesMatch(v, value))) {
            newValues = [...currentValues, value];
          } else {
            newValues = currentValues;
          }
        } else {
          // Remove value from selection
          newValues = currentValues.filter((v) => !valuesMatch(v, value));
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

  // Clear all user-applied filters (but keep initial filters from saved views)
  const clearAllFilters = () => {
    // Only clear user-applied filters, not initial filters from saved views
    const initialColumnFilters = [];
    const initialGlobalFilter = "";
    
    // Apply initial filters if they exist
    if (initialFilters && Object.keys(initialFilters).length > 0) {
      Object.entries(initialFilters).forEach(([columnId, filterValues]) => {
        if (columnId !== "_global" && filterValues && filterValues.length > 0) {
          initialColumnFilters.push({
            id: columnId,
            value: filterValues
          });
        }
      });
    }
    
    setColumnFilters(initialColumnFilters);
    setColumnMultiSelectValues({});
    setGlobalFilter(initialGlobalFilter);
    setOpenDropdowns({});
    
    // Reset user applied filters tracking
    setUserAppliedFilters({
      columnFilters: initialColumnFilters,
      globalFilter: initialGlobalFilter
    });
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
    
    // Don't reset initialFiltersApplied flag - allow user to freely clear filters
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
    if (!filteredData || !columnId) return [];
    
    const uniqueValues = [
      ...new Set(filteredData.map((row) => {
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
        {/* Left side - Search Input */}
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative text-blue-950">
                      <input
                        type="text"
                        value={globalFilter ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          console.log('Column search input changed:', value);
                          setGlobalFilter(value);
                        }}
                        placeholder="Search data columns..."
                        className={`w-full pl-10 pr-4 py-2 text-sm border rounded-md focus:outline-none transition-all duration-300 ${
                          globalFilter && globalFilter.trim() !== '' 
                            ? 'border-red-600 bg-red-50' 
                            : 'border-gray-300'
                        }`}
                        style={{
                          backgroundColor: globalFilter && globalFilter.trim() !== '' ? '#FEF2F2' : 'white'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#8DE971';
                          e.target.style.boxShadow = '0 0 0 3px rgba(141, 233, 113, 0.2)';
                        }}
                        onBlur={(e) => {
                          if (globalFilter && globalFilter.trim() !== '') {
                            e.target.style.borderColor = '#AD96DC';
                            e.target.style.boxShadow = 'none';
                          } else {
                            e.target.style.borderColor = '#E8E4E6';
                            e.target.style.boxShadow = 'none';
                          }
                        }}
                      />
              <svg
                className={`absolute left-3 top-2.5 h-4 w-4 ${
                  globalFilter && globalFilter.trim() !== '' 
                    ? 'text-red-600' 
                    : 'text-gray-400'
                }`}
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
              {globalFilter && globalFilter.trim() !== '' && (
                <button
                  onClick={() => setGlobalFilter('')}
                  className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 hover:text-gray-600"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {globalFilter && globalFilter.trim() !== '' && (
              <div className="mt-1 text-xs" style={{color: '#8DE971'}}>
                {table.getFilteredRowModel().rows.length} of {data.length} results match "{globalFilter}"
              </div>
            )}
          </div>
        </div>

        {/* Right side - Action buttons */}
        <div className="flex items-center gap-2">
          {/* Full Sites Toggle */}
          <button
            onClick={onToggleFullSites}
            className="px-3 py-2 text-sm font-medium rounded-md transition-all duration-300 transform hover:scale-105 focus:outline-none"
            style={{
              backgroundColor: showFullSites ? '#FF6B6B' : '#4CAF50',
              color: 'white',
              border: '1px solid rgba(3, 3, 4, 0.1)',
              boxShadow: showFullSites ? '0 4px 12px rgba(255, 107, 107, 0.3)' : '0 4px 12px rgba(76, 175, 80, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.boxShadow = showFullSites ? '0 6px 20px rgba(255, 107, 107, 0.4)' : '0 6px 20px rgba(76, 175, 80, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = showFullSites ? '0 4px 12px rgba(255, 107, 107, 0.3)' : '0 4px 12px rgba(76, 175, 80, 0.3)';
            }}
          >
            {showFullSites ? 'Limited Sites' : 'Full Sites'}
          </button>

          {/* Column Visibility Toggle */}
          <div className="relative" ref={columnToggleRef}>
            <button
              onClick={() => {
                const newState = !showColumnToggleRef.current;
                showColumnToggleRef.current = newState;
                setShowColumnToggle(newState);
              }}
              className="px-3 py-2 text-sm font-medium rounded-md transition-all duration-300 transform hover:scale-105 focus:outline-none"
              style={{
                backgroundColor: '#AD96DC',
                color: 'white',
                border: '1px solid rgba(3, 3, 4, 0.1)',
                boxShadow: '0 4px 12px rgba(173, 150, 220, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.boxShadow = '0 6px 20px rgba(173, 150, 220, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.boxShadow = '0 4px 12px rgba(173, 150, 220, 0.3)';
              }}
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
                        
                        // Set manual toggle flag to prevent useEffect from interfering
                        isManuallyToggling.current = true;
                        
                        // Select all columns
                        const newVisibility = {};
                        table.getAllLeafColumns().forEach((column) => {
                          newVisibility[column.id] = true;
                        });
                        setColumnVisibility(newVisibility);
                        
                        // Immediately notify parent of the change
                        if (onSelectedColumnsChange) {
                          const visibleColumns = Object.keys(newVisibility);
                          console.log("DataTable: Select All - notifying parent of selected columns:", visibleColumns);
                          onSelectedColumnsChange(visibleColumns);
                        }
                        
                        // Clear manual toggle flag after a short delay
                        setTimeout(() => {
                          isManuallyToggling.current = false;
                        }, 100);
                      }}
                      className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200"
                    >
                      ✅ Select All
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        
                        // Set manual toggle flag to prevent useEffect from interfering
                        isManuallyToggling.current = true;
                        
                        // Deselect all columns (but keep at least one)
                        const allColumns = table.getAllLeafColumns();
                        const newVisibility = {};

                        // Keep the first column visible, hide the rest
                        allColumns.forEach((column, index) => {
                          newVisibility[column.id] = index === 0;
                        });

                        setColumnVisibility(newVisibility);
                        
                        // Immediately notify parent of the change
                        if (onSelectedColumnsChange) {
                          const visibleColumns = Object.keys(newVisibility).filter(
                            (key) => newVisibility[key]
                          );
                          console.log("DataTable: Deselect All - notifying parent of selected columns:", visibleColumns);
                          onSelectedColumnsChange(visibleColumns);
                        }
                        
                        // Clear manual toggle flag after a short delay
                        setTimeout(() => {
                          isManuallyToggling.current = false;
                        }, 100);
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
                          
                          // Set manual toggle flag to prevent useEffect from interfering
                          isManuallyToggling.current = true;
                          
                          // Update visibility state
                          const newVisibility = {
                            ...columnVisibility,
                            [column.id]: e.target.checked
                          };
                          setColumnVisibility(newVisibility);
                          
                          // Immediately notify parent of the change
                          if (onSelectedColumnsChange) {
                            const visibleColumns = Object.keys(newVisibility).filter(
                              (key) => newVisibility[key]
                            );
                            console.log("DataTable: Column toggle - notifying parent of selected columns:", visibleColumns);
                            onSelectedColumnsChange(visibleColumns);
                          }
                          
                          // Clear manual toggle flag after a short delay to allow state updates
                          setTimeout(() => {
                            isManuallyToggling.current = false;
                          }, 100);
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
            className="px-3 py-2 text-sm font-medium rounded-md transition-all duration-300 transform hover:scale-105 focus:outline-none"
            style={{
              backgroundColor: isPivotMode ? '#AD96DC' : 'transparent',
              color: isPivotMode ? 'white' : '#AD96DC',
              border: `2px solid #AD96DC`,
              boxShadow: '0 4px 12px rgba(173, 150, 220, 0.2)'
            }}
            onMouseEnter={(e) => {
              e.target.style.boxShadow = '0 6px 20px rgba(173, 150, 220, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = '0 4px 12px rgba(173, 150, 220, 0.2)';
            }}
          >
            {isPivotMode ? "Switch to Regular Table" : "Switch to Pivot Table"}
          </button>

          {/* Export CSV Button */}
          <button
            onClick={exportToCSV}
            className="px-3 py-2 text-sm font-medium text-white rounded-md transition-all duration-300 transform hover:scale-105 focus:outline-none"
            style={{
              backgroundColor: '#AD96DC',
              boxShadow: '0 4px 12px rgba(173, 150, 220, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.boxShadow = '0 6px 20px rgba(173, 150, 220, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = '0 4px 12px rgba(173, 150, 220, 0.3)';
            }}
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

        </div>
      </div>

      {/* Active Filters - Only show column filters, not global search */}
      {columnFilters.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-200">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-blue-800">
              Active Filters:
            </span>
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
      <div className="bg-white rounded-lg overflow-hidden table-container transition-all duration-300 hover:shadow-xl" style={{boxShadow: '0 4px 12px rgba(3, 3, 4, 0.08)', borderRadius: '12px', border: '1px solid rgba(3, 3, 4, 0.1)'}}>
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
                <tbody className="divide-y divide-gray-200">
                  {/* Actual Data Rows */}
                  {table.getPaginationRowModel().rows.map((row, idx) => {
                    const rowId = row.original.id || row.id;
                    const isSelected = selectedRowId === rowId;

                    return (
                      <tr
                        key={row.id}
                        id={`row-${rowId}`}
                        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${isSelected ? "bg-yellow-100" : ""}`}
                        style={{
                          backgroundColor: idx % 2 === 0 ? 'white' : '#F6F2F4'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.target.style.backgroundColor = 'rgba(173, 150, 220, 0.1)';
                            e.target.style.transform = 'translateX(2px)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.target.style.backgroundColor = idx % 2 === 0 ? 'white' : '#F6F2F4';
                            e.target.style.transform = 'translateX(0)';
                          }
                        }}
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
        <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3 sm:px-6" style={{boxShadow: '0 2px 4px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)', borderRadius: '8px', border: '1px solid rgba(230, 57, 70, 0.1)'}}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <p className="text-sm" style={{color: '#030304'}}>
                Showing{" "}
                <span className="font-medium" style={{color: '#030304'}}>
                  {table.getState().pagination.pageIndex *
                    table.getState().pagination.pageSize +
                    1}
                </span>{" "}
                to{" "}
                <span className="font-medium" style={{color: '#030304'}}>
                  {Math.min(
                    (table.getState().pagination.pageIndex + 1) *
                      table.getState().pagination.pageSize,
                    table.getFilteredRowModel().rows.length
                  )}
                </span>{" "}
                of{" "}
                <span className="font-medium" style={{color: '#030304'}}>
                  {table.getFilteredRowModel().rows.length}
                </span>{" "}
                results
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={table.getState().pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
                className="rounded border-gray-300 text-sm transition-all duration-300"
                style={{
                  backgroundColor: '#F6F2F4',
                  borderColor: '#AD96DC',
                  color: '#030304'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#8DE971';
                  e.target.style.boxShadow = '0 0 0 3px rgba(141, 233, 113, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#AD96DC';
                  e.target.style.boxShadow = 'none';
                }}
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
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: '#F6F2F4',
                    borderColor: '#AD96DC',
                    color: '#030304'
                  }}
                  onMouseEnter={(e) => {
                    if (!e.target.disabled) {
                      e.target.style.backgroundColor = '#AD96DC';
                      e.target.style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.target.disabled) {
                      e.target.style.backgroundColor = '#F6F2F4';
                      e.target.style.color = '#030304';
                    }
                  }}
                >
                  ««
                </button>
                <button
                  onClick={() => {
                    console.log("DataTable: Previous page clicked", {
                      currentPage: table.getState().pagination.pageIndex,
                      canPreviousPage: table.getCanPreviousPage(),
                      pageCount: table.getPageCount()
                    });
                    table.previousPage();
                  }}
                  disabled={!table.getCanPreviousPage()}
                  className="relative inline-flex items-center px-3 py-2 border text-sm font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: '#F6F2F4',
                    borderColor: '#AD96DC',
                    color: '#030304'
                  }}
                  onMouseEnter={(e) => {
                    if (!e.target.disabled) {
                      e.target.style.backgroundColor = '#AD96DC';
                      e.target.style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.target.disabled) {
                      e.target.style.backgroundColor = '#F6F2F4';
                      e.target.style.color = '#030304';
                    }
                  }}
                >
                  ‹
                </button>
                <span className="relative inline-flex items-center px-4 py-2 border text-sm font-medium" style={{backgroundColor: '#F6F2F4', borderColor: '#AD96DC', color: '#030304'}}>
                  Page {table.getState().pagination.pageIndex + 1} of{" "}
                  {table.getPageCount()}
                </span>
                <button
                  onClick={() => {
                    console.log("DataTable: Next page clicked", {
                      currentPage: table.getState().pagination.pageIndex,
                      canNextPage: table.getCanNextPage(),
                      pageCount: table.getPageCount()
                    });
                    table.nextPage();
                  }}
                  disabled={!table.getCanNextPage()}
                  className="relative inline-flex items-center px-3 py-2 border text-sm font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: '#F6F2F4',
                    borderColor: '#AD96DC',
                    color: '#030304'
                  }}
                  onMouseEnter={(e) => {
                    if (!e.target.disabled) {
                      e.target.style.backgroundColor = '#AD96DC';
                      e.target.style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.target.disabled) {
                      e.target.style.backgroundColor = '#F6F2F4';
                      e.target.style.color = '#030304';
                    }
                  }}
                >
                  ›
                </button>
                <button
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: '#F6F2F4',
                    borderColor: '#AD96DC',
                    color: '#030304'
                  }}
                  onMouseEnter={(e) => {
                    if (!e.target.disabled) {
                      e.target.style.backgroundColor = '#AD96DC';
                      e.target.style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.target.disabled) {
                      e.target.style.backgroundColor = '#F6F2F4';
                      e.target.style.color = '#030304';
                    }
                  }}
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
