import React, { useState, useMemo, useEffect } from "react";
import Plot from "react-plotly.js";

const ModernChartBuilder = ({
  data,
  columns,
  selectedColumns = [],
  filters = {},
  chartType,
  xAxis,
  yAxis,
}) => {
  const [chartTypeState, setChartTypeState] = useState(chartType || "bar");
  const [xAxisState, setXAxisState] = useState(xAxis || "");
  const [yAxisState, setYAxisState] = useState(yAxis || "");
  const [generatedChart, setGeneratedChart] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState(data || []);
  const [chartColumns, setChartColumns] = useState(columns || []);

  // Modern color palette matching the design
  const modernColors = {
    primary: "#8B5CF6", // Purple
    secondary: "#3B82F6", // Blue
    accent: "#10B981", // Green
    gradient: {
      purple: ["#8B5CF6", "#A855F7", "#C084FC"],
      blue: ["#3B82F6", "#60A5FA", "#93C5FD"],
      green: ["#10B981", "#34D399", "#6EE7B7"],
    }
  };

  // Modern chart layout configuration
  const getModernLayout = (title, xTitle = "", yTitle = "") => ({
    title: {
      text: title,
      font: {
        family: "Inter, sans-serif",
        size: 18,
        color: "#1F2937"
      },
      x: 0.05,
      y: 0.95,
      xanchor: "left"
    },
    font: {
      family: "Inter, sans-serif",
      size: 12,
      color: "#6B7280"
    },
    plot_bgcolor: "#FAFAFA",
    paper_bgcolor: "#FFFFFF",
    margin: { l: 60, r: 30, t: 80, b: 60 },
    xaxis: {
      title: {
        text: xTitle,
        font: { size: 14, color: "#374151" }
      },
      gridcolor: "#E5E7EB",
      linecolor: "#D1D5DB",
      zeroline: false,
      showgrid: true
    },
    yaxis: {
      title: {
        text: yTitle,
        font: { size: 14, color: "#374151" }
      },
      gridcolor: "#E5E7EB",
      linecolor: "#D1D5DB",
      zeroline: false,
      showgrid: true
    },
    legend: {
      font: { size: 12, color: "#6B7280" },
      bgcolor: "rgba(255, 255, 255, 0.8)",
      bordercolor: "#E5E7EB",
      borderwidth: 1
    },
    showlegend: true,
    hoverlabel: {
      bgcolor: "#FFFFFF",
      bordercolor: "#E5E7EB",
      font: { color: "#374151" }
    }
  });

  // Apply filters to the data
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }

    if (!filters || Object.keys(filters).length === 0) {
      return data;
    }

    return data.filter((item) => {
      for (const [column, columnFilters] of Object.entries(filters)) {
        if (columnFilters && columnFilters.length > 0) {
          const itemValue = item[column];

          const matches = columnFilters.some((filter) => {
            const { operator, value } = filter;

            switch (operator) {
              case "=":
                return String(itemValue) === String(value);
              case "!=":
                return String(itemValue) !== String(value);
              case ">":
                return Number(itemValue) > Number(value);
              case "<":
                return Number(itemValue) < Number(value);
              case ">=":
                return Number(itemValue) >= Number(value);
              case "<=":
                return Number(itemValue) <= Number(value);
              case "contains":
                return String(itemValue)
                  .toLowerCase()
                  .includes(String(value).toLowerCase());
              case "in":
                return String(value)
                  .split(",")
                  .map((v) => v.trim())
                  .includes(String(itemValue));
              default:
                return true;
            }
          });

          if (!matches) {
            return false;
          }
        }
      }

      return true;
    });
  }, [data, filters]);

  // Apply selected columns to the data
  const viewFilteredData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) {
      return [];
    }

    if (!selectedColumns || selectedColumns.length === 0) {
      return filteredData;
    }

    return filteredData.map((item) => {
      const newItem = {};
      selectedColumns.forEach((col) => {
        newItem[col] = item[col];
      });
      return newItem;
    });
  }, [filteredData, selectedColumns]);

  // Update state when props change
  useEffect(() => {
    if (chartType) setChartTypeState(chartType);
    if (xAxis) setXAxisState(xAxis);
    if (yAxis) setYAxisState(yAxis);
  }, [chartType, xAxis, yAxis]);

  // Fetch data from the database when component mounts
  useEffect(() => {
    if (!data || data.length === 0) {
      fetchData();
    } else if (data && data.length > 0) {
      setChartData(viewFilteredData);
      if (!columns || columns.length === 0) {
        const generatedColumns = Object.keys(viewFilteredData[0]).map((key) => ({
          accessorKey: key,
          header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
        }));
        setChartColumns(generatedColumns);
      } else {
        if (selectedColumns && selectedColumns.length > 0) {
          const filteredColumns = columns.filter((col) =>
            selectedColumns.includes(col.accessorKey)
          );
          setChartColumns(filteredColumns);
        } else {
          setChartColumns(columns || []);
        }
      }
    }
  }, [data, columns, viewFilteredData, selectedColumns]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const API_BASE = (window._env_ && window._env_.API_BASE) || "";
      
      const processResponse = await fetch(`${API_BASE}/process/transformers`);
      if (!processResponse.ok) {
        throw new Error(`HTTP error while processing data! status: ${processResponse.status}`);
      }
      const processResult = await processResponse.json();
      if (processResult.status === "error") {
        throw new Error(processResult.message);
      }

      const response = await fetch(`${API_BASE}/data/transformers`);
      if (!response.ok) {
        throw new Error(`HTTP error while fetching data! status: ${response.status}`);
      }
      const jsonData = await response.json();

      setChartData(jsonData);

      if (jsonData && jsonData.length > 0) {
        const generatedColumns = Object.keys(jsonData[0]).map((key) => ({
          accessorKey: key,
          header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
        }));
        setChartColumns(generatedColumns);
      }
    } catch (err) {
      setError("Error fetching data: " + err.message);
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Get column options based on saved view configuration
  const columnOptions = useMemo(() => {
    if (selectedColumns && selectedColumns.length > 0) {
      const filteredColumns = chartColumns.filter((col) =>
        selectedColumns.includes(col.accessorKey)
      );
      return filteredColumns;
    }

    if (chartColumns && chartColumns.length > 0) {
      return chartColumns.map((col) => ({
        accessorKey: col.accessorKey,
        header: col.header,
      }));
    } else if (chartData && chartData.length > 0) {
      return Object.keys(chartData[0]).map((key) => ({
        accessorKey: key,
        header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
      }));
    }
    return [];
  }, [chartData, chartColumns, selectedColumns]);

  // Filter column options for X axis
  const xColumnOptions = useMemo(() => {
    if (!yAxisState) {
      return columnOptions;
    }
    return columnOptions.filter((col) => col.accessorKey !== yAxisState);
  }, [columnOptions, yAxisState]);

  // Filter column options for Y axis
  const yColumnOptions = useMemo(() => {
    if (!xAxisState) {
      return columnOptions;
    }
    return columnOptions.filter((col) => col.accessorKey !== xAxisState);
  }, [columnOptions, xAxisState]);

  // Handle chart generation with modern styling
  const generateChart = async () => {
    if (selectedColumns && selectedColumns.length < 2) {
      setError("Not enough columns in this view to generate a chart.");
      return;
    }

    if (!xAxisState) {
      setError("Please select both X and Y axes from the saved columns.");
      return;
    }

    if (!yAxisState && chartTypeState !== "pie") {
      setError("Please select both X and Y axes from the saved columns.");
      return;
    }

    if (chartTypeState === "pie" && !xAxisState) {
      setError("Please select a category for pie chart");
      return;
    }

    setError("");

    try {
      let chartDataToUse = chartData;
      
      if (Object.keys(filters).length > 0 || !chartData || chartData.length === 0) {
        // Use dedicated chart-data endpoint if available
        chartDataToUse = await fetchChartData(xAxisState, yAxisState, chartTypeState, filters);
      }

      if (!chartDataToUse || chartDataToUse.length === 0) {
        setError("No data available to chart");
        return;
      }

      const xColumn = columnOptions.find((col) => col.accessorKey === xAxisState);
      const yColumn = columnOptions.find((col) => col.accessorKey === yAxisState);

      const xKey = xColumn ? xColumn.accessorKey : xAxisState;
      const yKey = yColumn ? yColumn.accessorKey : yAxisState;

      let xValues = chartDataToUse.map((item) => item[xKey]);
      let yValues = chartTypeState !== "pie" ? chartDataToUse.map((item) => item[yKey]) : null;

      if (yValues) {
        yValues = yValues.map((val) => {
          const num = parseFloat(val);
          return isNaN(num) ? val : num;
        });
      }

      let chartConfig = {};

      switch (chartTypeState) {
        case "bar":
          chartConfig = {
            data: [
              {
                x: xValues,
                y: yValues,
                type: "bar",
                marker: {
                  color: modernColors.primary,
                  line: { color: "#7C3AED", width: 1 }
                },
                name: yColumn?.header || yAxisState,
                hovertemplate: `<b>%{x}</b><br>${yColumn?.header || yAxisState}: %{y}<extra></extra>`
              },
            ],
            layout: getModernLayout(
              `${yColumn?.header || yAxisState} by ${xColumn?.header || xAxisState}`,
              xColumn?.header || xAxisState,
              yColumn?.header || yAxisState
            ),
          };
          break;

        case "line":
          chartConfig = {
            data: [
              {
                x: xValues,
                y: yValues,
                type: "scatter",
                mode: "lines+markers",
                marker: { 
                  color: modernColors.secondary,
                  size: 8,
                  line: { color: "#2563EB", width: 2 }
                },
                line: { 
                  color: modernColors.secondary,
                  width: 3,
                  shape: "smooth"
                },
                name: yColumn?.header || yAxisState,
                hovertemplate: `<b>%{x}</b><br>${yColumn?.header || yAxisState}: %{y}<extra></extra>`
              },
            ],
            layout: getModernLayout(
              `${yColumn?.header || yAxisState} by ${xColumn?.header || xAxisState}`,
              xColumn?.header || xAxisState,
              yColumn?.header || yAxisState
            ),
          };
          break;

        case "scatter":
          chartConfig = {
            data: [
              {
                x: xValues,
                y: yValues,
                type: "scatter",
                mode: "markers",
                marker: {
                  color: modernColors.accent,
                  size: 12,
                  line: { color: "#059669", width: 2 },
                  opacity: 0.8
                },
                name: yColumn?.header || yAxisState,
                hovertemplate: `<b>%{x}</b><br>${yColumn?.header || yAxisState}: %{y}<extra></extra>`
              },
            ],
            layout: getModernLayout(
              `${yColumn?.header || yAxisState} by ${xColumn?.header || xAxisState}`,
              xColumn?.header || xAxisState,
              yColumn?.header || yAxisState
            ),
          };
          break;

        case "pie":
          const aggregatedData = {};
          xValues.forEach((x, i) => {
            if (!aggregatedData[x]) {
              aggregatedData[x] = 0;
            }
            const yVal = chartDataToUse[i][yKey];
            if (yVal !== undefined && yVal !== null) {
              const num = parseFloat(yVal);
              if (!isNaN(num)) {
                aggregatedData[x] += num;
              } else {
                aggregatedData[x] += 1;
              }
            } else {
              aggregatedData[x] += 1;
            }
          });

          chartConfig = {
            data: [
              {
                labels: Object.keys(aggregatedData),
                values: Object.values(aggregatedData),
                type: "pie",
                marker: {
                  colors: [
                    modernColors.primary,
                    modernColors.secondary,
                    modernColors.accent,
                    "#F59E0B",
                    "#EF4444",
                    "#06B6D4",
                    "#EC4899",
                    "#8B5CF6"
                  ],
                  line: { color: "#FFFFFF", width: 2 }
                },
                textinfo: "label+percent",
                textposition: "outside",
                hovertemplate: "<b>%{label}</b><br>Value: %{value}<br>Percentage: %{percent}<extra></extra>"
              },
            ],
            layout: {
              ...getModernLayout(`Distribution of ${xColumn?.header || xAxisState}`),
              showlegend: true,
              legend: {
                orientation: "v",
                x: 1.05,
                y: 0.5
              }
            },
          };
          break;

        case "area":
          chartConfig = {
            data: [
              {
                x: xValues,
                y: yValues,
                type: "scatter",
                mode: "lines",
                fill: "tonexty",
                line: { 
                  color: modernColors.primary,
                  width: 3,
                  shape: "smooth"
                },
                fillcolor: `rgba(139, 92, 246, 0.3)`,
                name: yColumn?.header || yAxisState,
                hovertemplate: `<b>%{x}</b><br>${yColumn?.header || yAxisState}: %{y}<extra></extra>`
              },
            ],
            layout: getModernLayout(
              `${yColumn?.header || yAxisState} by ${xColumn?.header || xAxisState}`,
              xColumn?.header || xAxisState,
              yColumn?.header || yAxisState
            ),
          };
          break;

        default:
          chartConfig = {
            data: [
              {
                x: xValues,
                y: yValues,
                type: "bar",
                marker: { color: modernColors.primary },
              },
            ],
            layout: getModernLayout(
              `${yColumn?.header || yAxisState} by ${xColumn?.header || xAxisState}`,
              xColumn?.header || xAxisState,
              yColumn?.header || yAxisState
            ),
          };
      }

      setGeneratedChart(chartConfig);
    } catch (error) {
      console.error("Error generating chart:", error);
      setError("Failed to generate chart: " + error.message);
    }
  };

  // Fetch chart data using dedicated endpoint
  const fetchChartData = async (xAxis, yAxis, chartType, filters = {}) => {
    try {
      setLoading(true);
      setError("");

      const requestBody = {
        x_axis: xAxis,
        y_axis: yAxis,
        chart_type: chartType,
        filters: filters
      };

      const API_BASE = (window._env_ && window._env_.API_BASE) || "";
      const response = await fetch(`${API_BASE}/data/chart-data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error while fetching chart data! status: ${response.status}, message: ${errorText}`
        );
      }

      const chartResult = await response.json();

      if (chartResult.error) {
        throw new Error(chartResult.error);
      }

      return chartResult.data;
    } catch (err) {
      setError("Error fetching chart data: " + err.message);
      console.error("Error fetching chart data:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate chart when configuration changes
  useEffect(() => {
    if (chartType && xAxis && yAxis) {
      setChartTypeState(chartType);
      setXAxisState(xAxis);
      setYAxisState(yAxis);
    }

    if (
      chartTypeState &&
      (xAxisState || chartTypeState === "pie") &&
      (yAxisState || chartTypeState === "pie")
    ) {
      generateChart();
    }
  }, [
    chartType,
    xAxis,
    yAxis,
    chartTypeState,
    xAxisState,
    yAxisState,
    selectedColumns,
  ]);

  return (
    <div className="w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-1">Chart Builder</h2>
        <p className="text-sm text-gray-600">
          Create modern, interactive charts from your data
        </p>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* Validation message for insufficient columns */}
        {selectedColumns &&
          selectedColumns.length > 0 &&
          selectedColumns.length < 2 && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg text-sm">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Not enough columns in this view to generate a chart.
              </div>
            </div>
          )}

        {/* Chart Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chart Type
            </label>
            <select
              value={chartTypeState}
              onChange={(e) => setChartTypeState(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
            >
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="area">Area Chart</option>
              <option value="scatter">Scatter Plot</option>
              <option value="pie">Pie Chart</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              X-Axis
            </label>
            <select
              value={xAxisState}
              onChange={(e) => setXAxisState(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
              disabled={
                selectedColumns &&
                selectedColumns.length > 0 &&
                selectedColumns.length < 2
              }
            >
              <option value="" className="text-gray-500">Select column</option>
              {xColumnOptions.map((col) => (
                <option key={col.accessorKey} value={col.accessorKey} className="text-gray-900">
                  {col.header}
                </option>
              ))}
            </select>
          </div>

          {chartTypeState !== "pie" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Y-Axis
              </label>
              <select
                value={yAxisState}
                onChange={(e) => setYAxisState(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
                disabled={
                  selectedColumns &&
                  selectedColumns.length > 0 &&
                  selectedColumns.length < 2
                }
              >
                <option value="" className="text-gray-500">Select column</option>
                {yColumnOptions.map((col) => (
                  <option key={col.accessorKey} value={col.accessorKey} className="text-gray-900">
                    {col.header}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-end">
            <button
              onClick={generateChart}
              disabled={
                loading ||
                (selectedColumns &&
                  selectedColumns.length > 0 &&
                  selectedColumns.length < 2)
              }
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg shadow-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </div>
              ) : (
                "Generate Chart"
              )}
            </button>
          </div>
        </div>

        {/* Chart Display */}
        {generatedChart && (
          <div className="mt-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
            <Plot
              data={generatedChart.data}
              layout={generatedChart.layout}
              style={{ width: "100%", height: "500px" }}
              config={{ 
                responsive: true,
                displayModeBar: true,
                displaylogo: false,
                modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d']
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernChartBuilder;
