import React, { useState, useMemo, useEffect } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

/**
 * DynamicChartGenerator - A professional chart generator component
 *
 * Features:
 * - Dynamic column extraction from tableData
 * - Multiple chart types (Bar, Line, Area, Scatter, Pie)
 * - Automatic numeric column detection for Y-axis
 * - Smooth animations with Framer Motion
 * - Modern gradient styling with TailwindCSS
 * - Responsive design with professional appearance
 * - View management integration for saving charts
 */
const DynamicChartGenerator = ({
  tableData = [],
  onSaveView = null,
  currentChartView = null,
  onLoadView = null,
  selectedColumns = [], // Add selectedColumns prop for saved view columns
  filters = {}, // Add filters prop for filtered data
  generatedChart = null, // External chart state for persistence
  setGeneratedChart = null, // External chart state setter
}) => {
  // State management for chart configuration
  const [chartType, setChartType] = useState("bar");
  const [xAxisColumn, setXAxisColumn] = useState("");
  const [yAxisColumn, setYAxisColumn] = useState("");
  const [error, setError] = useState("");

  // View management state
  const [savedViews, setSavedViews] = useState([]);

  // Modern gradient color palette for professional appearance
  const colorPalette = {
    primary: "#8B5CF6", // Purple
    secondary: "#3B82F6", // Blue
    accent: "#10B981", // Green
    warning: "#F59E0B", // Amber
    success: "#10B981", // Emerald
    info: "#06B6D4", // Cyan
    danger: "#EF4444", // Red
    pie: [
      "#8B5CF6",
      "#3B82F6",
      "#10B981",
      "#F59E0B",
      "#EF4444",
      "#06B6D4",
      "#EC4899",
      "#8B5CF6",
    ],
  };

  // Helper function to determine if a column contains numeric data
  const isNumericColumn = (columnName) => {
    if (!tableData || tableData.length === 0) return false;

    // Check first 20 rows to determine if column is numeric (increased sample size)
    const sampleSize = Math.min(20, tableData.length);
    let numericCount = 0;
    let totalValidValues = 0;

    for (let i = 0; i < sampleSize; i++) {
      const value = tableData[i][columnName];
      if (value !== null && value !== undefined && value !== "") {
        totalValidValues++;
        const numValue = Number(value);
        if (!isNaN(numValue) && isFinite(numValue)) {
          numericCount++;
        }
      }
    }

    // Consider numeric if at least 80% of valid values are numeric and we have at least 3 valid values
    return totalValidValues >= 3 && numericCount / totalValidValues >= 0.8;
  };

  // Apply filters to the data
  const filteredData = useMemo(() => {
    if (!tableData || tableData.length === 0) {
      return [];
    }

    if (!filters || Object.keys(filters).length === 0) {
      return tableData;
    }

    // Debug: Log filters to console
    console.log("Applied filters:", filters);

    return tableData.filter((item) => {
      for (const [column, filterValue] of Object.entries(filters)) {
        // Skip global filter for now
        if (column === "_global") {
          continue;
        }

        if (
          filterValue &&
          Array.isArray(filterValue) &&
          filterValue.length > 0
        ) {
          const itemValue = item[column];

          // For DataTable multi-select filters, check if item value is in the filter array
          const matches = filterValue.some((value) => {
            return (
              String(itemValue).toLowerCase() === String(value).toLowerCase()
            );
          });

          if (!matches) {
            return false;
          }
        } else if (
          filterValue &&
          typeof filterValue === "string" &&
          filterValue.trim() !== ""
        ) {
          // For simple string filters
          const itemValue = item[column];
          const matches = String(itemValue)
            .toLowerCase()
            .includes(String(filterValue).toLowerCase());

          if (!matches) {
            return false;
          }
        }
      }

      // Handle global filter
      if (filters._global && filters._global.trim() !== "") {
        const globalSearchTerm = filters._global.toLowerCase();
        const matchesGlobal = Object.values(item).some((value) => {
          return String(value).toLowerCase().includes(globalSearchTerm);
        });

        if (!matchesGlobal) {
          return false;
        }
      }

      return true;
    });
  }, [tableData, filters]);

  // Debug: Log filtered data count
  console.log(
    "Filtered data count:",
    filteredData.length,
    "of",
    tableData.length
  );

  // Extract column names from filteredData or use selectedColumns from saved view
  const availableColumns = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];

    const firstRow = filteredData[0];
    let columnsToUse = [];

    // If selectedColumns are provided (from saved view), use only those columns
    if (selectedColumns && selectedColumns.length > 0) {
      columnsToUse = selectedColumns;
    } else {
      // Otherwise, use all available columns
      columnsToUse = Object.keys(firstRow);
    }

    return columnsToUse.map((key) => ({
      name: key,
      displayName:
        key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
      isNumeric: isNumericColumn(key),
    }));
  }, [filteredData, selectedColumns]);

  // Filter columns for X-axis (all columns except selected Y-axis)
  const xAxisOptions = useMemo(() => {
    return availableColumns.filter((col) => col.name !== yAxisColumn);
  }, [availableColumns, yAxisColumn]);

  // Filter columns for Y-axis (all columns except selected X-axis)
  const yAxisOptions = useMemo(() => {
    return availableColumns.filter((col) => col.name !== xAxisColumn);
  }, [availableColumns, xAxisColumn]);

  // Custom tooltip component for better UX
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / data.payload.total || 1) * 100).toFixed(
        1
      );

      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg max-w-xs"
        >
          <p className="font-semibold mb-1" style={{ color: "#000" }}>
            {data.payload.name}
          </p>
          <p className="text-sm text-black mb-1">
            Count: <span className="font-medium">{data.value}</span>
          </p>
          <p className="text-sm text-black">
            Percentage: <span className="font-medium">{percentage}%</span>
          </p>
        </motion.div>
      );
    }
    return null;
  };

  // Process data for chart generation
  const processChartData = () => {
    if (!filteredData || filteredData.length === 0) {
      setError("No data available for chart generation");
      return null;
    }

    if (!xAxisColumn) {
      setError("Please select an X-axis column");
      return null;
    }

    if (chartType !== "pie" && !yAxisColumn) {
      setError("Please select a Y-axis column for non-pie charts");
      return null;
    }

    setError("");

    try {
      let processedData = [];

      if (chartType === "pie") {
        // For pie charts, aggregate data by X-axis column
        const aggregatedData = {};
        filteredData.forEach((row) => {
          const category = row[xAxisColumn];
          if (category !== null && category !== undefined && category !== "") {
            aggregatedData[category] = (aggregatedData[category] || 0) + 1;
          }
        });

        // Sort by value (count) and take only top 10 categories
        const sortedEntries = Object.entries(aggregatedData)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10);

        // Calculate total for "Others" category
        const totalCount = Object.values(aggregatedData).reduce(
          (sum, count) => sum + count,
          0
        );
        const topCategoriesCount = sortedEntries.reduce(
          (sum, [, count]) => sum + count,
          0
        );
        const othersCount = totalCount - topCategoriesCount;

        processedData = sortedEntries.map(([name, value], index) => ({
          name: name.length > 20 ? name.substring(0, 20) + "..." : name, // Truncate long names
          value,
          total: totalCount,
          fill: colorPalette.pie[index % colorPalette.pie.length],
        }));

        // Add "Others" category if there are remaining items
        if (othersCount > 0) {
          processedData.push({
            name: `Others (${
              Object.keys(aggregatedData).length - 10
            } categories)`,
            value: othersCount,
            total: totalCount,
            fill: colorPalette.pie[10 % colorPalette.pie.length],
          });
        }
      } else {
        // For other chart types, use X and Y axis data
        processedData = filteredData
          .filter(
            (row) =>
              row[xAxisColumn] !== null &&
              row[xAxisColumn] !== undefined &&
              row[xAxisColumn] !== "" &&
              row[yAxisColumn] !== null &&
              row[yAxisColumn] !== undefined &&
              row[yAxisColumn] !== ""
          )
          .map((row) => {
            const yValue = Number(row[yAxisColumn]);
            return {
              name: String(row[xAxisColumn]),
              value: isNaN(yValue) ? 0 : yValue,
              [yAxisColumn]: isNaN(yValue) ? 0 : yValue,
            };
          })
          .filter((item) => item.value > 0); // Filter out zero values for better visualization

        // Limit data points for better performance and readability
        if (processedData.length > 50) {
          processedData = processedData.slice(0, 50);
        }
      }

      return processedData;
    } catch (err) {
      setError("Error processing chart data: " + err.message);
      return null;
    }
  };

  // Generate chart when button is clicked
  const handleGenerateChart = () => {
    const chartData = processChartData();
    if (chartData && setGeneratedChart) {
      setGeneratedChart({
        type: chartType,
        data: chartData,
        xAxis: xAxisColumn,
        yAxis: yAxisColumn,
      });
    }
  };

  // Clear chart function
  const handleClearChart = () => {
    if (setGeneratedChart) {
      setGeneratedChart(null);
    }
    setError("");
  };

  // Load saved view configuration
  useEffect(() => {
    if (currentChartView) {
      setChartType(currentChartView.type || "bar");
      setXAxisColumn(currentChartView.xAxis || "");
      setYAxisColumn(currentChartView.yAxis || "");
    }
  }, [currentChartView]);

  // Fetch saved views on component mount
  useEffect(() => {
    fetchSavedViews();
  }, []);

  // Fetch saved views (chart views only)
  const fetchSavedViews = async () => {
    try {
      const API_BASE = (window._env_ && window._env_.API_BASE) || "";
      const response = await fetch(`${API_BASE}/views`);
      if (response.ok) {
        const allViews = await response.json();
        // Filter to show only chart views
        const chartViews = allViews.filter(
          (view) =>
            view.view_type === "chart" ||
            (view.chart_config && view.chart_config !== "null")
        );
        setSavedViews(chartViews);
      }
    } catch (error) {
      console.error("Error fetching saved views:", error);
    }
  };

  // Load a saved view
  const handleLoadView = (view) => {
    if (view.chart_config) {
      try {
        const config = JSON.parse(view.chart_config);
        setChartType(config.type || "bar");
        setXAxisColumn(config.xAxis || "");
        setYAxisColumn(config.yAxis || "");
        if (onLoadView) {
          onLoadView(view);
        }
      } catch (error) {
        setError("Error loading view configuration");
      }
    }
  };

  // Render the appropriate chart component based on selected type
  const renderChart = () => {
    if (!generatedChart) return null;

    const { type, data } = generatedChart;
    const commonProps = {
      data: data,
      margin: { top: 20, right: 30, left: 20, bottom: 5 },
    };

    const chartComponents = {
      bar: (
        <ResponsiveContainer width="100%" height={500}>
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="name"
              stroke="#6B7280"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
            />
            <YAxis
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              dataKey="value"
              fill={colorPalette.primary}
              radius={[4, 4, 0, 0]}
              stroke={colorPalette.primary}
              strokeWidth={1}
              maxBarSize={50}
            />
          </BarChart>
        </ResponsiveContainer>
      ),

      line: (
        <ResponsiveContainer width="100%" height={500}>
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="name"
              stroke="#6B7280"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              stroke={colorPalette.secondary}
              strokeWidth={3}
              dot={{ fill: colorPalette.secondary, strokeWidth: 2, r: 6 }}
              activeDot={{
                r: 8,
                stroke: colorPalette.secondary,
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      ),

      area: (
        <ResponsiveContainer width="100%" height={500}>
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="name"
              stroke="#6B7280"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="value"
              stroke={colorPalette.accent}
              fill="url(#colorGradient)"
              strokeWidth={3}
            />
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={colorPalette.accent}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={colorPalette.accent}
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
          </AreaChart>
        </ResponsiveContainer>
      ),

      scatter: (
        <ResponsiveContainer width="100%" height={500}>
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="name"
              stroke="#6B7280"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              dataKey="value"
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Scatter
              dataKey="value"
              fill={colorPalette.warning}
              stroke={colorPalette.warning}
              strokeWidth={2}
              r={8}
            />
          </ScatterChart>
        </ResponsiveContainer>
      ),

      pie: (
        <ResponsiveContainer width="100%" height={500}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={false} // Disable labels on pie slices to avoid overlap
              outerRadius={120}
              innerRadius={40}
              fill="#8884d8"
              dataKey="value"
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              content={<CustomTooltip />}
              formatter={(value, name, props) => [value, props.payload.name]}
            />
            <Legend
              verticalAlign="bottom"
              height={Math.min(200, data.length * 20 + 40)} // Dynamic height based on data
              wrapperStyle={{
                paddingTop: "20px",
                fontSize: "12px",
                maxHeight: "200px",
                overflowY: "auto",
              }}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      ),
    };

    return chartComponents[type] || null;
  };

  // --- Default Chart Logic ---
  // Helper to get top 10 sites by a given numeric column
  const getTop10SitesByColumn = (columnName, label, color) => {
    if (!tableData || tableData.length === 0) return [];
    // Filter valid rows
    const validRows = tableData.filter((row) => {
      const val = Number(row[columnName]);
      return row["Site Name"] && !isNaN(val) && val > 0;
    });
    // Sort descending by column value
    const sorted = validRows.sort(
      (a, b) => Number(b[columnName]) - Number(a[columnName])
    );
    // Take top 10
    const top10 = sorted.slice(0, 10);
    // Format for recharts
    return top10.map((row) => ({
      name: row["Site Name"],
      value: Number(row[columnName]),
      label: label,
      color: color,
    }));
  };

  // Default chart data
  const top10GenCapacity = getTop10SitesByColumn(
    "Generation Headroom Mw",
    "Generation Capacity (MW)",
    colorPalette.primary
  );
  const top10ECRCapacity = getTop10SitesByColumn(
    "Total Ecr Capacity",
    "ECR Capacity (MW)",
    colorPalette.warning
  );

  // Default chart renderer
  const renderDefaultBarChart = (data, title, barColor) => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis
          dataKey="name"
          stroke="#6B7280"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          angle={-45}
          textAnchor="end"
          height={80}
          interval={0}
        />
        <YAxis
          stroke="#6B7280"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="value"
          fill={barColor}
          radius={[4, 4, 0, 0]}
          stroke={barColor}
          strokeWidth={1}
          maxBarSize={50}
        />
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      {/* Default Charts Section */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Top 10 Sites by Generation Capacity
          </h3>
          <p className="text-gray-600 mb-4">
            Sites with highest Generation Headroom (MW)
          </p>
          {top10GenCapacity.length > 0 ? (
            renderDefaultBarChart(
              top10GenCapacity,
              "Generation Capacity (MW)",
              colorPalette.primary
            )
          ) : (
            <div className="text-gray-500">No data available</div>
          )}
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Top 10 Sites by Total ECR Capacity
          </h3>
          <p className="text-gray-600 mb-4">
            Sites with highest Total ECR Capacity (MW)
          </p>
          {top10ECRCapacity.length > 0 ? (
            renderDefaultBarChart(
              top10ECRCapacity,
              "ECR Capacity (MW)",
              colorPalette.warning
            )
          ) : (
            <div className="text-gray-500">No data available</div>
          )}
        </div>
      </div>
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Dynamic Chart Generator
        </h2>
        <p className="text-gray-600">
          Create professional charts from your data with real-time visualization
        </p>
      </motion.div>

      {/* Applied Filters Display */}
      {filters && Object.keys(filters).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg"
        >
          <div className="flex items-center mb-3">
            <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
            <h3 className="text-orange-800 font-semibold">Applied Filters</h3>
          </div>
          <div className="space-y-2">
            {Object.entries(filters).map(([column, filterValue]) => {
              if (column === "_global") {
                return (
                  <div
                    key={column}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <span className="text-orange-700 font-medium">
                      Global Search:
                    </span>
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-md text-sm">
                      "{filterValue}"
                    </span>
                  </div>
                );
              }

              if (
                !filterValue ||
                (Array.isArray(filterValue) && filterValue.length === 0)
              )
                return null;

              return (
                <div key={column} className="flex flex-wrap items-center gap-2">
                  <span className="text-orange-700 font-medium">{column}:</span>
                  {Array.isArray(filterValue) ? (
                    filterValue.map((value, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-orange-100 text-orange-800 rounded-md text-sm"
                      >
                        {value}
                      </span>
                    ))
                  ) : (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-md text-sm">
                      {filterValue}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Data Summary */}
      {tableData && tableData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
              <span className="text-blue-800 font-medium">
                Dataset: {filteredData.length} of {tableData.length} records
                {filters && Object.keys(filters).length > 0 && (
                  <span className="ml-2 text-orange-600">(Filtered data)</span>
                )}
                {selectedColumns && selectedColumns.length > 0 && (
                  <span className="ml-2 text-blue-600">
                    • {selectedColumns.length} selected columns
                  </span>
                )}
              </span>
            </div>
            <button
              onClick={fetchSavedViews}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Refresh Saved Views
            </button>
          </div>
        </motion.div>
      )}

      {/* Saved Chart Views */}
      {savedViews.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 bg-white p-4 shadow-lg rounded-xl border border-gray-200"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Saved Chart Views
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {savedViews.map((view, index) => {
              let chartConfig = null;
              try {
                chartConfig = view.chart_config
                  ? JSON.parse(view.chart_config)
                  : null;
              } catch (e) {
                console.error("Error parsing chart config:", e);
              }

              return (
                <motion.div
                  key={view.id || index}
                  whileHover={{ scale: 1.02 }}
                  className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all cursor-pointer"
                  onClick={() => handleLoadView(view)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-800 truncate">
                      {view.name}
                    </h4>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      Slot {view.slot}
                    </span>
                  </div>
                  {chartConfig && (
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>
                        Type:{" "}
                        <span className="font-medium">{chartConfig.type}</span>
                      </div>
                      <div>
                        X-Axis:{" "}
                        <span className="font-medium">{chartConfig.xAxis}</span>
                      </div>
                      {chartConfig.yAxis && (
                        <div>
                          Y-Axis:{" "}
                          <span className="font-medium">
                            {chartConfig.yAxis}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Chart Configuration Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white p-6 shadow-lg rounded-2xl border border-gray-200 mb-6"
      >
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          Chart Configuration
        </h3>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm"
          >
            <div className="flex items-center">
              <svg
                className="w-4 h-4 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </div>
          </motion.div>
        )}

        {/* Configuration Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Chart Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chart Type
            </label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white transition-all duration-200"
            >
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="area">Area Chart</option>
              <option value="scatter">Scatter Plot</option>
              <option value="pie">Pie Chart</option>
            </select>
          </div>

          {/* X-Axis Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              X-Axis Column
            </label>
            <select
              value={xAxisColumn}
              onChange={(e) => setXAxisColumn(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white transition-all duration-200"
            >
              <option value="">Select column</option>
              {xAxisOptions.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Y-Axis Selection (hidden for pie charts) */}
          {chartType !== "pie" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Y-Axis Column
              </label>
              <select
                value={yAxisColumn}
                onChange={(e) => setYAxisColumn(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white transition-all duration-200"
              >
                <option value="">Select column</option>
                {yAxisOptions.map((col) => (
                  <option key={col.name} value={col.name}>
                    {col.displayName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Generate Button */}
          <div className="flex items-end space-x-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGenerateChart}
              disabled={!xAxisColumn || (chartType !== "pie" && !yAxisColumn)}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg shadow-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
            >
              Generate Chart
            </motion.button>

            {generatedChart && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleClearChart}
                className="px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg shadow-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 font-medium"
              >
                Clear Chart
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Chart Display Area */}
      <AnimatePresence mode="wait">
        {generatedChart && (
          <motion.div
            key={generatedChart.type}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="bg-white p-6 shadow-lg rounded-2xl border border-gray-200"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  {generatedChart.type.charAt(0).toUpperCase() +
                    generatedChart.type.slice(1)}{" "}
                  Chart
                </h3>
                <p className="text-gray-600 text-sm">
                  {generatedChart.type === "pie"
                    ? `Showing top ${Math.min(
                        10,
                        generatedChart.data?.length || 0
                      )} categories${
                        generatedChart.data?.length > 10
                          ? " (others grouped)"
                          : ""
                      }`
                    : `${
                        generatedChart.data?.length || 0
                      } data points displayed`}
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleClearChart}
                className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
              >
                ✕ Clear
              </motion.button>
            </div>

            {renderChart()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {(!tableData || tableData.length === 0) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gray-50 p-8 rounded-2xl border-2 border-dashed border-gray-300 text-center"
        >
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Data Available
          </h3>
          <p className="text-gray-500">
            Please provide tableData prop to generate charts
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default DynamicChartGenerator;
