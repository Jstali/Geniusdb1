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
  if (!array || !Array.isArray(array)) {
    console.error("groupBy: Invalid array provided:", array);
    return {};
  }
  
  if (!keys || !Array.isArray(keys) || keys.length === 0) {
    console.error("groupBy: Invalid keys provided:", keys);
    return {};
  }
  
  return array.reduce((groups, item, index) => {
    if (!item || typeof item !== 'object') {
      console.warn(`groupBy: Invalid item at index ${index}:`, item);
      return groups;
    }
    
    const groupKey = keys.map((key) => {
      if (!item.hasOwnProperty(key)) {
        console.warn(`groupBy: Missing key '${key}' in item:`, item);
        return "(missing)";
      }
      
      const value = item[key];
      if (value === null || value === undefined || value === "" || value === "\\N" || value === "N/A") {
        return "(blank)";
      }
      return String(value);
    }).join("|");
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {});
};

// Helper function to sum values
const sum = (array, key) => {
  if (!array || array.length === 0) {
    console.warn(`Sum: Empty array for key ${key}`);
    return 0;
  }
  
  return array.reduce((total, item) => {
    if (!item || typeof item !== 'object') {
      console.warn(`Sum: Invalid item for key ${key}:`, item);
      return total;
    }
    
    const value = item[key];
    if (value === null || value === undefined || value === "" || value === "\\N" || value === "N/A") {
      return total;
    }
    
    let numValue;
    if (typeof value === 'number') {
      numValue = value;
    } else if (typeof value === 'string') {
      const cleanValue = value.replace(/[,\s]/g, '');
      numValue = Number(cleanValue);
    } else {
      numValue = Number(value);
    }
    
    if (isNaN(numValue)) {
      console.warn(`Sum: Non-numeric value for key ${key}:`, value);
      return total;
    }
    
    return total + numValue;
  }, 0);
};

// Helper function to calculate average
const average = (array, key) => {
  if (array.length === 0) return 0;
  
  const numericValues = array
    .map(item => item[key])
    .filter(value => {
      if (value === null || value === undefined || value === "" || value === "\\N" || value === "N/A") {
        return false;
      }
      
      let numValue;
      if (typeof value === 'number') {
        numValue = value;
      } else if (typeof value === 'string') {
        const cleanValue = value.replace(/[,\s]/g, '');
        numValue = Number(cleanValue);
      } else {
        numValue = Number(value);
      }
      
      return !isNaN(numValue);
    })
    .map(value => {
      if (typeof value === 'number') {
        return value;
      } else if (typeof value === 'string') {
        const cleanValue = value.replace(/[,\s]/g, '');
        return Number(cleanValue);
      } else {
        return Number(value);
      }
    });
  
  if (numericValues.length === 0) return 0;
  
  const sumValue = numericValues.reduce((total, value) => total + value, 0);
  return sumValue / numericValues.length;
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
      if (value === null || value === undefined || value === "" || value === "\\N" || value === "N/A") return null;
      
      let numValue;
      if (typeof value === 'number') {
        numValue = value;
      } else if (typeof value === 'string') {
        const cleanValue = value.replace(/[,\s]/g, '');
        numValue = Number(cleanValue);
      } else {
        numValue = Number(value);
      }
      
      return isNaN(numValue) ? null : numValue;
    })
    .filter((val) => val !== null);

  if (validValues.length === 0) return null;
  return Math.min(...validValues);
};

