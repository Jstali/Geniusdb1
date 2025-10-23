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
  
  // State to track if user wants to go back to configuration
  const [showConfig, setShowConfig] = useState(false);

  // Use external pivotConfig if provided, otherwise use internal state
  const effectivePivotConfig = externalPivotConfig || pivotConfig;
  const effectiveIsGenerated = externalPivotConfig ? (externalPivotConfig !== null && !showConfig) : (isGenerated && !showConfig);

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
    try {
      if (!generatedPivotData || generatedPivotData.length === 0) {
        console.error("No pivot data available for export");
        return;
      }

      // Create a simple Excel-compatible CSV with proper formatting
      const headers = Object.keys(generatedPivotData[0]);
      const csvContent = [
        // Add headers
        headers.join(","),
        // Add data rows
        ...generatedPivotData.map(row => 
          headers.map(header => {
            const value = row[header];
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value || '';
          }).join(",")
        )
      ].join("\n");

      // Create blob with Excel-compatible MIME type
      const blob = new Blob([csvContent], { 
        type: "application/vnd.ms-excel;charset=utf-8;" 
      });
      
      // Create download link
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      
      // Generate filename with current date
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      link.download = `pivot-table-data_${dateStr}.xls`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log("Excel export completed successfully");
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      // Fallback: try the original Handsontable method
      if (hotTableRef.current && hotTableRef.current.hotInstance) {
        const exportPlugin = hotTableRef.current.hotInstance.getPlugin("exportFile");
        if (exportPlugin) {
          try {
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
          } catch (fallbackError) {
            console.error("Fallback export also failed:", fallbackError);
          }
        }
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
    setShowConfig(false); // Hide config panel when generating new pivot
    console.log("Pivot table generation initiated");
  };

  // Handle cancel from PivotConfigPanel
  const handleCancel = () => {
    setPivotConfig(null);
    setIsGenerated(false);
    setGeneratedPivotData([]);
    setShowConfig(false);
  };

  // Handle back - go back to configuration panel to select different options
  const handleBack = () => {
    console.log("Going back to pivot configuration");
    console.log("Current state before reset:", {
      pivotConfig,
      isGenerated,
      generatedPivotDataLength: generatedPivotData.length,
      externalPivotConfig,
      showConfig
    });
    
    // Set showConfig to true to force showing the configuration panel
    setShowConfig(true);
    
    console.log("Back button clicked - showing configuration panel");
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
      {/* Use the PivotConfigPanel component */}
      {data && data.length > 0 && (!effectiveIsGenerated || showConfig) && (
        <PivotConfigPanel
          key={`pivot-config-${isGenerated}-${generatedPivotData.length}-${showConfig}`}
          columns={columns}
          onDataGenerate={handleDataGenerate}
          onCancel={handleCancel}
        />
      )}

      {/* Export buttons - only show when there's data and pivot table is generated */}
      {effectiveIsGenerated && generatedPivotData.length > 0 && (
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <div className="flex space-x-2">
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm flex items-center space-x-1"
              title="Go back to select different pivot options"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back</span>
            </button>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
            >
              Export to CSV
            </button>
            <button
              onClick={exportToExcel}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
            >
              Export to Excel
            </button>
          </div>
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
