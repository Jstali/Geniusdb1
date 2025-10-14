import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
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
import useApiCache from "../hooks/useApiCache";

// Utility function to handle missing values based on inferred data types
const handleMissingValue = (value, columnName) => {
  if (value !== null && value !== undefined && value !== "") {
    return value;
  }

  const numericColumnPatterns = [
    /headroom/i, /capacity/i, /power/i, /voltage/i, /demand/i,
    /rating/i, /mw$/i, /kv$/i, /mva$/i, /ohm$/i, /percentage/i,
    /count/i, /year/i, /size/i, /amount/i, /value/i, /number/i,
    /total/i, /sum/i, /average/i, /min/i, /max/i, /temperature/i, /frequency/i,
  ];

  const isLikelyNumeric = numericColumnPatterns.some((pattern) =>
    pattern.test(columnName.replace(/[^a-zA-Z0-9]/g, ""))

  return isLikelyNumeric ? 0 : "null";
};

const renderCellContent = (value, columnName) => {
  const processedValue = handleMissingValue(value, columnName);
  return processedValue === null || processedValue === undefined
    ? ""
    : String(processedValue);
};

const OptimizedTableView = ({
  data = [],
  columns = [],
  onRowClick,
  loading,
  error,
  selectedColumns = [],
  onSelectedColumnsChange,
  onFilteredDataChange = () => {},
  onFiltersChange = () => {},
  initialFilters = {},
  initialSortConfig = null,
  initialPaginationConfig = null,
}) => {
  // Initialize all hooks first to maintain consistent order
  const [columnFilters, setColumnFilters] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [pagination, setPagination] = useState({
    pageSize: 50, // Increased default page size for better performance
  });
  const [columnSizes, setColumnSizes] = useState({});
  const [isResizing, setIsResizing] = useState(null);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [columnMultiSelectValues, setColumnMultiSelectValues] = useState({});
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const [isPivotMode, setIsPivotMode] = useState(false);
  const [pivotConfig, setPivotConfig] = useState(null);
  const [pivotError, setPivotError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // Refs
  const tableRef = useRef(null);
  const dropdownRefs = useRef({});
  const columnToggleRef = useRef(null);
  const initialFiltersApplied = useRef(false);
  const isFetching = useRef(false);

  // API cache hook
  const { fetchWithCache, invalidateCache, loading: cacheLoading } = useApiCache();

  // Generate columns from data
  const generateColumns = useCallback((data) => {
    if (!data || data.length === 0) return [];
    const firstRow = data[0];
    const columns = Object.keys(firstRow).map((key) => ({
      header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
    }));
    return columns;
  }, []);

  // Fetch data with pagination and caching
  const fetchData = useCallback(async (page = 1, limit = 50, search = "") => {
    if (isFetching.current) return;
    
    try {
      isFetching.current = true;
      setLoading(true);
      
      const API_BASE = (window._env_ && window._env_.API_BASE) || "";
      const url = `${API_BASE}/data/transformers`;
      
      const params = {
        page,
        limit,
        ...(search && { search })
      };

      const response = await fetchWithCache(url, { params }, 2 * 60 * 1000); // 2 minute cache
      
      if (response.data) {
        setData(response.data);
        setTotalCount(response.pagination.total_count);
        setTotalPages(response.pagination.total_pages);
        setCurrentPage(response.pagination.page);
        
        const generatedColumns = generateColumns(response.data);
        if (onSelectedColumnsChange) {
          onSelectedColumnsChange(generatedColumns.map(col => col.accessorKey));
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [fetchWithCache, generateColumns, onSelectedColumnsChange]);

  // Initial data fetch
  useEffect(() => {
    fetchData(1, 50, searchTerm);
  }, [fetchData, searchTerm]);

  // Handle search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== "") {
        fetchData(1, 50, searchTerm);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, fetchData]);

  // Handle pagination
  const handlePageChange = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchData(newPage, pagination.pageSize, searchTerm);
    }
  }, [fetchData, totalPages, pagination.pageSize, searchTerm]);

  // Handle page size change
  const handlePageSizeChange = useCallback((newPageSize) => {
    setPagination(prev => ({ ...prev, pageSize: newPageSize }));
    fetchData(1, newPageSize, searchTerm);
  }, [fetchData, searchTerm]);

  // Table configuration
  const table = useReactTable({
    data,
    state: {
      columnFilters,
      globalFilter,
      sorting,
      columnVisibility,
      pagination,
    },
    manualPagination: true, // We handle pagination server-side
  });

  return (
    <div className="w-full">
      {/* Search and Controls */}
      <div className="mb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search data..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <select
            value={pagination.pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
            <option value={200}>200 per page</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPivotMode(!isPivotMode)}
            className={`px-4 py-2 rounded-md ${
              isPivotMode
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            {isPivotMode ? "Exit Pivot" : "Pivot View"}
          </button>
          
          <button
            onClick={() => invalidateCache("/data/transformers")}
            className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Loading State */}
      {(loading || cacheLoading) && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading data...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}

      {/* Pivot Mode */}
      {isPivotMode ? (
        <div>
          <PivotConfigPanel
            data={data}
            onConfigChange={setPivotConfig}
            onError={setPivotError}
          />
          {pivotError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              Pivot Error: {pivotError}
            </div>
          )}
          <PivotTableView data={data} pivotConfig={pivotConfig} />
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={header.column.getToggleSortingHandler()}
                        style={{ width: header.getSize() }}
                      >
                        <div className="flex items-center gap-2">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {{
                          }[header.column.getIsSorted() ?? null] ?? "↕"}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`hover:bg-gray-50 cursor-pointer ${
                      selectedRowId === row.id ? "bg-blue-50" : ""
                    }`}
                    onClick={() => {
                      setSelectedRowId(row.id);
                      if (onRowClick) onRowClick(row.original);
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                      >
                        {renderCellContent(
                          cell.getValue(),
                          cell.column.id
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * pagination.pageSize) + 1} to{" "}
              {Math.min(currentPage * pagination.pageSize, totalCount)} of{" "}
              {totalCount} results
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              
              <span className="px-3 py-2">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
};

export default OptimizedTableView;