// Helper function to find max value
const max = (array, key) => {
  const validValues = array
    .map((item) => {
      const value = item[key];
      if (value === null || value === undefined || value === "" || value === "\\N" || value === "N/A") return null;
      
      let numValue;
      if (typeof value === 'number') {
        numValue = value;
      } else if (typeof value === 'string') {
        const cleanValue = value.replace(/[,\s]/g, '');
        numValue = Number(cleanValue);
      } else {
        numValue = Number(value);
      }
      
      return isNaN(numValue) ? null : numValue;
    })
    .filter((val) => val !== null);

  if (validValues.length === 0) return null;
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
    console.log("=== PIVOT TABLE GENERATION ===");
    console.log("Config:", effectivePivotConfig);
    console.log("Data length:", data?.length || 0);
    console.log("Data sample:", data?.slice(0, 2));

    if (effectivePivotConfig && data && data.length > 0) {
      try {
        // Validate data structure
        const firstItem = data[0];
        const dataKeys = Object.keys(firstItem);
        console.log("Available data fields:", dataKeys);
        
        // Validate configuration against data
        const allConfigFields = [
          ...effectivePivotConfig.rows,
          ...(effectivePivotConfig.columns || []),
          ...effectivePivotConfig.values.map(v => v.field)
        ];
        
        const missingFields = allConfigFields.filter(field => !dataKeys.includes(field));
        if (missingFields.length > 0) {
          console.error("Missing fields in data:", missingFields);
          console.error("Available fields:", dataKeys);
          setGeneratedPivotData([]);
          return;
        }
        
        const newPivotData = generatePivotData(data, effectivePivotConfig);
        
        // Validate the generated pivot data
        const validation = validatePivotData(newPivotData, data, effectivePivotConfig);
        
        if (validation.isValid) {
          console.log("✅ Pivot data validation passed");
          setGeneratedPivotData(newPivotData);
        } else {
          console.error("❌ Pivot data validation failed:", validation.issues);
          setGeneratedPivotData([]);
        }
        
        // Log warnings even if validation passed
        if (validation.warnings.length > 0) {
          console.warn("⚠️ Pivot data validation warnings:", validation.warnings);
        }
        
        console.log("Pivot data generated successfully, rows:", newPivotData.length);
        
        if (newPivotData.length > 0) {
          console.log("Sample pivot row:", newPivotData[0]);
        }
      } catch (error) {
        console.error("Error generating pivot data:", error);
        console.error("Error stack:", error.stack);
        setGeneratedPivotData([]);
      }
    } else {
      console.log("Skipping data generation - missing requirements");
      setGeneratedPivotData([]);
    }
  }, [effectivePivotConfig, data]);

  // Main pivot data generation function
  const generatePivotData = (data, config) => {
    if (!data || data.length === 0 || !config || config.rows.length === 0 || config.values.length === 0) {
      console.log("Pivot data generation skipped - missing requirements");
      return [];
    }

    console.log("=== PIVOT DATA GENERATION START ===");
    console.log("Input data length:", data.length);
    console.log("Rows:", config.rows);
    console.log("Columns:", config.columns || []);
    console.log("Values:", config.values);
    
    // Analyze data structure
    const firstItem = data[0];
    console.log("First data item:", firstItem);
    console.log("Data keys:", Object.keys(firstItem));
    
    // Check for data quality issues
    const dataQualityIssues = [];
    data.forEach((item, index) => {
      if (!item || typeof item !== 'object') {
        dataQualityIssues.push(`Invalid item at index ${index}: ${typeof item}`);
      }
    });
    
    if (dataQualityIssues.length > 0) {
      console.warn("Data quality issues found:", dataQualityIssues.slice(0, 5));
    }

    const rowFields = config.rows;
    const columnFields = config.columns || [];
    const valueConfigs = config.values;

    // Group data by row fields
    const rowGroups = groupBy(data, rowFields);
    console.log("Row groups created:", Object.keys(rowGroups).length);

    // If no columns, create simple pivot
    if (columnFields.length === 0) {
      const result = createSimplePivot(rowGroups, rowFields, valueConfigs);
      
      // Final duplicate check for simple pivot
      if (result.length > 0) {
        const allColumnNames = Object.keys(result[0]);
        const uniqueColumnNames = new Set(allColumnNames);
        if (allColumnNames.length !== uniqueColumnNames.size) {
          console.error("CRITICAL: Duplicate column names found in simple pivot result!");
          const duplicates = allColumnNames.filter((name, index) => allColumnNames.indexOf(name) !== index);
          console.error("Duplicate columns:", duplicates);
        }
      }
      
      return result;
    }

    // Create cross-tabulation pivot
    const result = createCrossTabPivot(rowGroups, rowFields, columnFields, valueConfigs, data);
    
    // Final duplicate check
    if (result.length > 0) {
      const allColumnNames = Object.keys(result[0]);
      const uniqueColumnNames = new Set(allColumnNames);
      if (allColumnNames.length !== uniqueColumnNames.size) {
        console.error("CRITICAL: Duplicate column names found in final result!");
        const duplicates = allColumnNames.filter((name, index) => allColumnNames.indexOf(name) !== index);
        console.error("Duplicate columns:", duplicates);
      }
    }
    
    return result;
  };

  // Create simple pivot (rows only)
  const createSimplePivot = (rowGroups, rowFields, valueConfigs) => {
    console.log("Creating simple pivot...");
    const result = [];

    Object.entries(rowGroups).forEach(([rowKey, items]) => {
      const row = {};
      
      // Add row values
      const rowValues = rowKey.split("|");
      rowFields.forEach((field, index) => {
        const displayValue = rowValues[index] === "(blank)" ? "" : rowValues[index];
        row[field] = displayValue;
      });

      // Add aggregated values with unique column names
      valueConfigs.forEach((valueConfig, index) => {
        const field = valueConfig.field;
        const aggregation = valueConfig.aggregation.toLowerCase();
        
        let value;
        switch (aggregation) {
          case "sum":
            value = sum(items, field);
            break;
          case "avg":
            value = average(items, field);
            break;
          case "count":
            value = count(items);
            break;
          case "min":
            value = min(items, field);
            break;
          case "max":
            value = max(items, field);
            break;
          default:
            value = sum(items, field);
        }
        
        // Create unique column name to avoid duplicates
        const uniqueFieldName = valueConfigs.length > 1 ? `${field}_${aggregation.toUpperCase()}` : field;
        row[uniqueFieldName] = value;
      });

      result.push(row);
    });

    console.log("Simple pivot created with", result.length, "rows");
    
    // Check for duplicate column names
    if (result.length > 0) {
      const columnNames = Object.keys(result[0]);
      const uniqueColumnNames = new Set(columnNames);
      if (columnNames.length !== uniqueColumnNames.size) {
        console.warn("Duplicate column names detected in simple pivot:", columnNames);
        const duplicates = columnNames.filter((name, index) => columnNames.indexOf(name) !== index);
        console.warn("Duplicate columns:", duplicates);
      } else {
        console.log("All column names are unique:", columnNames);
      }
    }
    
    return result;
  };

  // Create cross-tabulation pivot
  const createCrossTabPivot = (rowGroups, rowFields, columnFields, valueConfigs, originalData) => {
    console.log("Creating cross-tabulation pivot...");
    
    // Get all unique column combinations
    const columnCombinations = new Set();
    originalData.forEach(item => {
      const colKey = columnFields.map(field => {
        const value = item[field];
        if (value === null || value === undefined || value === "" || value === "\\N" || value === "N/A") {
          return "(blank)";
        }
        return String(value);
      }).join("|");
      columnCombinations.add(colKey);
    });

    console.log("Column combinations found:", Array.from(columnCombinations));
    
    // Create a mapping of column combinations to unique column names
    const columnNameMap = new Map();
    let columnIndex = 0;

    const result = [];

    Object.entries(rowGroups).forEach(([rowKey, rowItems]) => {
      const row = {};
      
      // Add row values
      const rowValues = rowKey.split("|");
      rowFields.forEach((field, index) => {
        const displayValue = rowValues[index] === "(blank)" ? "" : rowValues[index];
        row[field] = displayValue;
      });

      // Add column values
      columnCombinations.forEach(colKey => {
        const colValues = colKey.split("|");
        
        // Filter items that match this column combination
        const matchingItems = rowItems.filter(item => {
          return columnFields.every((field, index) => {
            const itemValue = item[field];
            const colValue = colValues[index];
            
            const itemNormalized = (itemValue === null || itemValue === undefined || itemValue === "" || itemValue === "\\N" || itemValue === "N/A") ? "(blank)" : String(itemValue);
            return itemNormalized === colValue;
          });
        });

        // Calculate aggregated values for this column combination
        valueConfigs.forEach((valueConfig, valueIndex) => {
          const field = valueConfig.field;
          const aggregation = valueConfig.aggregation.toLowerCase();
          
          let value;
          switch (aggregation) {
            case "sum":
              value = sum(matchingItems, field);
              break;
            case "avg":
              value = average(matchingItems, field);
              break;
            case "count":
              value = count(matchingItems);
              break;
            case "min":
              value = min(matchingItems, field);
              break;
            case "max":
              value = max(matchingItems, field);
              break;
            default:
              value = sum(matchingItems, field);
          }
          
          // Create unique column name for this combination
          let columnName;
          if (!columnNameMap.has(colKey)) {
            // Create a unique column name for this combination
            const colHeader = columnFields.map((field, index) => {
              const val = colValues[index];
              const displayValue = val === "(blank)" ? "Blank" : val;
              return `${field}: ${displayValue}`;
            }).join(" | ");
            
            columnName = `Col_${columnIndex}_${colHeader.replace(/[^a-zA-Z0-9]/g, '_')}`;
            columnNameMap.set(colKey, columnName);
            columnIndex++;
          } else {
            columnName = columnNameMap.get(colKey);
          }
          
          // Create unique cell key
          const cellKey = `${columnName}_${field}_${aggregation.toUpperCase()}`;
          
          row[cellKey] = value;
        });
      });

      result.push(row);
    });

    console.log("Cross-tabulation pivot created with", result.length, "rows");
    
    // Check for duplicate column names
    if (result.length > 0) {
      const columnNames = Object.keys(result[0]);
      const uniqueColumnNames = new Set(columnNames);
      if (columnNames.length !== uniqueColumnNames.size) {
        console.warn("Duplicate column names detected in cross-tabulation pivot:", columnNames);
        const duplicates = columnNames.filter((name, index) => columnNames.indexOf(name) !== index);
        console.warn("Duplicate columns:", duplicates);
      } else {
        console.log("All column names are unique:", columnNames);
      }
    }
    
    return result;
  };

  // Prepare column definitions for Handsontable
  const columnDefs = useMemo(() => {
    if (generatedPivotData && generatedPivotData.length > 0) {
      const firstRow = generatedPivotData[0];
      return Object.keys(firstRow).map((key) => {
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
    return [];
  }, [generatedPivotData]);

  // Get column headers with proper formatting
  const columnHeaders = useMemo(() => {
    if (generatedPivotData && generatedPivotData.length > 0) {
      const headers = Object.keys(generatedPivotData[0]);
      return headers.map(header => {
        // Clean up column headers for better display
        let cleanHeader = header;
        
        // Handle aggregation suffixes
        if (header.includes('_SUM')) {
          cleanHeader = header.replace('_SUM', ' (Sum)');
        } else if (header.includes('_AVG')) {
          cleanHeader = header.replace('_AVG', ' (Avg)');
        } else if (header.includes('_COUNT')) {
          cleanHeader = header.replace('_COUNT', ' (Count)');
        } else if (header.includes('_MIN')) {
          cleanHeader = header.replace('_MIN', ' (Min)');
        } else if (header.includes('_MAX')) {
          cleanHeader = header.replace('_MAX', ' (Max)');
        }
        
        // Clean up cross-tabulation headers
        if (cleanHeader.includes(' | ')) {
          // This is a cross-tabulation header, make it more readable
          cleanHeader = cleanHeader.replace(/\|/g, ' | ').trim();
        }
        
        // Handle cross-tabulation headers with field names and values
        if (cleanHeader.startsWith('Col_') && (cleanHeader.includes('_SUM') || cleanHeader.includes('_AVG') || cleanHeader.includes('_COUNT') || cleanHeader.includes('_MIN') || cleanHeader.includes('_MAX'))) {
          // This is a cross-tabulation header, extract the meaningful part
          const parts = cleanHeader.split('_');
          if (parts.length >= 4) {
            const fieldPart = parts[2]; // Skip 'Col' and index
            const valuePart = parts[3];
            const aggPart = parts[parts.length - 1];
            
            if (fieldPart && valuePart && aggPart) {
              cleanHeader = `${fieldPart} (${valuePart}) - ${aggPart}`;
            }
          }
        }
        
        return cleanHeader;
      });
    }
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
    renderAllRows: true,
    viewportRowRenderingOffset: "auto",
    stretchH: "all",
    readOnly: true,
  };

  const hotTableRef = useRef();

  // Export to CSV function
  const exportToCSV = () => {
    if (hotTableRef.current && hotTableRef.current.hotInstance) {
      const exportPlugin = hotTableRef.current.hotInstance.getPlugin("exportFile");
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

      const headers = Object.keys(generatedPivotData[0]);
      const csvContent = [
        headers.join(","),
        ...generatedPivotData.map(row => 
          headers.map(header => {
            const value = row[header];
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value || '';
          }).join(",")
        )
      ].join("\n");

      const blob = new Blob([csvContent], { 
        type: "application/vnd.ms-excel;charset=utf-8;" 
      });
      
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      link.download = `pivot-table-data_${dateStr}.xls`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log("Excel export completed successfully");
    } catch (error) {
      console.error("Error exporting to Excel:", error);
    }
  };

  // Comprehensive data validation function
  const validatePivotData = (pivotData, originalData, config) => {
    console.log("🔍 Starting comprehensive pivot data validation...");
    
    const validation = {
      isValid: true,
      issues: [],
      warnings: [],
      stats: {}
    };

    // Basic data checks
    if (!pivotData || pivotData.length === 0) {
      validation.isValid = false;
      validation.issues.push("No pivot data generated");
      return validation;
    }

    if (!originalData || originalData.length === 0) {
      validation.isValid = false;
      validation.issues.push("No original data available");
      return validation;
    }

    // Check data structure
    const firstRow = pivotData[0];
    const expectedRowFields = config.rows || [];
    const expectedValueFields = config.values || [];

    // Check if row fields are present
    expectedRowFields.forEach(field => {
      if (!firstRow.hasOwnProperty(field)) {
        validation.warnings.push(`Row field '${field}' not found in pivot data`);
      }
    });

    // Check if value fields are present (they might have aggregation suffixes)
    expectedValueFields.forEach(valueConfig => {
      const field = valueConfig.field;
      const aggregation = valueConfig.aggregation.toLowerCase();
      const expectedKey = `${field}_${aggregation.toUpperCase()}`;
      
      const hasValueField = Object.keys(firstRow).some(key => 
        key.includes(field) && key.includes(aggregation.toUpperCase())
      );
      
      if (!hasValueField) {
        validation.warnings.push(`Value field '${field}' with aggregation '${aggregation}' not found in pivot data`);
      }
    });

    // Check for duplicate column names
    const columnNames = Object.keys(firstRow);
    const duplicateColumns = columnNames.filter((name, index) => 
      columnNames.indexOf(name) !== index
    );
    
    if (duplicateColumns.length > 0) {
      validation.issues.push(`Duplicate column names found: ${duplicateColumns.join(', ')}`);
    }

    // Check data types and values
    pivotData.forEach((row, rowIndex) => {
      Object.entries(row).forEach(([key, value]) => {
        // Check for unexpected data types
        if (value !== null && value !== undefined && typeof value !== 'string' && typeof value !== 'number') {
          validation.warnings.push(`Row ${rowIndex}, column '${key}': Unexpected data type '${typeof value}'`);
        }
        
        // Check for NaN values
        if (typeof value === 'number' && isNaN(value)) {
          validation.issues.push(`Row ${rowIndex}, column '${key}': NaN value found`);
        }
      });
    });

    // Calculate statistics
    validation.stats = {
      totalRows: pivotData.length,
      totalColumns: Object.keys(firstRow).length,
      originalDataRows: originalData.length,
      dataReduction: originalData.length > 0 ? 
        ((originalData.length - pivotData.length) / originalData.length * 100).toFixed(1) + '%' : '0%',
      hasNumericData: Object.values(firstRow).some(v => typeof v === 'number'),
      hasNullValues: Object.values(firstRow).some(v => v === null || v === undefined),
      duplicateColumns: duplicateColumns.length
    };

    console.log("✅ Pivot data validation completed:", validation);
    return validation;
  };

  // Handle pivot configuration from PivotConfigPanel
  const handleDataGenerate = (config) => {
    console.log("Received pivot configuration:", config);

    if (!config || !config.rows || !config.values) {
      console.error("Invalid configuration received:", config);
      return;
    }

    setPivotConfig(config);
    setIsGenerated(true);
    setShowConfig(false);
    console.log("Pivot table generation initiated");
  };

  // Handle cancel from PivotConfigPanel
  const handleCancel = () => {
    setPivotConfig(null);
    setIsGenerated(false);
    setGeneratedPivotData([]);
    setShowConfig(false);
  };

  // Handle back - go back to configuration panel
  const handleBack = () => {
    console.log("Going back to pivot configuration");
    setShowConfig(true);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
      {/* Pivot Configuration Panel */}
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
            Configure the pivot table above and click "Generate Pivot Table"
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