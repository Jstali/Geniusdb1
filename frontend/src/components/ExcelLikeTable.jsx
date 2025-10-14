import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';

// Sample data
const defaultData = [
  { id: 1, name: 'John Doe', age: 30, email: 'john@example.com', department: 'Engineering', salary: 75000 },
  { id: 2, name: 'Jane Smith', age: 25, email: 'jane@example.com', department: 'Marketing', salary: 65000 },
  { id: 3, name: 'Bob Johnson', age: 35, email: 'bob@example.com', department: 'Sales', salary: 70000 },
  { id: 4, name: 'Alice Brown', age: 28, email: 'alice@example.com', department: 'HR', salary: 60000 },
  { id: 5, name: 'Charlie Wilson', age: 32, email: 'charlie@example.com', department: 'Engineering', salary: 80000 },
  { id: 6, name: 'Diana Davis', age: 27, email: 'diana@example.com', department: 'Marketing', salary: 62000 },
  { id: 7, name: 'Eve Miller', age: 29, email: 'eve@example.com', department: 'Sales', salary: 68000 },
  { id: 8, name: 'Frank Garcia', age: 31, email: 'frank@example.com', department: 'Engineering', salary: 78000 },
];

const ExcelLikeTable = ({ data = defaultData }) => {
  const [columnSizing, setColumnSizing] = useState({});
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Column definitions with resizing enabled
  const columns = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        size: 80,
        minSize: 50,
        maxSize: 120,
        enableResizing: true,
      },
      {
        accessorKey: 'name',
        header: 'Name',
        size: 200,
        minSize: 100,
        maxSize: 300,
        enableResizing: true,
      },
      {
        accessorKey: 'age',
        header: 'Age',
        size: 80,
        minSize: 60,
        maxSize: 120,
        enableResizing: true,
      },
      {
        accessorKey: 'email',
        header: 'Email',
        size: 250,
        minSize: 150,
        maxSize: 400,
        enableResizing: true,
      },
      {
        accessorKey: 'department',
        header: 'Department',
        size: 150,
        minSize: 100,
        maxSize: 200,
        enableResizing: true,
      },
      {
        accessorKey: 'salary',
        header: 'Salary',
        size: 120,
        minSize: 80,
        maxSize: 180,
        enableResizing: true,
        cell: ({ getValue }) => {
          const value = getValue();
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(value);
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      columnSizing,
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
    onColumnSizingChange: setColumnSizing,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    debugTable: false,
  });

  return (
    <div className="w-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Global Filter */}
      <div className="p-4 border-b border-gray-200">
        <input
          type="text"
          placeholder="Search all columns..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table 
          className="w-full border-collapse excel-table"
          style={{ tableLayout: 'fixed', width: '100%' }}
        >
          {/* Table Header */}
          <thead className="bg-gray-50 border-b border-gray-200">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="relative text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 border-r border-gray-200 last:border-r-0 group"
                    style={{
                      width: `${header.getSize()}px`,
                      minWidth: `${header.column.columnDef.minSize || 50}px`,
                      maxWidth: `${header.column.columnDef.maxSize || 500}px`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className="flex items-center cursor-pointer hover:text-gray-700"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        {{
                          asc: <span className="ml-1 text-blue-600">↑</span>,
                          desc: <span className="ml-1 text-blue-600">↓</span>,
                        }[header.column.getIsSorted()] ?? (
                          <span className="ml-1 text-gray-400">↕</span>
                        )}
                      </div>
                    </div>

                    {/* Resize Handle */}
                    <div
                      className="resize-handle"
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                    />
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          {/* Table Body */}
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-gray-50 transition-colors duration-150">
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    className="px-4 py-3 text-sm text-gray-900 border-r border-gray-100 last:border-r-0 truncate"
                    style={{
                      width: `${cell.column.getSize()}px`,
                      minWidth: `${cell.column.columnDef.minSize || 50}px`,
                      maxWidth: `${cell.column.columnDef.maxSize || 500}px`,
                    }}
                    title={String(cell.getValue())}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{' '}
            of {table.getFilteredRowModel().rows.length} results
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            First
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExcelLikeTable;
