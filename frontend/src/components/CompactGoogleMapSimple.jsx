import React, { useState, useEffect, useRef, useMemo } from "react";
import GoogleMapComponent from "./GoogleMapComponent";
import { extractMapMarkers } from "../lib/filterUtils";

// Function to determine marker color based on generation headroom
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

// Map configuration for home page
const homePageMapConfig = {
  center: { lat: 52.0, lng: 0.0 },
  zoom: 7,
  bounds: "disabled", // Disable auto-fitting for home page
  controls: {
    zoom: true,
    mapType: true,
    fullscreen: false, // Disable for home page
    layers: false, // Simplified for overview
  },
};

const CompactGoogleMapSimple = ({
  isHomePage = false,
  data = [],
  filters = {},
  onMarkerClick,
  selectedColumns = [],
  activeView = null,
  locationColumn = "Site Name",
  useTableFilters = true, // New prop to control whether to use pre-filtered data
}) => {
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  console.log("CompactGoogleMapSimple received props:", {
    isHomePage,
    dataLength: data?.length || 0,
    activeView,
    selectedColumns,
    locationColumn,
    useTableFilters,
    hasFilters: Object.keys(filters || {}).some(
      (key) => filters[key] && filters[key] !== ""
    ),
  });

  // Apply filters to data and create markers
  // If useTableFilters is true, ALWAYS use data as-is (already filtered by table)
  // Only apply sidebar filters when explicitly set
  const filteredData = useMemo(() => {
    console.log("CompactGoogleMapSimple: Processing data", {
      originalDataLength: data.length,
      filters,
      useTableFilters,
      sampleFilters: filters,
      dataPreview: data.slice(0, 2),
    });

    if (!data || data.length === 0) {
      console.log(
        "CompactGoogleMapSimple: No data provided, returning empty array"
      );
      return [];
    }

    // Check if sidebar filters are active
    const hasSidebarFilters =
      (filters.siteName && filters.siteName.trim() !== "") ||
      (filters.voltage && filters.voltage !== "") ||
      (filters.powerRange &&
        filters.powerRange.min !== undefined &&
        filters.powerRange.min > 0) ||
      (filters.operators && filters.operators !== "");

    console.log("CompactGoogleMapSimple: Sidebar filters status:", {
      hasSidebarFilters,
      siteName: filters.siteName || "none",
      voltage: filters.voltage || "none",
      powerRange: filters.powerRange?.min || "none",
      operators: filters.operators || "none",
    });

    // PRIORITY 1: If using table filters and no sidebar filters, use data directly
    if (useTableFilters && !hasSidebarFilters) {
      console.log(
        "CompactGoogleMapSimple: ✅ Using pre-filtered TABLE data directly (no sidebar filters active)"
      );
      console.log(
        "CompactGoogleMapSimple: Returning",
        data.length,
        "sites from table filter"
      );
      return data; // Data is already filtered by the table
    }

    // PRIORITY 2: Apply sidebar filters
    console.log("CompactGoogleMapSimple: Applying SIDEBAR filters to data");
    let filtered = [...data];

    // Apply site name filter
    if (filters.siteName && filters.siteName.trim() !== "") {
      const searchTerm = filters.siteName.toLowerCase();
      filtered = filtered.filter((site) => {
        const siteName = site.site_name || site["Site Name"] || "";
        return siteName.toLowerCase().includes(searchTerm);
      });
      console.log(
        "CompactGoogleMapSimple: After site name filter:",
        filtered.length
      );
    }

    // Apply voltage filter
    if (filters.voltage && filters.voltage !== "") {
      filtered = filtered.filter((site) => {
        const siteVoltage = site.site_voltage || site["Site Voltage"];
        return String(siteVoltage) === String(filters.voltage);
      });
      console.log(
        "CompactGoogleMapSimple: After voltage filter:",
        filtered.length
      );
    }

    // Apply power range filter
    if (
      filters.powerRange &&
      filters.powerRange.min !== undefined &&
      filters.powerRange.min > 0
    ) {
      filtered = filtered.filter((site) => {
        const headroom = parseFloat(
          site.generation_headroom || site["Generation Headroom Mw"] || 0
        );
        return headroom >= filters.powerRange.min;
      });
      console.log(
        "CompactGoogleMapSimple: After power range filter:",
        filtered.length
      );
    }

    // Apply operator filter
    if (filters.operators && filters.operators !== "") {
      filtered = filtered.filter((site) => {
        const operator = site.licence_area || site["Licence Area"];
        return operator === filters.operators;
      });
      console.log(
        "CompactGoogleMapSimple: After operator filter:",
        filtered.length
      );
    }

    console.log(
      "CompactGoogleMapSimple: Final filtered data length:",
      filtered.length
    );
    return filtered;
  }, [data, filters, useTableFilters]);

  // Process filtered data to create markers
  useEffect(() => {
    console.log("CompactGoogleMapSimple: Processing filtered data", {
      filteredDataLength: filteredData.length,
      activeView,
      selectedColumns,
      locationColumn,
      sampleData: filteredData.slice(0, 2),
    });

    if (filteredData && filteredData.length > 0) {
      console.log("CompactGoogleMapSimple: Sample filtered data structure:", {
        firstRow: filteredData[0],
        firstRowKeys: filteredData[0] ? Object.keys(filteredData[0]) : [],
        hasLatitude: filteredData[0]?.latitude !== undefined,
        hasLongitude: filteredData[0]?.longitude !== undefined,
        hasSpatialCoordinates:
          filteredData[0]?.["Spatial Coordinates"] !== undefined,
      });

      const processedMarkers = extractMapMarkers(filteredData, locationColumn);
      console.log(
        "CompactGoogleMapSimple: Processed markers from filtered data:",
        processedMarkers.length
      );
      setMarkers(processedMarkers);
      setLoading(false);
    } else {
      console.log("CompactGoogleMapSimple: No filtered data, clearing markers");
      setMarkers([]);
      setLoading(false);
    }
  }, [filteredData, locationColumn, activeView, selectedColumns]);

  // Handle marker click
  const handleMarkerClick = (marker) => {
    console.log("CompactGoogleMapSimple: Marker clicked", marker);
    if (onMarkerClick) {
      onMarkerClick(marker.data || marker);
    }
  };

  return (
    <div className="w-full h-full relative">
      <GoogleMapComponent
        markers={markers}
        onMarkerClick={handleMarkerClick}
        isHomePage={isHomePage}
        loading={loading}
        error={error}
        mapConfig={homePageMapConfig}
      />

      {/* Info Button with Hover Popup */}
      <div className="absolute top-4 right-4 z-10">
        <div className="relative group">
          {/* Info Button */}
          <button
            className="w-8 h-8 bg-white rounded-full shadow-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:shadow-xl transition-all duration-200"
            title="Pin Color Legend"
          >
            <span className="text-sm font-bold">i</span>
          </button>

          {/* Hover Popup */}
          <div className="absolute top-10 right-0 w-64 bg-white rounded-lg shadow-xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">
                Pin Color Legend
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 rounded-full bg-geniusAquamarine flex-shrink-0"></div>
                  <span className="text-gray-700">
                    Green - 50MW Generation Headroom and greater
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 rounded-full bg-orange-500 flex-shrink-0"></div>
                  <span className="text-gray-700">Amber - 20MW to 50MW</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 rounded-full bg-red-500 flex-shrink-0"></div>
                  <span className="text-gray-700">Red - Less than 20MW</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Risk level based on Generation Headroom values
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompactGoogleMapSimple;
