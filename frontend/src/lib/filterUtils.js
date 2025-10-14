/**
 * Utility functions for applying filters consistently across all components
 */

/**
 * Apply filters to data consistently
 * @param {Array} data - The raw data array
 * @param {Object} filters - The filters object
 * @param {Array} selectedColumns - The selected columns array
 * @returns {Array} - Filtered data
 */
export const applyFilters = (data, filters = {}, selectedColumns = []) => {
  console.log("applyFilters called with:", {
    dataLength: data?.length || 0,
    filters,
    selectedColumns,
    selectedColumnsLength: selectedColumns?.length || 0
  });

  if (!data || !Array.isArray(data)) {
    console.log("applyFilters: No data or not array, returning empty array");
    return [];
  }

  let filteredData = [...data];
  console.log("applyFilters: Starting with", filteredData.length, "rows");

  // Apply column filters
  if (filters && typeof filters === 'object') {
    Object.entries(filters).forEach(([columnId, filterValues]) => {
      if (columnId === '_global') {
        // Apply global search filter
        if (filterValues && filterValues.trim() !== '') {
          const searchTerm = filterValues.toLowerCase();
          filteredData = filteredData.filter(row => {
            return Object.values(row).some(value => 
              String(value).toLowerCase().includes(searchTerm)
            );
          });
        }
      } else if (filterValues && Array.isArray(filterValues) && filterValues.length > 0) {
        // Apply column-specific filter
        filteredData = filteredData.filter(row => {
          const rowValue = row[columnId];
          return filterValues.some(filterValue => {
            if (typeof filterValue === 'string') {
              return String(rowValue).toLowerCase().includes(filterValue.toLowerCase());
            }
            return String(rowValue) === String(filterValue);
          });
        });
      }
    });
  }

  // Apply column selection filter (only include rows that have data for selected columns)
  // Only apply this filter if we have selected columns AND we're in a saved view context
  // For now, let's be less restrictive and only filter out rows with completely missing data
  if (selectedColumns && selectedColumns.length > 0) {
    // Only filter out rows that are completely missing essential data
    // Don't filter based on selected columns as this is too restrictive
    filteredData = filteredData.filter(row => {
      // Only require that the row has some basic identifying information
      return row.id || row["Site Name"] || row.site_name || row["Spatial Coordinates"];
    });
  }
  // If no selectedColumns, return all data (for home page default view)

  console.log("applyFilters: Final result", {
    originalLength: data.length,
    filteredLength: filteredData.length,
    sampleFilteredData: filteredData.slice(0, 2)
  });

  return filteredData;
};

/**
 * Function to determine marker color based on generation headroom
 * @param {number} headroom - The generation headroom value
 * @returns {string} - The color hex code
 */
const getMarkerColor = (headroom) => {
  if (headroom === null || headroom === undefined) {
    return "#808080"; // Gray for unknown values
  }

  if (headroom >= 50) {
    return "#008000"; // Green for 50MW and greater
  } else if (headroom >= 20) {
    return "#FFA500"; // Amber for 20MW to 50MW
  } else {
    return "#FF0000"; // Red for less than 20MW
  }
};

/**
 * Extract map markers from filtered data
 * @param {Array} filteredData - The filtered data array
 * @param {string} locationColumn - The column to use for location (default: "Site Name")
 * @returns {Array} - Array of map markers
 */
