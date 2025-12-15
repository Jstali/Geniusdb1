/**
 * Filter and process data based on view configuration
 * @param {Array} data - The raw data array
 * @param {Object} config - Configuration object with selectedColumns and filters
 * @returns {Array} - Filtered and processed data
 */
export function getActiveData(data, config = {}) {
  const { selectedColumns = [], filters = {} } = config;
  
  if (!data || !Array.isArray(data)) {
    return [];
  }

  let filteredData = [...data];

  // Apply filters if any exist
  if (filters && Object.keys(filters).length > 0) {
    filteredData = filteredData.filter((item) => {
      return Object.entries(filters).every(([key, filterValue]) => {
        // Skip empty filters
        if (filterValue === '' || filterValue === null || filterValue === undefined) {
          return true;
        }

        const itemValue = item[key];

        // Handle array filters (multi-select)
        if (Array.isArray(filterValue)) {
          if (filterValue.length === 0) return true;
          return filterValue.includes(itemValue);
        }

        // Handle string filters (case-insensitive partial match)
        if (typeof filterValue === 'string') {
          if (itemValue === null || itemValue === undefined) return false;
          return String(itemValue).toLowerCase().includes(filterValue.toLowerCase());
        }

        // Handle numeric filters
        if (typeof filterValue === 'number') {
          return Number(itemValue) === filterValue;
        }

        // Handle object filters (range filters, etc.)
        if (typeof filterValue === 'object' && !Array.isArray(filterValue)) {
          if (filterValue.min !== undefined || filterValue.max !== undefined) {
            const numValue = Number(itemValue);
            if (isNaN(numValue)) return false;
            
            if (filterValue.min !== undefined && numValue < filterValue.min) return false;
            if (filterValue.max !== undefined && numValue > filterValue.max) return false;
            
            return true;
          }
        }

        // Default: exact match
        return itemValue === filterValue;
      });
    });
  }

  // If selectedColumns is specified and not empty, filter to only those columns
  // Otherwise, return all data with all columns
  if (selectedColumns && selectedColumns.length > 0) {
    filteredData = filteredData.map((item) => {
      const filteredItem = {};
      selectedColumns.forEach((col) => {
        if (item.hasOwnProperty(col)) {
          filteredItem[col] = item[col];
        }
      });
      // Always preserve essential fields for map functionality
      if (item.latitude !== undefined) filteredItem.latitude = item.latitude;
      if (item.longitude !== undefined) filteredItem.longitude = item.longitude;
      if (item.id !== undefined) filteredItem.id = item.id;
      if (item.position !== undefined) filteredItem.position = item.position;
      
      return filteredItem;
    });
  }

  return filteredData;
}

/**
 * Extract map markers from data with proper coordinate validation
 * @param {Array} data - The data array containing location information
 * @param {Object} filters - Optional filters to apply
 * @returns {Array} - Array of valid map markers with coordinates
 */
export function extractMapMarkers(data, filters = {}) {
  if (!data || !Array.isArray(data)) {
    return [];
  }

  let processedData = [...data];

  // Apply filters if provided
  if (filters && Object.keys(filters).length > 0) {
    processedData = getActiveData(processedData, { filters });
  }

  // Helper function to determine marker color based on generation headroom
  const getMarkerColor = (headroom) => {
    if (headroom === null || headroom === undefined) {
      return "#808080"; // Gray for unknown values
    }

    if (headroom >= 50) {
      return "#008000"; // Green for high headroom
    } else if (headroom >= 20) {
      return "#FFA500"; // Orange for medium headroom
    } else {
      return "#FF0000"; // Red for low headroom
    }
  };

  // Extract and validate markers
  const markers = processedData
    .map((item, index) => {
      // Try to get coordinates from different possible field names
      let lat = item.latitude || item.Latitude || item.lat;
      let lng = item.longitude || item.Longitude || item.lng || item.lon;

      // Check for Spatial Coordinates if lat/lng are missing
      if ((lat === undefined || lng === undefined) && item["Spatial Coordinates"]) {
        const coords = item["Spatial Coordinates"].split(",").map(c => parseFloat(c.trim()));
        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
          lat = coords[0];
          lng = coords[1];
        }
      }

      // Parse coordinates if they're strings
      if (typeof lat === 'string') lat = parseFloat(lat);
      if (typeof lng === 'string') lng = parseFloat(lng);

      // Validate coordinates
      if (
        lat === null || 
        lat === undefined || 
        lng === null || 
        lng === undefined ||
        isNaN(lat) || 
        isNaN(lng) ||
        lat < -90 || 
        lat > 90 ||
        lng < -180 || 
        lng > 180
      ) {
        return null; // Invalid coordinates
      }

      // Get generation headroom for color coding
      const headroom = item["Generation Headroom Mw"] || item.generation_headroom || null;

      return {
        ...item,
        id: item.id || index,
        position: { lat, lng }, // Google Maps format
        latitude: lat,
        longitude: lng,
        siteName: item["Site Name"] || item.site_name || "Unknown Site",
        siteVoltage: item["Site Voltage"] || item.site_voltage || "Unknown",
        generationHeadroom: headroom,
        county: item.County || item.county || "Unknown",
        licenceArea: item["Licence Area"] || item.licence_area || "Unknown",
        color: getMarkerColor(headroom), // Add color property for marker rendering
      };
    })
    .filter((marker) => marker !== null); // Remove invalid markers

  return markers;
}
