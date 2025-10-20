import { useState, useMemo, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { HotTable } from "@handsontable/react";
import "handsontable/dist/handsontable.full.css";
import PivotConfigPanel from "./PivotConfigPanel";

// Register Handsontable plugins
import { registerAllModules } from "handsontable/registry";
registerAllModules();

// Helper function to group data by multiple keys
const groupBy = (array, keys) => {
  return array.reduce((groups, item) => {
    const groupKey = keys.map((key) => item[key]).join("|");
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {});
};

// Helper function to sum values in an array
const sum = (array, key) => {
  return array.reduce((total, item) => {
    const value = item[key];
    // Handle different data types that can be converted to numbers
    if (value === null || value === undefined || value === "") return total;
    const numValue = Number(value);
    return isNaN(numValue) ? total : total + numValue;
  }, 0);
};

// Helper function to calculate average
const average = (array, key) => {
  if (array.length === 0) return 0;
  const sumValue = sum(array, key);
  return sumValue / array.length;
};

// Helper function to count items
const count = (array) => {
  return array.length;
};

// Helper function to find min value
const min = (array, key) => {
  const validValues = array
    .map((item) => {
      const value = item[key];
      if (value === null || value === undefined || value === "") return null;
      const numValue = Number(value);
      return isNaN(numValue) ? null : numValue;
    })
    .filter((val) => val !== null);

  if (validValues.length === 0) return 0;
  return Math.min(...validValues);
};

// Helper function to find max value
const max = (array, key) => {
  const validValues = array
    .map((item) => {
      const value = item[key];
      if (value === null || value === undefined || value === "") return null;
      const numValue = Number(value);
      return isNaN(numValue) ? null : numValue;
    })
    .filter((val) => val !== null);

  if (validValues.length === 0) return 0;
  return Math.max(...validValues);
};

// Convert data to column format for PivotConfigPanel
const convertToColumns = (data) => {
  if (!data || data.length === 0) return [];

  const keys = Object.keys(data[0]);
  return keys.map((key) => ({
    accessorKey: key,
    header: key,
  }));
};

const PivotTableView = ({ data, pivotConfig: externalPivotConfig }) => {
  // Only use provided data, don't fallback to sample data
  // const rowData = useMemo(() => {
  //   if (data && data.length > 0) {
  //     return data;
  //   }
  //   // Return empty array when no data is provided
  //   return [];
  // }, [data]);

  // Convert data to column format for PivotConfigPanel
  const columns = useMemo(() => {
    return convertToColumns(data);
  }, [data]);

  // State for pivot configuration from PivotConfigPanel
  const [pivotConfig, setPivotConfig] = useState(null);

  // State to track if pivot table has been generated
  const [isGenerated, setIsGenerated] = useState(false);

  // Use external pivotConfig if provided, otherwise use internal state
  const effectivePivotConfig = externalPivotConfig || pivotConfig;
  const effectiveIsGenerated = externalPivotConfig ? true : isGenerated;

  // State for generated pivot data
  const [generatedPivotData, setGeneratedPivotData] = useState([]);

  // Effect to generate pivot data when config changes
  useEffect(() => {
    console.log("=== PIVOT TABLE VIEW: useEffect triggered ===");
    console.log("useEffect dependencies:", {
      pivotConfig: effectivePivotConfig,
      externalPivotConfig: externalPivotConfig,
      internalPivotConfig: pivotConfig,
      dataLength: data?.length || 0,
      isGenerated: effectiveIsGenerated,
    });

    if (effectivePivotConfig && data && data.length > 0) {
      console.log(
        "useEffect: Generating pivot data with config:",
        effectivePivotConfig
      );
      try {
        const newPivotData = generatePivotData(data, effectivePivotConfig);
        setGeneratedPivotData(newPivotData);
        console.log(
          "useEffect: Pivot data generated successfully, rows:",
          newPivotData.length
        );
      } catch (error) {
        console.error("useEffect: Error generating pivot data:", error);
        setGeneratedPivotData([]);
      }
    } else {
      console.log("useEffect: Skipping data generation - missing requirements");
      setGeneratedPivotData([]);
    }
  }, [effectivePivotConfig, data]);

  // Function to generate pivot data
  const generatePivotData = (data, config) => {
    if (
      !data ||
      data.length === 0 ||
      !config ||
      config.rows.length === 0 ||
      config.values.length === 0
    ) {
      return [];
    }

    try {
      console.log("Starting pivot data generation...");
      // Get all row fields
      const rowFields = config.rows;

      // Get all value fields with their aggregations
      const valueConfigs = config.values;

      // Group data by all row dimensions
      const groupedData = groupBy(data, rowFields);

      // Create result array
      const result = [];

      // Process each group
      Object.entries(groupedData).forEach(([groupKey, groupItems]) => {
        const row = {};

        // Add all row group values
        const rowKeys = groupKey.split("|");
        rowFields.forEach((field, index) => {
          row[field] = rowKeys[index] || "";
        });

        // Calculate aggregated values for each value field
        valueConfigs.forEach((valueConfig) => {
          const valueField = valueConfig.field;
          const aggFunc = valueConfig.aggregation.toLowerCase();

          let aggValue;
          switch (aggFunc) {
            case "sum":
              aggValue = sum(groupItems, valueField);
              break;
            case "avg":
              aggValue = average(groupItems, valueField);
              break;
            case "count":
              aggValue = count(groupItems);
              break;
            case "min":
              aggValue = min(groupItems, valueField);
              break;
            case "max":
              aggValue = max(groupItems, valueField);
              break;
            default:
              aggValue = sum(groupItems, valueField);
          }
          row[valueField] = aggValue;
        });

        result.push(row);
      });

      console.log(
        "Pivot data generation completed. Rows generated:",
        result.length
      );
      return result;
    } catch (error) {
      console.error("Error generating pivot data:", error);
      return [];
    }
  };

  // Generate pivot table data based on configuration (keep for backward compatibility)
  const pivotData = useMemo(() => {
    console.log("Generating pivot data with config:", pivotConfig);
    console.log("Data length:", data?.length || 0);

    // Only generate data when configuration is provided
    if (
      !data ||
      data.length === 0 ||
      !pivotConfig ||
      pivotConfig.rows.length === 0 ||
      pivotConfig.values.length === 0
    ) {
      console.log("Skipping pivot data generation - missing requirements");
      return [];
    }

    try {
      console.log("Starting pivot data generation...");
      // Get all row fields
      const rowFields = pivotConfig.rows;

      // Get all value fields with their aggregations
      const valueConfigs = pivotConfig.values;

      // Group data by all row dimensions
      const groupedData = groupBy(data, rowFields);

      // Create result array
      const result = [];

      // Process each group
      Object.entries(groupedData).forEach(([groupKey, groupItems]) => {
        const row = {};

        // Add all row group values
        const rowKeys = groupKey.split("|");
        rowFields.forEach((field, index) => {
          row[field] = rowKeys[index] || "";
        });

        // Calculate aggregated values for each value field
        valueConfigs.forEach((valueConfig) => {
          const valueField = valueConfig.field;
          const aggFunc = valueConfig.aggregation.toLowerCase();

          let aggValue;
          switch (aggFunc) {
            case "sum":
              aggValue = sum(groupItems, valueField);
              break;
            case "avg":
              aggValue = average(groupItems, valueField);
              break;
            case "count":
              aggValue = count(groupItems);
              break;
            case "min":
              aggValue = min(groupItems, valueField);
              break;
            case "max":
              aggValue = max(groupItems, valueField);
              break;
            default:
              aggValue = sum(groupItems, valueField);
          }
          row[valueField] = aggValue;
        });

        result.push(row);
      });

      console.log(
        "Pivot data generation completed. Rows generated:",
        result.length
      );
      return result;
    } catch (error) {
      console.error("Error generating pivot data:", error);
      return [];
    }
  }, [data, pivotConfig]);

  // Prepare column definitions for Handsontable based on pivot data
  const columnDefs = useMemo(() => {
    if (generatedPivotData && generatedPivotData.length > 0) {
      const firstRow = generatedPivotData[0];
      return Object.keys(firstRow).map((key) => {
        // Determine column type based on data
        if (typeof firstRow[key] === "number") {
          return {
            data: key,
            type: "numeric",
            width: 120,
            numericFormat: { pattern: "0,0.00" },
          };
        }
        return { data: key, type: "text", width: 120 };
      });
    }
    // Return empty array when no pivot data
    return [];
  }, [generatedPivotData]);

  // Get column headers based on pivot data
  const columnHeaders = useMemo(() => {
    if (generatedPivotData && generatedPivotData.length > 0) {
      return Object.keys(generatedPivotData[0]);
    }
    // Return empty array when no pivot data
    return [];
  }, [generatedPivotData]);

  // Configure Handsontable settings
  const hotSettings = {
    data: generatedPivotData,
    columns: columnDefs,
    colHeaders: columnHeaders,
    rowHeaders: true,
    filters: true,
    dropdownMenu: true,
    contextMenu: true,
    manualColumnResize: true,
    manualRowResize: true,
    columnSorting: true,
    licenseKey: "non-commercial-and-evaluation",
    height: 500,
    width: "100%",
    className: "htCenter",
    // Ensure all data is displayed without virtualization limits
    renderAllRows: true,
    // Disable pagination/virtualization that might limit rows
    viewportRowRenderingOffset: "auto",
    // Ensure the table can grow to accommodate all data
    stretchH: "all",
  };

  const hotTableRef = useRef();

  // Export to CSV function
  const exportToCSV = () => {
    if (hotTableRef.current && hotTableRef.current.hotInstance) {
      const exportPlugin =
        hotTableRef.current.hotInstance.getPlugin("exportFile");
      if (exportPlugin) {
        exportPlugin.downloadFile("csv", {
          bom: false,
          columnDelimiter: ",",
          columnHeaders: true,
          exportHiddenColumns: true,
          exportHiddenRows: true,
          fileExtension: "csv",
          filename: "pivot-table-data_[YYYY]-[MM]-[DD]",
          mimeType: "text/csv",
          rowDelimiter: "\r\n",
          rowHeaders: true,
        });
      }
    }
  };

  // Export to Excel function
  const exportToExcel = () => {
    if (hotTableRef.current && hotTableRef.current.hotInstance) {
      const exportPlugin =
        hotTableRef.current.hotInstance.getPlugin("exportFile");
      if (exportPlugin) {
        exportPlugin.downloadFile("xlsx", {
          bom: false,
          columnDelimiter: ",",
          columnHeaders: true,
          exportHiddenColumns: true,
          exportHiddenRows: true,
          fileExtension: "xlsx",
          filename: "pivot-table-data_[YYYY]-[MM]-[DD]",
          mimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          rowDelimiter: "\r\n",
          rowHeaders: true,
        });
      }
    }
  };

  // Handle pivot configuration from PivotConfigPanel
  const handleDataGenerate = (config) => {
    console.log("=== PIVOT TABLE VIEW: RECEIVED CONFIG ===");
    console.log("Received pivot configuration:", config);

    // Validate the config before proceeding
    if (!config || !config.rows || !config.columns || !config.values) {
      console.error("Invalid configuration received:", config);
      return;
    }

    console.log("Setting pivot config and marking as generated");
    setPivotConfig(config);
    setIsGenerated(true);
    console.log("Pivot table generation initiated");
  };

  // Handle cancel from PivotConfigPanel
  const handleCancel = () => {
    setPivotConfig(null);
    setIsGenerated(false);
    setGeneratedPivotData([]);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
      {/* Use the PivotConfigPanel component */}
      {data && data.length > 0 && !effectiveIsGenerated && (
        <PivotConfigPanel
          columns={columns}
          onDataGenerate={handleDataGenerate}
          onCancel={handleCancel}
        />
      )}

      {/* Export buttons - only show when there's data and pivot table is generated */}
      {effectiveIsGenerated && generatedPivotData.length > 0 && (
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-end space-x-2">
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
          >
            Export to CSV
          </button>
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-geniusAquamarine text-black rounded hover:bg-geniusAquamarine/80 transition-colors text-sm"
          >
            Export to Excel
          </button>
        </div>
      )}

      {/* Message when no data or not generated */}
      {data && data.length > 0 && !effectiveIsGenerated && (
        <div className="p-8 text-center text-gray-500">
          <p>
            Configure the pivot table above and click &quot;Generate Pivot
            Table&quot;
          </p>
        </div>
      )}

      {/* Message when no data available after generation */}
      {data &&
        data.length > 0 &&
        effectiveIsGenerated &&
        generatedPivotData.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <p>
              No data available for the selected options. Please try different
              selections.
            </p>
          </div>
        )}

      {/* Handsontable component - only show when there's data to display */}
      {effectiveIsGenerated && generatedPivotData.length > 0 && (
        <HotTable ref={hotTableRef} settings={hotSettings} />
      )}
    </div>
  );
};

PivotTableView.propTypes = {
  data: PropTypes.array,
  pivotConfig: PropTypes.object,
};

export default PivotTableView;