export const extractMapMarkers = (filteredData, locationColumn = "Site Name") => {
  console.log("extractMapMarkers called with:", {
    filteredDataLength: filteredData?.length || 0,
    locationColumn,
    sampleRow: filteredData?.[0]
  });

  if (!filteredData || !Array.isArray(filteredData)) {
    console.log("extractMapMarkers: No data or not array, returning empty array");
    return [];
  }

  const markers = filteredData
    .map((row, index) => {
      console.log(`Processing row ${index}:`, {
        rowKeys: Object.keys(row),
        latitude: row.latitude,
        longitude: row.longitude,
        spatialCoordinates: row["Spatial Coordinates"],
        spatial_coordinates: row["spatial_coordinates"],
        siteName: row.site_name || row["Site Name"],
        site_name: row.site_name,
        "Site Name": row["Site Name"]
      });

      // Try to get coordinates from various possible column names
      let lat, lng;
      
      // Check for latitude/longitude columns first
      if (row.latitude && row.longitude) {
        lat = parseFloat(row.latitude);
        lng = parseFloat(row.longitude);
        console.log(`Row ${index}: Using latitude/longitude columns: lat=${lat}, lng=${lng}`);
      } else if (row["Spatial Coordinates"]) {
        // Parse spatial coordinates if available (format: "lat, lng")
        const coords = row["Spatial Coordinates"];
        console.log(`Row ${index}: Spatial Coordinates found:`, coords);
        if (typeof coords === 'string' && coords.includes(',')) {
          const [latStr, lngStr] = coords.split(',').map(s => s.trim());
          lat = parseFloat(latStr);
          lng = parseFloat(lngStr);
          console.log(`Row ${index}: Parsed spatial coordinates: lat=${lat}, lng=${lng}`);
        }
      } else if (row["spatial_coordinates"]) {
        // Try lowercase version
        const coords = row["spatial_coordinates"];
        console.log(`Row ${index}: spatial_coordinates found:`, coords);
        if (typeof coords === 'string' && coords.includes(',')) {
          const [latStr, lngStr] = coords.split(',').map(s => s.trim());
          lat = parseFloat(latStr);
          lng = parseFloat(lngStr);
          console.log(`Row ${index}: Parsed spatial_coordinates: lat=${lat}, lng=${lng}`);
        }
      } else {
        console.log(`Row ${index}: No coordinates found in any expected field`);
        console.log(`Row ${index}: Available fields:`, Object.keys(row));
      }

      // Skip if no valid coordinates
      if (isNaN(lat) || isNaN(lng)) {
        console.log(`Row ${index}: Invalid coordinates, skipping: lat=${lat}, lng=${lng}`);
        return null;
      }

      // Get generation headroom for color calculation
      const generationHeadroom = parseFloat(row["Generation Headroom Mw"] || row.available_power || 0);
      const markerColor = getMarkerColor(generationHeadroom);
      
      console.log(`Row ${index}: Color calculation:`, {
        generationHeadroom,
        markerColor,
        rawValue: row["Generation Headroom Mw"] || row.available_power
      });
      
      const marker = {
        id: `marker-${index}`,
        position: { lat, lng },
        site_name: row["Site Name"] || row.site_name || `Site ${index}`,
        voltage_level: row["Site Voltage"] || row.voltage_level,
        available_power: row["Generation Headroom Mw"] || row.available_power,
        network_operator: row["Licence Area"] || row.network_operator,
        generationHeadroom: generationHeadroom,
        color: markerColor,
        data: row // Include full row data for marker click handling
      };

      console.log(`Row ${index}: Created marker:`, marker);
      return marker;
    })
    .filter(marker => marker !== null);

  console.log("extractMapMarkers result:", {
    totalRows: filteredData.length,
    validMarkers: markers.length,
    sampleMarkers: markers.slice(0, 2)
  });

  return markers;
};

/**
 * Get the active dataset for a view
 * @param {Array} fullDataset - The complete dataset
 * @param {Object} viewConfig - The view configuration
 * @returns {Array} - The active filtered dataset
 */
export const getActiveData = (fullDataset, viewConfig) => {
  console.log("getActiveData called with:", {
    fullDatasetLength: fullDataset?.length || 0,
    viewConfig,
    selectedColumns: viewConfig?.selectedColumns,
    filters: viewConfig?.filters
  });

  if (!viewConfig) {
    console.log("getActiveData: No viewConfig, returning fullDataset");
    return fullDataset;
  }

  const { selectedColumns = [], filters = {} } = viewConfig;
  const result = applyFilters(fullDataset, filters, selectedColumns);
  
  console.log("getActiveData result:", {
    originalLength: fullDataset?.length || 0,
    filteredLength: result.length,
    sampleResult: result.slice(0, 2)
  });
  
  return result;
};
