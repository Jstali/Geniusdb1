import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Draggable header cell component
const DraggableHeaderCell = ({ 
  header, 
  columnId, 
  hasFilter, 
  sortDirection, 
  columnSize, 
  onSort, 
  onFilter,
  onColumnSizingChange,
  MIN_COLUMN_WIDTH,
  MAX_COLUMN_WIDTH,
  openDropdowns,
  toggleDropdown,
  columnMultiSelectValues,
  getUniqueValues,
  handleSelectAllChange,
  handleMultiSelectChange,
  dropdownRefs
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: columnId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <th
      ref={setNodeRef}
      style={{
        ...style,
        width: `${columnSize}px`,
        minWidth: `${MIN_COLUMN_WIDTH}px`,
        maxWidth: `${MAX_COLUMN_WIDTH}px`,
      }}
      data-resizing={header.column.getIsResizing()}
      className={`text-left text-xs font-medium text-white uppercase tracking-wider border-r border-blue-700 last:border-r-0 relative group ${
        isDragging ? 'z-50' : ''
      }`}
    >
      <div className="flex items-center justify-between h-full">
        <div
          className="flex items-center cursor-pointer hover:text-blue-200 px-4 py-3 flex-1"
          onClick={onSort}
        >
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="mr-2 cursor-grab active:cursor-grabbing text-blue-200 hover:text-white"
            title="Drag to reorder column"
            onMouseDown={(e) => e.stopPropagation()}
          >
            ⋮⋮
          </div>
          
          <span className="mr-2 truncate">
            {header.column.columnDef.header}
          </span>
          
          {sortDirection === "asc" && (
            <span className="text-blue-200">↑</span>
          )}
          {sortDirection === "desc" && (
            <span className="text-blue-200">↓</span>
          )}
          {!sortDirection && (
            <span className="text-blue-300">↕</span>
          )}
        </div>

        {/* Resize Handle */}
        <div
          className={`resizer ${
            header.column.getIsResizing() ? 'isResizing' : ''
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Resize started for column:', columnId);
            const startX = e.clientX;
            const startWidth = header.column.getSize();
            console.log('Start width:', startWidth);
            
            const handleMouseMove = (e) => {
              const newWidth = startWidth + (e.clientX - startX);
              const constrainedWidth = Math.max(50, Math.min(800, newWidth));
              console.log('New width:', constrainedWidth);
              
              // Use the table's column sizing state setter
              if (onColumnSizingChange) {
                onColumnSizingChange(prev => {
                  const newSizes = {
                    ...prev,
                    [columnId]: constrainedWidth
                  };
                  console.log('Updating column sizes:', newSizes);
                  return newSizes;
                });
              }
            };
            
            const handleMouseUp = () => {
              console.log('Resize ended for column:', columnId);
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        />

        {/* Filter Button */}
        {hasFilter && (
          <button
            onClick={onFilter}
            className="ml-2 p-1 text-blue-200 hover:text-white hover:bg-blue-500 rounded"
            title="Filter column"
          >
            🔍
          </button>
        )}
      </div>

      {/* Filter Dropdown */}
      {columnId && (
        <div className="absolute right-2 bottom-2">
          <div
            className="relative"
            ref={(el) => (dropdownRefs.current[columnId] = el)}
          >
            <button
              onClick={() => toggleDropdown(columnId)}
              className={`p-1 rounded hover:bg-blue-500 ${
                hasFilter
                  ? "text-blue-200 bg-blue-700"
                  : "text-blue-300"
              }`}
            >
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {/* Filter Dropdown */}
            {openDropdowns[columnId] && (
              <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
                <div className="p-2">
                  <div className="pb-2 border-b border-gray-200 mb-2">
                    <p className="text-sm font-medium text-gray-700">
                      Filter by {header.column.columnDef.header}
                    </p>
                  </div>

                  {/* Select All Option */}
                  <div className="mb-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={
                          columnMultiSelectValues[columnId]?.length ===
                          getUniqueValues(columnId).length
                        }
                        onChange={(e) =>
                          handleSelectAllChange(columnId, e.target.checked)
                        }
                        className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Select All</span>
                    </label>
                  </div>

                  {/* Individual Options */}
                  {getUniqueValues(columnId).map((value) => (
                    <div key={value} className="mb-1">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={
                            columnMultiSelectValues[columnId]?.includes(value) ||
                            false
                          }
                          onChange={(e) =>
                            handleMultiSelectChange(
                              columnId,
                              value,
                              e.target.checked
                            )
                          }
                          className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 truncate">
                          {value}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </th>
  );
};

// Main draggable table header component
const DraggableTableHeader = ({
  table,
  columnFilters,
  onColumnReorder,
  onSort,
  onFilter,
  onColumnSizingChange,
  getColumnSize,
  MIN_COLUMN_WIDTH,
  MAX_COLUMN_WIDTH,
  columnOrder,
  setColumnOrder,
  openDropdowns,
  toggleDropdown,
  columnMultiSelectValues,
  getUniqueValues,
  handleSelectAllChange,
  handleMultiSelectChange,
  dropdownRefs
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = columnOrder.indexOf(active.id);
      const newIndex = columnOrder.indexOf(over.id);
      
      const newColumnOrder = arrayMove(columnOrder, oldIndex, newIndex);
      setColumnOrder(newColumnOrder);
      onColumnReorder(newColumnOrder);
    }
  };

  // Get headers in the current column order
  const orderedHeaders = columnOrder.map(columnId => 
    table.getHeaderGroups()[0].headers.find(header => 
      header.column.columnDef.accessorKey === columnId
    )
  ).filter(Boolean);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext 
        items={columnOrder} 
        strategy={horizontalListSortingStrategy}
      >
        <thead className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-md sticky top-0 z-10">
          <tr>
            {orderedHeaders.map((header) => {
              const columnId = header.column.columnDef.accessorKey;
              const hasFilter = columnFilters.some(
                (f) => f.id === columnId
              );
              const sortDirection = header.column.getIsSorted();
              const columnSize = getColumnSize(columnId);

              return (
                <DraggableHeaderCell
                  key={columnId}
                  header={header}
                  columnId={columnId}
                  hasFilter={hasFilter}
                  sortDirection={sortDirection}
                  columnSize={columnSize}
                  onSort={header.column.getToggleSortingHandler()}
                  onFilter={() => onFilter(columnId)}
                  onColumnSizingChange={onColumnSizingChange}
                  MIN_COLUMN_WIDTH={MIN_COLUMN_WIDTH}
                  MAX_COLUMN_WIDTH={MAX_COLUMN_WIDTH}
                  openDropdowns={openDropdowns}
                  toggleDropdown={toggleDropdown}
                  columnMultiSelectValues={columnMultiSelectValues}
                  getUniqueValues={getUniqueValues}
                  handleSelectAllChange={handleSelectAllChange}
                  handleMultiSelectChange={handleMultiSelectChange}
                  dropdownRefs={dropdownRefs}
                />
              );
            })}
          </tr>
        </thead>
      </SortableContext>
    </DndContext>
  );
};

export default DraggableTableHeader;
