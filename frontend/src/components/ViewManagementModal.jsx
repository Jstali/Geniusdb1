import React, { useState, useEffect } from "react";

const ViewManagementModal = ({
  isOpen,
  onClose,
  onLoadView,
  currentTableView,
  allColumns = [],
}) => {
  const [views, setViews] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [viewName, setViewName] = useState("");
  const [chartConfig, setChartConfig] = useState({
    type: "bar",
    xAxis: "",
    yAxis: "",
  });
  // Remove filters state - we'll display table filters instead
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Get API base URL from environment or default to localhost:8000
  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

  // Fetch saved views when component mounts
  useEffect(() => {
    if (isOpen) {
      fetchViews();
    }
  }, [isOpen]);

  // Pre-fill with current table selection when slot changes
  useEffect(() => {
    if (selectedSlot && isOpen) {
      // Check if this slot has a saved view
      const savedView = views.find(
        (view) => view.slot === parseInt(selectedSlot)
      );

      if (savedView) {
        // Pre-fill with saved view data
        setViewName(savedView.name || `View ${selectedSlot}`);

        try {
          setChartConfig(
            savedView.chart_config
              ? JSON.parse(savedView.chart_config)
              : {
                  type: "bar",
                  xAxis: "",
                  yAxis: "",
                }
          );
        } catch (e) {
          setChartConfig({
            type: "bar",
            xAxis: "",
            yAxis: "",
          });
        }

        // Filters will be handled by the table component
      } else {
        // Reset to defaults
        setViewName(`View ${selectedSlot}`);
        setChartConfig({
          type: "bar",
          xAxis: "",
          yAxis: "",
        });
        // Filters will be handled by the table component
      }
    }
  }, [selectedSlot, isOpen, views]);

  const fetchViews = async () => {
    try {
      setLoading(true);
      // Use fetch instead of axios to match other components
      const response = await fetch(`${API_BASE}/api/user/views`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setViews(data.views || []);
      setLoading(false);
    } catch (err) {
      setError("Failed to fetch views: " + err.message);
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
      const response = await fetch(
        `${API_BASE}/api/user/views/${selectedSlot}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      // Parse all saved configurations
      const savedFilters = data.filters ? JSON.parse(data.filters) : {};
      const savedChartConfig = data.chart_config ? JSON.parse(data.chart_config) : { type: "bar", xAxis: "", yAxis: "" };
      const savedMapConfig = data.map_config ? JSON.parse(data.map_config) : { locationColumn: "Site Name", showMarkers: true, markerFilter: [] };
      const savedSortConfig = data.sort_config ? JSON.parse(data.sort_config) : { sortBy: [], sortDirection: "asc" };
      const savedPaginationConfig = data.pagination_config ? JSON.parse(data.pagination_config) : { pageSize: 10, currentPage: 1 };

      // Apply the loaded view configuration with all saved state
      onLoadView({
        tableView: {
          selectedColumns: data.selected_columns ? data.selected_columns.split(",") : [],
          filters: savedFilters,
          sortBy: savedSortConfig.sortBy,
          sortDirection: savedSortConfig.sortDirection,
          pageSize: savedPaginationConfig.pageSize,
          currentPage: savedPaginationConfig.currentPage,
        },
        chartView: savedChartConfig,
        mapView: savedMapConfig,
        viewName: data.name || `View ${selectedSlot}`,
      });

      setSuccess("View loaded successfully");
      setTimeout(() => {
        setSuccess("");
        onClose();
      }, 1500);
    } catch (err) {
      setError("Failed to load view: " + err.message);
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

    // Get selected columns from the current table view
    const selectedColumns = currentTableView?.selectedColumns || [];

    if (selectedColumns.length === 0) {
      setError(
        "Please select at least one column in the table before saving a view"
      );
      return;
    }

    // Validate chart configuration
    if (!validateChartConfig(selectedColumns)) {
      setError(
        "Invalid chart configuration. Please check your axis selections."
      );
      return;
    }

    // Filters will be handled by the table component - no validation needed

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      // Build enhanced payload with all required state
      const payload = {
        name: viewName,
        selected_columns: selectedColumns.join(","),
        chart_config: JSON.stringify(chartConfig), // Store as JSON string
        filters: JSON.stringify(currentTableView?.filters || {}), // Store as JSON string
        map_config: JSON.stringify({
          locationColumn: "Site Name", // Default location column for map
          showMarkers: true,
          markerFilter: selectedColumns // Only show markers for selected columns
        }),
        sort_config: JSON.stringify({
          sortBy: currentTableView?.sortBy || [],
          sortDirection: currentTableView?.sortDirection || "asc"
        }),
        pagination_config: JSON.stringify({
          pageSize: currentTableView?.pageSize || 10,
          currentPage: currentTableView?.currentPage || 1
        })
      };

      console.log("Saving view with payload:", payload);

      const response = await fetch(
        `${API_BASE}/api/user/views/${selectedSlot}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      // Refresh views list
      await fetchViews();
      setSuccess("View saved successfully");

      // Keep modal open but show success message
      setTimeout(() => {
        setSuccess("");
      }, 3000);

      setLoading(false);

      // Notify parent component that view was saved
      if (onLoadView) {
        onLoadView({
        tableView: {
          selectedColumns: selectedColumns,
          filters: currentTableView?.filters || {},
        },
          chartView: chartConfig,
        });
      }
    } catch (err) {
      setError("Failed to save view: " + err.message);
      setLoading(false);
      console.error("Error saving view:", err);
    }
  };

  // Filter validation removed - filters are handled by table component

  // Validate chart configuration
  const validateChartConfig = (selectedColumns) => {
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
      const response = await fetch(
        `${API_BASE}/api/user/views/${selectedSlot}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Refresh views list
      await fetchViews();
      setChartConfig({ type: "bar", xAxis: "", yAxis: "" });
      // Filters will be handled by the table component
      setViewName("");
      setSuccess("View reset successfully");
      setTimeout(() => {
        setSuccess("");
      }, 1500);
      setLoading(false);
    } catch (err) {
      setError("Failed to reset view: " + err.message);
      setLoading(false);
      console.error("Error resetting view:", err);
    }
  };

  const handleChartConfigChange = (field, value) => {
    // Get selected columns from the current table view
    const selectedColumns = currentTableView?.selectedColumns || [];

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

  // Remove filter management functions - filters will come from table

  if (!isOpen) return null;

  // Get selected columns from the current table view
  const selectedColumns = currentTableView?.selectedColumns || [];

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              View Management
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

          {/* Initial view - only show dropdown and buttons */}
          {!selectedSlot ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select View Slot
                </label>
                <select
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  disabled={loading}
                >
                  <option value="">Choose a view slot</option>
                  {[1, 2, 3, 4, 5].map((slot) => (
                    <option key={slot} value={slot}>
                      View {slot}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3">
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
            </div>
          ) : (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select View Slot
                </label>
                <select
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  disabled={loading}
                >
                  <option value="">Choose a view slot</option>
                  {[1, 2, 3, 4, 5].map((slot) => (
                    <option key={slot} value={slot}>
                      View {slot}
                    </option>
                  ))}
                </select>
              </div>

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

              {/* Preview of selected columns from table */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Selected Columns ({selectedColumns.length})
                  </label>
                </div>
                <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto">
                  {selectedColumns.length > 0 ? (
                    selectedColumns.map((column) => (
                      <div key={column} className="py-1 text-sm text-gray-900">
                        {column}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">
                      No columns selected in the table
                    </p>
                  )}
                </div>
              </div>

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
                        <option value="bar">Bar</option>
                        <option value="line">Line</option>
                        <option value="pie">Pie</option>
                        <option value="scatter">Scatter</option>
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
                          <option key={`x-${column}`} value={column}>
                            {column}
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
                          <option key={`y-${column}`} value={column}>
                            {column}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Table Filters - Display Only */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Table Filters
                </label>
                <div className="border border-gray-300 rounded-md p-3">
                  {currentTableView?.filters && Object.keys(currentTableView.filters).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(currentTableView.filters).map(([column, filterValues]) => (
                        <div key={column} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium text-gray-900">{column}</span>
                          <span className="text-sm text-gray-600">
                            {Array.isArray(filterValues) ? filterValues.join(", ") : filterValues}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No filters applied in the table</p>
                  )}
                </div>
              </div>

              <div className="flex space-x-3">
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewManagementModal;
