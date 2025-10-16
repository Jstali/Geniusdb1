import React from 'react';
import ExcelLikeTable from '../components/ExcelLikeTable';

const ExcelTableDemo = () => {
  return (
    <div className="min-h-screen py-8 px-4" style={{backgroundColor: '#F6F2F4'}}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Excel-Like Resizable Table
          </h1>
          <p className="text-gray-600">
            A fully functional data table with resizable columns, sorting, filtering, and pagination.
            Drag the column borders to resize columns just like in Excel.
          </p>
        </div>
        
        <ExcelLikeTable />
        
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Features:</h3>
          <ul className="text-blue-800 space-y-1">
            <li>• <strong>Resizable Columns:</strong> Drag the right edge of any column header to resize</li>
            <li>• <strong>Sorting:</strong> Click column headers to sort ascending/descending</li>
            <li>• <strong>Global Search:</strong> Use the search box to filter across all columns</li>
            <li>• <strong>Pagination:</strong> Navigate through pages of data</li>
            <li>• <strong>Fixed Layout:</strong> Table uses fixed layout for consistent column widths</li>
            <li>• <strong>Responsive:</strong> Horizontal scroll on smaller screens</li>
            <li>• <strong>Excel-like UX:</strong> Smooth resizing with visual feedback</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ExcelTableDemo;
