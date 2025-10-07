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
}) => {
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  console.log("CompactGoogleMapSimple received props:", {
    isHomePage,
    dataLength: data?.length || 0,
    activeView,
    selectedColumns,
    locationColumn
  });

  // Apply filters to data and create markers
  const filteredData = useMemo(() => {
    console.log("CompactGoogleMapSimple: Applying filters", {
      originalDataLength: data.length,
      filters,
      sampleFilters: filters
    });

    if (!data || data.length === 0) {
      return [];
    }

    let filtered = [...data];

    // Apply site name filter
    if (filters.siteName && filters.siteName.trim() !== "") {
      const searchTerm = filters.siteName.toLowerCase();
      filtered = filtered.filter(site => {
        const siteName = site.site_name || site["Site Name"] || "";
        return siteName.toLowerCase().includes(searchTerm);
      });
      console.log("CompactGoogleMapSimple: After site name filter:", filtered.length);
    }

    // Apply voltage filter
    if (filters.voltage && filters.voltage !== "") {
      filtered = filtered.filter(site => {
        const siteVoltage = site.site_voltage || site["Site Voltage"];
        return String(siteVoltage) === String(filters.voltage);
      });
      console.log("CompactGoogleMapSimple: After voltage filter:", filtered.length);
    }

    // Apply power range filter
    if (filters.powerRange && filters.powerRange.min !== undefined && filters.powerRange.min > 0) {
      filtered = filtered.filter(site => {
        const headroom = parseFloat(site.generation_headroom || site["Generation Headroom Mw"] || 0);
        return headroom >= filters.powerRange.min;
      });
      console.log("CompactGoogleMapSimple: After power range filter:", filtered.length);
    }

    // Apply operator filter
    if (filters.operators && filters.operators !== "") {
      filtered = filtered.filter(site => {
        const operator = site.licence_area || site["Licence Area"];
        return operator === filters.operators;
      });
      console.log("CompactGoogleMapSimple: After operator filter:", filtered.length);
    }

    console.log("CompactGoogleMapSimple: Final filtered data length:", filtered.length);
    return filtered;
  }, [data, filters]);

  // Process filtered data to create markers
  useEffect(() => {
    console.log("CompactGoogleMapSimple: Processing filtered data", {
      filteredDataLength: filteredData.length,
      activeView,
      selectedColumns,
      locationColumn,
      sampleData: filteredData.slice(0, 2)
    });

    if (filteredData && filteredData.length > 0) {
      console.log("CompactGoogleMapSimple: Sample filtered data structure:", {
        firstRow: filteredData[0],
        firstRowKeys: filteredData[0] ? Object.keys(filteredData[0]) : [],
        hasLatitude: filteredData[0]?.latitude !== undefined,
        hasLongitude: filteredData[0]?.longitude !== undefined,
        hasSpatialCoordinates: filteredData[0]?.["Spatial Coordinates"] !== undefined
      });

      const processedMarkers = extractMapMarkers(filteredData, locationColumn);
      console.log("CompactGoogleMapSimple: Processed markers from filtered data:", processedMarkers.length);
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
    <div className="w-full h-full">
      <GoogleMapComponent
        markers={markers}
        onMarkerClick={handleMarkerClick}
        isHomePage={isHomePage}
        loading={loading}
        error={error}
        mapConfig={homePageMapConfig}
      />
    </div>
  );
};

export default CompactGoogleMapSimple;
