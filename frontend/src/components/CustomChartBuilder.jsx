import React, { useState, useMemo, useEffect } from "react";
import Plot from "react-plotly.js";

const CustomChartBuilder = ({
  data,
  columns,
  selectedColumns = [],
  filters = {},
  chartType, // Add this prop
  xAxis, // Add this prop
  yAxis, // Add this prop
}) => {
  const [chartTypeState, setChartTypeState] = useState(chartType || "bar");
  const [xAxisState, setXAxisState] = useState(xAxis || "");
  const [yAxisState, setYAxisState] = useState(yAxis || "");

  // Effect to handle saved view configuration changes
  useEffect(() => {
    console.log("=== CustomChartBuilder: useEffect for saved view ===");
    console.log("chartType:", chartType);
    console.log("xAxis:", xAxis);
    console.log("yAxis:", yAxis);

    // Update chart configuration when saved view is loaded
    if (chartType) {
      setChartTypeState(chartType);
    }
    if (xAxis) {
      setXAxisState(xAxis);
    }
    if (yAxis) {
      setYAxisState(yAxis);
    }

    // Auto-generate chart if we have a complete configuration
    if (chartType && xAxis && (yAxis || chartType === "pie")) {
      console.log("Auto-generating chart with saved configuration");
      // Delay slightly to ensure state updates are processed
      setTimeout(() => {
        generateChart();
      }, 100);
    }
  }, [chartType, xAxis, yAxis]);
  const [generatedChart, setGeneratedChart] = useState(null);
  const [error, setError] = useState("");
  const [presetChart, setPresetChart] = useState(""); // For predefined charts
  const [chartData, setChartData] = useState(data || []); // Local data state
  const [chartColumns, setChartColumns] = useState(columns || []); // Local columns state
  const [loading, setLoading] = useState(false); // Loading state for data fetching

  // Update state when props change
  useEffect(() => {
    if (chartType) setChartTypeState(chartType);
    if (xAxis) setXAxisState(xAxis);
    if (yAxis) setYAxisState(yAxis);
  }, [chartType, xAxis, yAxis]);

  // Apply filters to the data
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }

    // If no filters, return the data as is
    if (!filters || Object.keys(filters).length === 0) {
      return data;
    }

    // Apply filters from the view configuration
    return data.filter((item) => {
      // Apply filters from the view configuration
      for (const [column, columnFilters] of Object.entries(filters)) {
        if (columnFilters && columnFilters.length > 0) {
          const itemValue = item[column];

          // Check if any filter matches
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

    // If no selected columns, return the filtered data as is
    if (!selectedColumns || selectedColumns.length === 0) {
      return filteredData;
    }

    // Return only the selected columns
    return filteredData.map((item) => {
      const newItem = {};
      selectedColumns.forEach((col) => {
        newItem[col] = item[col];
      });
      return newItem;
    });
  }, [filteredData, selectedColumns]);

  // Fetch data from the database when component mounts and no data is provided
  useEffect(() => {
    console.log("CustomChartBuilder: useEffect triggered");
    // Only fetch data if none was provided via props or if provided data is empty
    if (!data || data.length === 0) {
      console.log(
        "CustomChartBuilder: No data provided or empty data, fetching from database"
      );
      fetchData();
    } else if (data && data.length > 0) {
      // Use provided data
      console.log("CustomChartBuilder: Using provided data");
      setChartData(viewFilteredData);
      // Generate columns from the provided data if columns aren't provided
      if (!columns || columns.length === 0) {
        const generatedColumns = Object.keys(viewFilteredData[0]).map(
          (key) => ({
            accessorKey: key,
            header:
              key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
          })
        );
        console.log(
          "CustomChartBuilder: Generated columns from data:",
          generatedColumns
        );
        setChartColumns(generatedColumns);
      } else {
        // Filter columns to only include selected columns
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
      console.log("CustomChartBuilder: Starting data fetch from database...");

      // First, trigger the data processing script
      const processResponse = await fetch("/process/transformers");
      if (!processResponse.ok) {
        throw new Error(
          `HTTP error while processing data! status: ${processResponse.status}`
        );
      }
      const processResult = await processResponse.json();
      if (processResult.status === "error") {
        throw new Error(processResult.message);
      }
      console.log("Data processing result:", processResult);

      // Then fetch the transformer data from the backend API
      const response = await fetch("/data/transformers");
      if (!response.ok) {
        throw new Error(
          `HTTP error while fetching data! status: ${response.status}`
        );
      }
      const jsonData = await response.json();
      console.log("Fetched transformer data:", jsonData.length, "records");
      console.log("Sample data:", jsonData.slice(0, 3));

      // Set the transformer data directly
      setChartData(jsonData);

      // Generate columns from the data
      if (jsonData && jsonData.length > 0) {
        const generatedColumns = Object.keys(jsonData[0]).map((key) => ({
          accessorKey: key,
          header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
        }));
        console.log("CustomChartBuilder: Generated columns:", generatedColumns);
        setChartColumns(generatedColumns);
      }

      console.log("CustomChartBuilder: Data fetch completed successfully");
    } catch (err) {
      setError("CustomChartBuilder: Error fetching data: " + err.message);
      console.error("CustomChartBuilder: Error fetching data:", err);
    } finally {
      setLoading(false);
      console.log("CustomChartBuilder: Loading state set to false");
    }
  };

  // New function to fetch chart data using the dedicated endpoint
  const fetchChartData = async (xAxis, yAxis, chartType, filters = {}) => {
    try {
      setLoading(true);
      setError("");
      console.log("CustomChartBuilder: Fetching chart data with parameters:", {
        xAxis,
        yAxis,
        chartType,
        filters
      });

      const requestBody = {
        x_axis: xAxis,
        y_axis: yAxis,
        chart_type: chartType,
        filters: filters
      };

      const response = await fetch("/api/chart-data", {
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
      console.log("Chart data fetch result:", chartResult);

      if (chartResult.error) {
        throw new Error(chartResult.error);
      }

      return chartResult.data;
    } catch (err) {
      setError("CustomChartBuilder: Error fetching chart data: " + err.message);
      console.error("CustomChartBuilder: Error fetching chart data:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Debug: Log the data and columns
  React.useEffect(() => {
    console.log("=== CustomChartBuilder Debug Info ===");
    console.log("Props data:", data);
    console.log("Props columns:", columns);
    console.log("Local chartData:", chartData);
    console.log("Local chartColumns:", chartColumns);
    console.log("Data length:", chartData ? chartData.length : "No data");
    console.log(
      "Columns length:",
      chartColumns ? chartColumns.length : "No columns"
    );
    console.log("Preset chart selected:", presetChart);
    console.log("Selected columns:", selectedColumns);
    console.log("Filters:", filters);
    console.log("Chart type:", chartTypeState);
    console.log("X axis:", xAxisState);
    console.log("Y axis:", yAxisState);

    // Log first few items of data if available
    if (chartData && chartData.length > 0) {
      console.log("First data item:", chartData[0]);
      console.log("Data keys:", Object.keys(chartData[0]));
    }

    // Log first few columns if available
    if (chartColumns && chartColumns.length > 0) {
      console.log("First column:", chartColumns[0]);
      console.log("All columns:", chartColumns);
    }

    console.log("=====================================");
  }, [
    data,
    columns,
    chartData,
    chartColumns,
    presetChart,
    selectedColumns,
    filters,
    chartTypeState,
    xAxisState,
    yAxisState,
  ]);

  // Get column options based on saved view configuration
  const columnOptions = useMemo(() => {
    console.log("=== Column Options Generation ===");
    console.log("chartColumns:", chartColumns);
    console.log("chartData:", chartData);
    console.log("selectedColumns:", selectedColumns);

    // If selectedColumns is provided (saved view loaded), only show those columns
    if (selectedColumns && selectedColumns.length > 0) {
      console.log("Using selectedColumns from saved view");
      // Filter chartColumns to only include selected columns
      const filteredColumns = chartColumns.filter((col) =>
        selectedColumns.includes(col.accessorKey)
      );
      console.log("Filtered column options:", filteredColumns);
      console.log("===============================");
      return filteredColumns;
    }

    // If no selected columns (no saved view), show all columns
    if (chartColumns && chartColumns.length > 0) {
      console.log("Using all chartColumns (no saved view)");
      const result = chartColumns.map((col) => ({
        accessorKey: col.accessorKey,
        header: col.header,
      }));
      console.log("Generated column options:", result);
      console.log("===============================");
      return result;
    } else if (chartData && chartData.length > 0) {
      // Fallback to deriving from data keys
      console.log("Deriving columns from chartData keys");
      const result = Object.keys(chartData[0]).map((key) => ({
        accessorKey: key,
        header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
      }));
      console.log("Derived column options:", result);
      console.log("===============================");
      return result;
    }
    console.log("No columns or data available");
    console.log("===============================");
    return [];
  }, [chartData, chartColumns, selectedColumns]);

  // Filter column options for X axis (exclude selected Y axis)
  const xColumnOptions = useMemo(() => {
    console.log("=== X Column Options ===");
    console.log("yAxis:", yAxisState);
    console.log("columnOptions:", columnOptions);
    if (!yAxisState) {
      console.log("No yAxis selected, returning all column options");
      console.log("========================");
      return columnOptions;
    }
    const result = columnOptions.filter(
      (col) => col.accessorKey !== yAxisState
    );
    console.log("Filtered xColumnOptions:", result);
    console.log("========================");
    return result;
  }, [columnOptions, yAxisState]);

  // Filter column options for Y axis (exclude selected X axis)
  const yColumnOptions = useMemo(() => {
    console.log("=== Y Column Options ===");
    console.log("xAxis:", xAxisState);
    console.log("columnOptions:", columnOptions);
    if (!xAxisState) {
      console.log("No xAxis selected, returning all column options");
      console.log("========================");
      return columnOptions;
    }
    const result = columnOptions.filter(
      (col) => col.accessorKey !== xAxisState
    );
    console.log("Filtered yColumnOptions:", result);
    console.log("========================");
    return result;
  }, [columnOptions, xAxisState]);

  // Predefined chart configurations
  const presetCharts = [
    {
      id: "top_sites_generation",
      name: "Top 10 Sites by Generation Capacity",
      type: "bar",
      xAxis: "", // Will be determined based on data
      yAxis: "", // Will be determined based on data
      description: "Bar chart showing top 10 sites by generation capacity",
    },
    {
      id: "top_sites_ecr",
      name: "Top 10 Sites by Total ECR Capacity",
      type: "bar",
      xAxis: "", // Will be determined based on data
      yAxis: "", // Will be determined based on data
      description: "Bar chart showing top 10 sites by total ECR capacity",
    },
    {
      id: "risk_level_distribution",
      name: "Risk Level Distribution",
      type: "pie",
      xAxis: "", // Will be determined based on data
      yAxis: "", // Will be determined based on data
      description: "Pie chart showing distribution of risk levels",
    },
    {
      id: "site_type_distribution",
      name: "Site Type Distribution",
      type: "pie",
      xAxis: "", // Will be determined based on data
      yAxis: "", // Will be determined based on data
      description: "Pie chart showing distribution of site types",
    },
  ];

  // Handle chart generation
  const generateChart = async () => {
    console.log("=== Generate Chart Called ===");
    console.log("Preset chart:", presetChart);
    console.log("Chart type:", chartTypeState);
    console.log("X axis:", xAxisState);
    console.log("Y axis:", yAxisState);
    console.log("Data:", chartData);

    // Validation for saved view with insufficient columns
    if (selectedColumns && selectedColumns.length < 2) {
      setError("Not enough columns in this view to generate a chart.");
      console.log(
        "Error: Not enough columns in this view to generate a chart."
      );
      console.log("=========================");
      return;
    }

    // Handle preset charts
    if (presetChart) {
      const preset = presetCharts.find((chart) => chart.id === presetChart);
      if (preset) {
        console.log("Generating preset chart:", preset);
        generatePresetChart(preset);
        return;
      }
    }

    // Handle custom charts
    if (!xAxisState) {
      setError("Please select both X and Y axes from the saved columns.");
      console.log("Error: No X axis selected");
      console.log("=========================");
      return;
    }

    if (!yAxisState && chartTypeState !== "pie") {
      setError("Please select both X and Y axes from the saved columns.");
      console.log("Error: No Y axis selected for non-pie chart");
      console.log("=========================");
      return;
    }

    if (chartTypeState === "pie" && !xAxisState) {
      setError("Please select a category for pie chart");
      console.log("Error: No category selected for pie chart");
      console.log("=========================");
      return;
    }

    setError("");

    try {
      // Try to use the new chart-data endpoint for better performance and filtering
      let chartDataToUse = chartData;
      
      // If we have filters or want to use the dedicated endpoint, use it
      if (Object.keys(filters).length > 0 || !chartData || chartData.length === 0) {
        console.log("Using dedicated chart-data endpoint");
        chartDataToUse = await fetchChartData(xAxisState, yAxisState, chartTypeState, filters);
      }

      if (!chartDataToUse || chartDataToUse.length === 0) {
        setError("No data available to chart");
        console.log("Error: No data available");
        console.log("=========================");
        return;
      }

      // Find the actual keys for the selected headers
      const xColumn = columnOptions.find((col) => col.accessorKey === xAxisState);
      const yColumn = columnOptions.find((col) => col.accessorKey === yAxisState);

      const xKey = xColumn ? xColumn.accessorKey : xAxisState;
      const yKey = yColumn ? yColumn.accessorKey : yAxisState;

      console.log("X key:", xKey);
      console.log("Y key:", yKey);

      // Prepare data for plotting
      let xValues = chartDataToUse.map((item) => item[xKey]);
      let yValues =
        chartTypeState !== "pie" ? chartDataToUse.map((item) => item[yKey]) : null;

      console.log("X values:", xValues);
      console.log("Y values:", yValues);

      // Convert to numbers where possible
      if (yValues) {
        yValues = yValues.map((val) => {
          const num = parseFloat(val);
          return isNaN(num) ? val : num;
        });
        console.log("Converted Y values:", yValues);
      }

      // Create chart configuration
      let chartConfig = {};

      switch (chartTypeState) {
        case "bar":
          chartConfig = {
            data: [
              {
                x: xValues,
                y: yValues,
                type: "bar",
                marker: { color: "#4f46e5" },
              },
            ],
            layout: {
              title: `${yColumn?.header || yAxisState} by ${
                xColumn?.header || xAxisState
              }`,
              xaxis: { title: xColumn?.header || xAxisState },
              yaxis: { title: yColumn?.header || yAxisState },
            },
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
                marker: { color: "#10b981" },
                line: { color: "#10b981" },
              },
            ],
            layout: {
              title: `${yColumn?.header || yAxisState} by ${
                xColumn?.header || xAxisState
              }`,
              xaxis: { title: xColumn?.header || xAxisState },
              yaxis: { title: yColumn?.header || yAxisState },
            },
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
                  color: "#8b5cf6",
                  size: 8,
                },
              },
            ],
            layout: {
              title: `${yColumn?.header || yAxisState} by ${
                xColumn?.header || xAxisState
              }`,
              xaxis: { title: xColumn?.header || xAxisState },
              yaxis: { title: yColumn?.header || yAxisState },
            },
          };
          break;

        case "pie":
          // For pie charts, we need to aggregate data by unique x values
          const aggregatedData = {};
          xValues.forEach((x, i) => {
            if (!aggregatedData[x]) {
              aggregatedData[x] = 0;
            }
            // Try to convert to number if possible, otherwise count occurrences
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
                    "#4f46e5",
                    "#10b981",
                    "#8b5cf6",
                    "#f59e0b",
                    "#ef4444",
                    "#06b6d4",
                    "#8b5cf6",
                    "#ec4899",
                  ],
                },
              },
            ],
            layout: {
              title: `Distribution of ${xColumn?.header || xAxisState}`,
            },
          };
          break;

        case "histogram":
          // Filter out non-numeric values for histogram
          const numericYValues = yValues.filter(
            (val) => typeof val === "number" && !isNaN(val)
          );
          if (numericYValues.length === 0) {
            setError("No numeric data available for histogram");
            console.log("Error: No numeric data for histogram");
            console.log("=========================");
            return;
          }

          chartConfig = {
            data: [
              {
                x: numericYValues,
                type: "histogram",
                marker: { color: "#f59e0b" },
              },
            ],
            layout: {
              title: `Distribution of ${yColumn?.header || yAxisState}`,
              xaxis: { title: yColumn?.header || yAxisState },
              yaxis: { title: "Frequency" },
            },
          };
          break;

        default:
          chartConfig = {
            data: [
              {
                x: xValues,
                y: yValues,
                type: "bar",
              },
            ],
            layout: {
              title: `${yColumn?.header || yAxisState} by ${
                xColumn?.header || xAxisState
              }`,
              xaxis: { title: xColumn?.header || xAxisState },
              yaxis: { title: yColumn?.header || yAxisState },
            },
          };
      }

      console.log("Generated chart config:", chartConfig);
      console.log("=========================");
      setGeneratedChart(chartConfig);
    } catch (error) {
      console.error("Error generating chart:", error);
      setError("Failed to generate chart: " + error.message);
    }
  };

  // Generate a preset chart
  const generatePresetChart = (preset) => {
    console.log("=== Generate Preset Chart ===");
    console.log("Preset:", preset);
    console.log("Data available:", chartData ? chartData.length : "No data");
    console.log(
      "Column options available:",
      columnOptions ? columnOptions.length : "No columns"
    );

    // Log all available column names for debugging
    if (columnOptions && columnOptions.length > 0) {
      console.log(
        "Available columns:",
        columnOptions.map((col) => ({
          accessorKey: col.accessorKey,
          header: col.header,
        }))
      );
    }

    setError("");

    // Check if we have data
    if (!chartData || chartData.length === 0) {
      setError("No data available to generate chart");
      console.log("Error: No data available");
      console.log("==============================");
      return;
    }

    // Check if we have column options
    if (!columnOptions || columnOptions.length === 0) {
      setError("No column information available to generate chart");
      console.log("Error: No column information available");
      console.log("==============================");
      return;
    }

    // Try to find appropriate columns based on the preset
    let xKey, yKey, xColumn, yColumn;
    let sortedData; // Declare sortedData once here

    switch (preset.id) {
      case "top_sites_generation":
        console.log("Generating top sites by generation capacity chart");
        // Look for site name and generation capacity columns with more flexible matching
        xColumn = columnOptions.find(
          (col) =>
            col.accessorKey.toLowerCase().includes("site") ||
            col.accessorKey.toLowerCase().includes("name") ||
            col.header.toLowerCase().includes("site") ||
            col.header.toLowerCase().includes("name")
        );

        yColumn = columnOptions.find(
          (col) =>
            (col.accessorKey.toLowerCase().includes("generation") &&
              col.accessorKey.toLowerCase().includes("capacity")) ||
            (col.header.toLowerCase().includes("generation") &&
              col.header.toLowerCase().includes("capacity"))
        );

        console.log("Found xColumn:", xColumn);
        console.log("Found yColumn:", yColumn);

        // Fallback matching if primary match fails
        if (!xColumn) {
          xColumn = columnOptions.find(
            (col) =>
              col.accessorKey.toLowerCase() === "site" ||
              col.accessorKey.toLowerCase() === "sitename" ||
              col.header.toLowerCase() === "site" ||
              col.header.toLowerCase() === "site name"
          );
        }

        if (!yColumn) {
          yColumn = columnOptions.find(
            (col) =>
              col.accessorKey.toLowerCase().includes("generation capacity") ||
              col.header.toLowerCase().includes("generation capacity")
          );
        }

        console.log("After fallback - Found xColumn:", xColumn);
        console.log("After fallback - Found yColumn:", yColumn);

        if (!xColumn || !yColumn) {
          setError(
            "Could not find appropriate columns for this chart. Looking for Site/Site Name and Generation Capacity columns. Available columns: " +
              columnOptions.map((col) => col.header).join(", ")
          );
          console.log("Error: Could not find appropriate columns");
          console.log("==============================");
          return;
        }

        xKey = xColumn.accessorKey;
        yKey = yColumn.accessorKey;

        // Sort data by generation capacity and take top 10
        sortedData = [...chartData]
          .filter(
            (item) =>
              item[xKey] && item[yKey] && item[xKey] !== "" && item[yKey] !== ""
          ) // Filter out items with missing data
          .sort((a, b) => {
            const aVal = parseFloat(a[yKey]) || 0;
            const bVal = parseFloat(b[yKey]) || 0;
            return bVal - aVal;
          })
          .slice(0, 10);

        console.log("Sorted data:", sortedData);

        if (sortedData.length === 0) {
          setError("No valid data found for this chart after filtering");
          console.log("Error: No valid data after filtering");
          console.log("==============================");
          return;
        }

        const xValues = sortedData.map((item) => item[xKey]);
        const yValues = sortedData.map((item) => parseFloat(item[yKey]) || 0);

        console.log("X values:", xValues);
        console.log("Y values:", yValues);

        setGeneratedChart({
          data: [
            {
              x: xValues,
              y: yValues,
              type: "bar",
              marker: { color: "#4f46e5" },
            },
          ],
          layout: {
            title: "Top 10 Sites by Generation Capacity",
            xaxis: { title: xColumn.header },
            yaxis: { title: yColumn.header },
          },
        });
        break;

      case "top_sites_ecr":
        console.log("Generating top sites by ECR capacity chart");
        // Look for site name and ECR capacity columns with more flexible matching
        xColumn = columnOptions.find(
          (col) =>
            col.accessorKey.toLowerCase().includes("site") ||
            col.accessorKey.toLowerCase().includes("name") ||
            col.header.toLowerCase().includes("site") ||
            col.header.toLowerCase().includes("name")
        );

        yColumn = columnOptions.find(
          (col) =>
            (col.accessorKey.toLowerCase().includes("total") &&
              col.accessorKey.toLowerCase().includes("ecr") &&
              col.accessorKey.toLowerCase().includes("capacity")) ||
            (col.header.toLowerCase().includes("total") &&
              col.header.toLowerCase().includes("ecr") &&
              col.header.toLowerCase().includes("capacity"))
        );

        console.log("Found xColumn:", xColumn);
        console.log("Found yColumn:", yColumn);

        // Fallback matching if primary match fails
        if (!xColumn) {
          xColumn = columnOptions.find(
            (col) =>
              col.accessorKey.toLowerCase() === "site" ||
              col.accessorKey.toLowerCase() === "sitename" ||
              col.header.toLowerCase() === "site" ||
              col.header.toLowerCase() === "site name"
          );
        }

        if (!yColumn) {
          yColumn = columnOptions.find(
            (col) =>
              col.accessorKey.toLowerCase().includes("total ecr capacity") ||
              col.header.toLowerCase().includes("total ecr capacity")
          );
        }

        console.log("After fallback - Found xColumn:", xColumn);
        console.log("After fallback - Found yColumn:", yColumn);

        if (!xColumn || !yColumn) {
          setError(
            "Could not find appropriate columns for this chart. Looking for Site/Site Name and Total ECR Capacity columns. Available columns: " +
              columnOptions.map((col) => col.header).join(", ")
          );
          console.log("Error: Could not find appropriate columns");
          console.log("==============================");
          return;
        }

        xKey = xColumn.accessorKey;
        yKey = yColumn.accessorKey;

        // Sort data by ECR capacity and take top 10
        sortedData = [...chartData]
          .filter(
            (item) =>
              item[xKey] && item[yKey] && item[xKey] !== "" && item[yKey] !== ""
          ) // Filter out items with missing data
          .sort((a, b) => {
            const aVal = parseFloat(a[yKey]) || 0;
            const bVal = parseFloat(b[yKey]) || 0;
            return bVal - aVal;
          })
          .slice(0, 10);

        console.log("Sorted data:", sortedData);

        if (sortedData.length === 0) {
          setError("No valid data found for this chart after filtering");
          console.log("Error: No valid data after filtering");
          console.log("==============================");
          return;
        }

        const xValues2 = sortedData.map((item) => item[xKey]);
        const yValues2 = sortedData.map((item) => parseFloat(item[yKey]) || 0);

        console.log("X values:", xValues2);
        console.log("Y values:", yValues2);

        setGeneratedChart({
          data: [
            {
              x: xValues2,
              y: yValues2,
              type: "bar",
              marker: { color: "#10b981" },
            },
          ],
          layout: {
            title: "Top 10 Sites by Total ECR Capacity",
            xaxis: { title: xColumn.header },
            yaxis: { title: yColumn.header },
          },
        });
        break;

      case "risk_level_distribution":
        console.log("Generating risk level distribution chart");
        // Look for risk level column with more flexible matching
        xColumn = columnOptions.find(
          (col) =>
            col.accessorKey.toLowerCase().includes("risk") ||
            col.accessorKey.toLowerCase().includes("dnoa result") ||
            col.header.toLowerCase().includes("risk") ||
            col.header.toLowerCase().includes("dnoa result")
        );

        console.log("Found xColumn:", xColumn);

        // Fallback matching if primary match fails
        if (!xColumn) {
          // Look for any column that might contain risk-related information
          xColumn = columnOptions.find(
            (col) =>
              col.accessorKey.toLowerCase().includes("status") ||
              col.accessorKey.toLowerCase().includes("result") ||
              col.header.toLowerCase().includes("status") ||
              col.header.toLowerCase().includes("result")
          );
        }

        console.log("After fallback - Found xColumn:", xColumn);

        if (!xColumn) {
          setError(
            "Could not find appropriate columns for this chart. Looking for Risk Level or DNOA Result columns. Available columns: " +
              columnOptions.map((col) => col.header).join(", ")
          );
          console.log("Error: Could not find appropriate columns");
          console.log("==============================");
          return;
        }

        xKey = xColumn.accessorKey;

        // Filter out items with missing risk level data
        const validRiskData = chartData.filter(
          (item) => item[xKey] && item[xKey] !== ""
        );

        if (validRiskData.length === 0) {
          setError("No valid data found for this chart");
          console.log("Error: No valid data");
          console.log("==============================");
          return;
        }

        // Count occurrences of each risk level
        const riskCounts = {};
        validRiskData.forEach((item) => {
          const riskLevel = item[xKey];
          if (riskLevel) {
            riskCounts[riskLevel] = (riskCounts[riskLevel] || 0) + 1;
          }
        });

        console.log("Risk counts:", riskCounts);

        if (Object.keys(riskCounts).length === 0) {
          setError("No risk level data found to chart");
          console.log("Error: No risk level data");
          console.log("==============================");
          return;
        }

        setGeneratedChart({
          data: [
            {
              labels: Object.keys(riskCounts),
              values: Object.values(riskCounts),
              type: "pie",
              marker: {
                colors: [
                  "#ef4444",
                  "#f59e0b",
                  "#10b981",
                  "#4f46e5",
                  "#8b5cf6",
                  "#06b6d4",
                  "#ec4899",
                ],
              },
            },
          ],
          layout: {
            title: "Risk Level Distribution",
          },
        });
        break;

      case "site_type_distribution":
        console.log("Generating site type distribution chart");
        // Look for site type column with more flexible matching
        xColumn = columnOptions.find(
          (col) =>
            (col.accessorKey.toLowerCase().includes("site") &&
              col.accessorKey.toLowerCase().includes("type")) ||
            col.accessorKey.toLowerCase().includes("type") ||
            (col.header.toLowerCase().includes("site") &&
              col.header.toLowerCase().includes("type")) ||
            col.header.toLowerCase().includes("type")
        );

        console.log("Found xColumn:", xColumn);

        // Fallback matching if primary match fails
        if (!xColumn) {
          // Look for any column that might contain type information
          xColumn = columnOptions.find(
            (col) =>
              col.accessorKey.toLowerCase() === "type" ||
              col.accessorKey.toLowerCase() === "sitetype" ||
              col.header.toLowerCase() === "type" ||
              col.header.toLowerCase() === "site type"
          );
        }

        console.log("After fallback - Found xColumn:", xColumn);

        if (!xColumn) {
          setError(
            "Could not find appropriate columns for this chart. Looking for Site Type or Type columns. Available columns: " +
              columnOptions.map((col) => col.header).join(", ")
          );
          console.log("Error: Could not find appropriate columns");
          console.log("==============================");
          return;
        }

        xKey = xColumn.accessorKey;

        // Filter out items with missing site type data
        const validSiteTypeData = chartData.filter(
          (item) => item[xKey] && item[xKey] !== ""
        );

        if (validSiteTypeData.length === 0) {
          setError("No valid data found for this chart");
          console.log("Error: No valid data");
          console.log("==============================");
          return;
        }

        // Count occurrences of each site type
        const siteTypeCounts = {};
        validSiteTypeData.forEach((item) => {
          const siteType = item[xKey];
          if (siteType) {
            siteTypeCounts[siteType] = (siteTypeCounts[siteType] || 0) + 1;
          }
        });

        console.log("Site type counts:", siteTypeCounts);

        if (Object.keys(siteTypeCounts).length === 0) {
          setError("No site type data found to chart");
          console.log("Error: No site type data");
          console.log("==============================");
          return;
        }

        setGeneratedChart({
          data: [
            {
              labels: Object.keys(siteTypeCounts),
              values: Object.values(siteTypeCounts),
              type: "pie",
              marker: {
                colors: [
                  "#4f46e5",
                  "#10b981",
                  "#8b5cf6",
                  "#f59e0b",
                  "#ef4444",
                  "#06b6d4",
                  "#ec4899",
                ],
              },
            },
          ],
          layout: {
            title: "Site Type Distribution",
          },
        });
        break;

      default:
        setError("Unknown preset chart selected");
        console.log("Error: Unknown preset chart");
        console.log("==============================");
        return;
    }
  };

  // Auto-generate chart when configuration changes (with saved view integration)
  useEffect(() => {
    // Auto-select saved configuration if it exists and is valid
    if (chartType && xAxis && yAxis) {
      setChartTypeState(chartType);
      setXAxisState(xAxis);
      setYAxisState(yAxis);

      // Show notification when loading chart from saved view
      if (selectedColumns && selectedColumns.length > 0) {
        // Create notification element
        const notification = document.createElement("div");
        notification.className =
          "fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50";
        notification.textContent =
          "Chart updated with saved view configuration";

        // Add to document
        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 3000);
      }
    }

    // Auto-generate chart if we have valid configuration
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
    <div className="w-full">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Chart Builder</h2>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Validation message for insufficient columns */}
      {selectedColumns &&
        selectedColumns.length > 0 &&
        selectedColumns.length < 2 && (
          <div className="mb-4 p-3 bg-yellow-50 text-yellow-700 rounded-md text-sm">
            Not enough columns in this view to generate a chart.
          </div>
        )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Chart Type
          </label>
          <select
            value={chartTypeState}
            onChange={(e) => setChartTypeState(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="bar">Bar Chart</option>
            <option value="line">Line Chart</option>
            <option value="scatter">Scatter Plot</option>
            <option value="pie">Pie Chart</option>
            <option value="histogram">Histogram</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            X-Axis
          </label>
          <select
            value={xAxisState}
            onChange={(e) => setXAxisState(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={
              selectedColumns &&
              selectedColumns.length > 0 &&
              selectedColumns.length < 2
            }
          >
            <option value="">Select column</option>
            {xColumnOptions.map((col) => (
              <option key={col.accessorKey} value={col.accessorKey}>
                {col.header}
              </option>
            ))}
          </select>
        </div>

        {chartTypeState !== "pie" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Y-Axis
            </label>
            <select
              value={yAxisState}
              onChange={(e) => setYAxisState(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={
                selectedColumns &&
                selectedColumns.length > 0 &&
                selectedColumns.length < 2
              }
            >
              <option value="">Select column</option>
              {yColumnOptions.map((col) => (
                <option key={col.accessorKey} value={col.accessorKey}>
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
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Generating..." : "Generate Chart"}
          </button>
        </div>
      </div>

      {generatedChart && (
        <div className="mt-6">
          <Plot
            data={generatedChart.data}
            layout={generatedChart.layout}
            style={{ width: "100%", height: "100%" }}
            config={{ responsive: true }}
          />
        </div>
      )}
    </div>
  );
};

export default CustomChartBuilder;
