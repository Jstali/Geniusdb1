import React, { useState, useEffect } from "react";
import axios from "axios";

const ViewManager = ({
  isOpen,
  onClose,
  onLoadView,
  currentTableView,
  allColumns = [],
}) => {
  const [views, setViews] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [viewName, setViewName] = useState("");
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [chartConfig, setChartConfig] = useState({
    type: "bar",
    xAxis: "",
    yAxis: "",
  });
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch saved views when component mounts
  useEffect(() => {
    if (isOpen) {
      fetchViews();
    }
  }, [isOpen]);

  // Pre-fill with current table selection when slot changes
  useEffect(() => {
    if (selectedSlot && isOpen) {
      // If we have current table view, pre-fill with its selection
      if (currentTableView?.selectedColumns) {
        setSelectedColumns(currentTableView.selectedColumns);
      }

      // Set default view name
      if (!viewName) {
        setViewName(`View ${selectedSlot}`);
      }
    }
  }, [selectedSlot, isOpen, currentTableView]);

  const fetchViews = async () => {
    try {
      setLoading(true);
      const API_BASE = (window._env_ && window._env_.API_BASE) || "";
      const response = await axios.get(`${API_BASE}/api/user/views`);
      setViews(response.data.views || []);
      setLoading(false);
    } catch (err) {
      setError("Failed to fetch views");
      setLoading(false);
      console.error("Error fetching views:", err);
    }
  };

  const handleLoadView = async () => {
    if (!selectedSlot) {
      setError("Please select a view slot to load");
      return;
    }

    try {
      setLoading(true);
      const API_BASE = (window._env_ && window._env_.API_BASE) || "";
      const response = await axios.get(
        `${API_BASE}/api/user/views/${selectedSlot}`
      );

      if (response.data.error) {
        setError(response.data.error);
        setLoading(false);
        return;
      }

      // Apply the loaded view configuration
      onLoadView({
        tableView: {
          selectedColumns: response.data.selected_columns
            ? response.data.selected_columns.split(",")
            : [],
          filters: response.data.filters
            ? JSON.parse(response.data.filters)
            : {},
        },
        chartView: response.data.chart_config
          ? JSON.parse(response.data.chart_config)
          : {
              type: "bar",
              xAxis: "",
              yAxis: "",
            },
        pivotView: {},
        viewName: response.data.name || `View ${selectedSlot}`, // Add view name
      });

      setSuccess("View loaded successfully");
      setTimeout(() => {
        setSuccess("");
        onClose();
      }, 1500);
    } catch (err) {
      setError("Failed to load view");
      setLoading(false);
      console.error("Error loading view:", err);
    }
  };

  const handleSaveView = async () => {
    if (!selectedSlot) {
      setError("Please select a view slot");
      return;
    }

    if (!viewName.trim()) {
      setError("Please enter a view name");
      return;
    }

    if (selectedColumns.length === 0) {
      setError("Please select at least one column");
      return;
    }

    // Validate chart configuration
    if (!validateChartConfig()) {
      setError(
        "Invalid chart configuration. Please check your axis selections."
      );
      return;
    }

    // Validate filters
    const filterValidation = validateFilters();
    if (!filterValidation.valid) {
      setError(filterValidation.message);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const API_BASE = (window._env_ && window._env_.API_BASE) || "";
      // Prepare view data as query parameters
      const params = new URLSearchParams({
        name: viewName,
        selected_columns: selectedColumns.join(","),
        chart_config: JSON.stringify(chartConfig),
        filters: JSON.stringify(filters),
        user_id: 1,
      });

      const response = await axios.post(
        `${API_BASE}/api/user/views/${selectedSlot}?${params.toString()}`
      );

      if (response.data.error) {
        setError(response.data.error);
        setLoading(false);
        return;
      }

      // Refresh views list
      await fetchViews();
      setSuccess("View saved successfully");
      setTimeout(() => {
        setSuccess("");
      }, 1500);
      setLoading(false);
    } catch (err) {
      setError(
        "Failed to save view: " + (err.response?.data?.error || err.message)
      );
      setLoading(false);
      console.error("Error saving view:", err);
    }
  };

  // Validate filters
  const validateFilters = () => {
    // Check if any filter has an empty value
    for (const [column, columnFilters] of Object.entries(filters)) {
      if (columnFilters && columnFilters.length > 0) {
        for (const filter of columnFilters) {
          if (filter.operator && !filter.value && filter.value !== 0) {
            return {
              valid: false,
              message: `Please enter a value for the filter on column "${column}"`,
            };
          }
        }
      }
    }

    return { valid: true };
  };

  // Validate chart configuration
  const validateChartConfig = () => {
    if (!chartConfig.type) return true; // No chart type selected, no validation needed

    // Validate that axes are selected from selected columns
    if (chartConfig.xAxis && !selectedColumns.includes(chartConfig.xAxis)) {
      return false;
    }

    if (chartConfig.yAxis && !selectedColumns.includes(chartConfig.yAxis)) {
      return false;
    }

    // For bar and line charts, Y-axis should ideally be numeric
    // We'll allow save but show a warning in a real implementation
    if (
      (chartConfig.type === "bar" || chartConfig.type === "line") &&
      chartConfig.yAxis
    ) {
      // In a real implementation, we would check if the column is numeric
      // For now, we'll assume it's valid
      return true;
    }

    // For pie charts, both axes can be any type
    if (chartConfig.type === "pie") {
      return true;
    }

    // For scatter plots, both axes should ideally be numeric
    if (chartConfig.type === "scatter") {
      // In a real implementation, we would check if both columns are numeric
      // For now, we'll assume it's valid
      return true;
    }

    return true;
  };

  const handleResetView = async () => {
    if (!selectedSlot) {
      setError("Please select a view slot to reset");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.delete(
        `http://localhost:8000/api/user/views/${selectedSlot}?user_id=1`
      );

      if (response.data.error) {
        setError(response.data.error);
        setLoading(false);
        return;
      }

      // Refresh views list
      await fetchViews();
      setChartConfig({ type: "bar", xAxis: "", yAxis: "" });
      setFilters({});
      setSelectedColumns([]);
      setViewName("");
      setSuccess("View reset successfully");
      setTimeout(() => {
        setSuccess("");
      }, 1500);
      setLoading(false);
    } catch (err) {
      setError("Failed to reset view");
      setLoading(false);
      console.error("Error resetting view:", err);
    }
  };

  const toggleColumnSelection = (column) => {
    if (selectedColumns.includes(column)) {
      setSelectedColumns(selectedColumns.filter((c) => c !== column));
    } else {
      setSelectedColumns([...selectedColumns, column]);
    }
  };

  // Select all columns
  const selectAllColumns = () => {
    const allColumnNames = allColumns.map((column) =>
      typeof column === "object" ? column.original_name : column
    );
    setSelectedColumns(allColumnNames);
  };

  // Deselect all columns
  const deselectAllColumns = () => {
    setSelectedColumns([]);
  };

  const handleChartConfigChange = (field, value) => {
    // Validate that the selected axis is in the selected columns
    if ((field === "xAxis" || field === "yAxis") && value) {
      const isSelected = selectedColumns.includes(value);
      if (!isSelected) {
        setError(`Axis must be one of the selected columns`);
        return;
      }
    }

    setChartConfig({
      ...chartConfig,
      [field]: value,
    });
  };

  const addFilter = (column) => {
    setFilters({
      ...filters,
      [column]: [...(filters[column] || []), { operator: "=", value: "" }],
    });
  };

  const updateFilter = (column, index, field, value) => {
    const newFilters = [...(filters[column] || [])];
    newFilters[index] = { ...newFilters[index], [field]: value };
    setFilters({
      ...filters,
      [column]: newFilters,
    });
  };

  const removeFilter = (column, index) => {
    const newFilters = [...(filters[column] || [])];
    newFilters.splice(index, 1);
    setFilters({
      ...filters,
      [column]: newFilters,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              View Manager
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column - View selection and basic info */}
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select View Slot
                </label>
                <select
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                >
                  <option value="">Choose a view slot</option>
                  {[1, 2, 3, 4, 5].map((slot) => (
                    <option key={`slot-${slot}`} value={slot}>
                      View {slot}
                    </option>
                  ))}
                </select>
              </div>

              {selectedSlot && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      View Name
                    </label>
                    <input
                      type="text"
                      value={viewName}
                      onChange={(e) => setViewName(e.target.value)}
                      placeholder={`View ${selectedSlot}`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      disabled={loading}
                    />
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Selected Columns ({selectedColumns.length})
                      </label>
                    </div>
                    <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto">
                      {/* Select All / Deselect All buttons */}
                      <div className="flex space-x-2 mb-2">
                        <button
                          onClick={selectAllColumns}
                          className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200"
                        >
                          ✅ Select All
                        </button>
                        <button
                          onClick={deselectAllColumns}
                          className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200"
                        >
                          ❌ Deselect All
                        </button>
                      </div>
                      {allColumns.length > 0 ? (
                        allColumns.map((column) => (
                          <label
                            key={`column-${
                              typeof column === "object"
                                ? column.original_name
                                : column
                            }`}
                            className="flex items-center py-1"
                          >
                            <input
                              type="checkbox"
                              checked={selectedColumns.includes(
                                typeof column === "object"
                                  ? column.original_name
                                  : column
                              )}
                              onChange={() =>
                                toggleColumnSelection(
                                  typeof column === "object"
                                    ? column.original_name
                                    : column
                                )
                              }
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-900">
                              {typeof column === "object"
                                ? `${column.column_name} (${column.original_name})`
                                : column}
                            </span>
                          </label>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm">
                          No columns available
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Right column - Chart config and filters */}
            <div>
              {selectedSlot && selectedColumns.length > 0 && (
                <>
                  {/* Chart Configuration */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Chart Configuration
                    </label>
                    <div className="border border-gray-300 rounded-md p-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">
                            Chart Type
                          </label>
                          <select
                            value={chartConfig.type}
                            onChange={(e) =>
                              handleChartConfigChange("type", e.target.value)
                            }
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-gray-900"
                          >
                            <option key="chart-bar" value="bar">
                              Bar
                            </option>
                            <option key="chart-line" value="line">
                              Line
                            </option>
                            <option key="chart-pie" value="pie">
                              Pie
                            </option>
                            <option key="chart-scatter" value="scatter">
                              Scatter
                            </option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">
                            X-Axis
                          </label>
                          <select
                            value={chartConfig.xAxis}
                            onChange={(e) =>
                              handleChartConfigChange("xAxis", e.target.value)
                            }
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-gray-900"
                          >
                            <option value="">Select column</option>
                            {selectedColumns.map((column) => (
                              <option
                                key={`x-axis-${
                                  typeof column === "object"
                                    ? column.original_name
                                    : column
                                }`}
                                value={
                                  typeof column === "object"
                                    ? column.original_name
                                    : column
                                }
                              >
                                {typeof column === "object"
                                  ? `${column.column_name} (${column.original_name})`
                                  : column}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">
                            Y-Axis
                          </label>
                          <select
                            value={chartConfig.yAxis}
                            onChange={(e) =>
                              handleChartConfigChange("yAxis", e.target.value)
                            }
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-gray-900"
                          >
                            <option value="">Select column</option>
                            {selectedColumns.map((column) => (
                              <option
                                key={`y-axis-${
                                  typeof column === "object"
                                    ? column.original_name
                                    : column
                                }`}
                                value={
                                  typeof column === "object"
                                    ? column.original_name
                                    : column
                                }
                              >
                                {typeof column === "object"
                                  ? `${column.column_name} (${column.original_name})`
                                  : column}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Filters
                    </label>
                    <div className="border border-gray-300 rounded-md p-3 max-h-60 overflow-y-auto">
                      {selectedColumns.map((column) => (
                        <div
                          key={`filter-${column}`}
                          className="mb-3 last:mb-0"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {typeof column === "object"
                                ? `${column.column_name} (${column.original_name})`
                                : column}
                            </span>
                            <button
                              onClick={() =>
                                addFilter(
                                  typeof column === "object"
                                    ? column.original_name
                                    : column
                                )
                              }
                              className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                            >
                              Add Filter
                            </button>
                          </div>
                          {filters[
                            typeof column === "object"
                              ? column.original_name
                              : column
                          ] &&
                            filters[
                              typeof column === "object"
                                ? column.original_name
                                : column
                            ].length > 0 && (
                              <div className="ml-2 space-y-2">
                                {filters[
                                  typeof column === "object"
                                    ? column.original_name
                                    : column
                                ].map((filter, index) => (
                                  <div
                                    key={`filter-${
                                      typeof column === "object"
                                        ? column.original_name
                                        : column
                                    }-${index}`}
                                    className="flex gap-2 items-center"
                                  >
                                    <select
                                      value={filter.operator}
                                      onChange={(e) =>
                                        updateFilter(
                                          typeof column === "object"
                                            ? column.original_name
                                            : column,
                                          index,
                                          "operator",
                                          e.target.value
                                        )
                                      }
                                      className="text-xs border border-gray-300 rounded px-1 py-1"
                                    >
                                      <option value="=">=</option>
                                      <option value="!=">!=</option>
                                      <option value=">">&gt;</option>
                                      <option value="<">&lt;</option>
                                      <option value=">=">&gt;=</option>
                                      <option value="<=">&lt;=</option>
                                      <option value="contains">contains</option>
                                      <option value="in">in</option>
                                    </select>
                                    <input
                                      type="text"
                                      value={filter.value}
                                      onChange={(e) =>
                                        updateFilter(
                                          typeof column === "object"
                                            ? column.original_name
                                            : column,
                                          index,
                                          "value",
                                          e.target.value
                                        )
                                      }
                                      className="text-xs border border-gray-300 rounded px-1 py-1 flex-grow"
                                      placeholder="Value"
                                    />
                                    <button
                                      onClick={() =>
                                        removeFilter(
                                          typeof column === "object"
                                            ? column.original_name
                                            : column,
                                          index
                                        )
                                      }
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {selectedSlot && (
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleLoadView}
                disabled={loading || !selectedSlot}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium ${
                  loading || !selectedSlot
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                Load View
              </button>
              <button
                onClick={handleSaveView}
                disabled={loading}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium ${
                  loading
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
              >
                Save View
              </button>
              <button
                onClick={handleResetView}
                disabled={loading || !selectedSlot}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium ${
                  loading || !selectedSlot
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-gray-600 text-white hover:bg-gray-700"
                }`}
              >
                Reset View
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-md text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewManager;
