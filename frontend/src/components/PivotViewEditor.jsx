const PivotViewEditor = ({
  viewSlot,
  initialData,
  columns = [],
  onSave,
  onCancel,
}) => {
  const [selectedColumns, setSelectedColumns] = useState(
    initialData?.selected_columns ? initialData.selected_columns.split(",") : []
  );
  const [chartType, setChartType] = useState(
    initialData?.chart_config ? initialData.chart_config.split(",")[0] : "bar"
  );
  const [xAxis, setXAxis] = useState(
    initialData?.chart_config ? initialData.chart_config.split(",")[1] : ""
  );
  const [yAxis, setYAxis] = useState(
    initialData?.chart_config ? initialData.chart_config.split(",")[2] : ""
  );

  const handleColumnToggle = (column) => {
    if (selectedColumns.includes(column)) {
      setSelectedColumns(selectedColumns.filter((col) => col !== column));
    } else {
      setSelectedColumns([...selectedColumns, column]);
    }
  };

  const handleSave = () => {
    // Prepare data for saving
    const viewData = {
      slot: viewSlot,
      selected_columns: selectedColumns.join(","),
      chart_config: `${chartType},${xAxis},${yAxis}`,
    };

    onSave(viewData);
  };

  const availableColumns = columns.map(
    (col) => col.accessorKey || col.header || col
  );

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-3/4 max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Edit View {viewSlot}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              &times;
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Column Selection */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Select Columns ({selectedColumns.length})
                </label>
              </div>
              <div className="border rounded-md p-3 h-64 overflow-y-auto">
                {availableColumns.map((column) => (
                  <label key={column} className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      checked={selectedColumns.includes(column)}
                      onChange={() => handleColumnToggle(column)}
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      {column}
                      {selectedColumns.includes(column) && (
                        <span className="ml-2 text-xs text-blue-600">
                          (selected)
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Chart Configuration */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">
                Chart Configuration
              </h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chart Type
                </label>
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="bar">Bar Chart</option>
                  <option value="line">Line Chart</option>
                  <option value="pie">Pie Chart</option>
                  <option value="scatter">Scatter Plot</option>
                  <option value="">None</option>
                </select>
              </div>

              {chartType && chartType !== "" && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      X Axis
                    </label>
                    <select
                      value={xAxis}
                      onChange={(e) => setXAxis(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Column</option>
                      {selectedColumns.map((column) => (
                        <option key={`x-${column}`} value={column}>
                          {column}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Y Axis
                    </label>
                    <select
                      value={yAxis}
                      onChange={(e) => setYAxis(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Column</option>
                      {selectedColumns.map((column) => (
                        <option key={`y-${column}`} value={column}>
                          {column}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Chart Preview */}
              {chartType && chartType !== "" && (
                <div className="mt-6">
                  <h4 className="text-md font-medium text-gray-700 mb-2">
                    Chart Preview
                  </h4>
                  <div className="border rounded-md p-4 h-32 flex items-center justify-center bg-gray-50">
                    <p className="text-gray-500">
                      {chartType.toUpperCase()} chart preview would appear here
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-8">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PivotViewEditor;
