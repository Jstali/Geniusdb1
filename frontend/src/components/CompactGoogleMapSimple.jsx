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

  // Process data prop to create markers
  useEffect(() => {
    console.log("CompactGoogleMapSimple: Processing data prop", {
      dataLength: data.length,
      activeView,
      selectedColumns,
      locationColumn,
      sampleData: data.slice(0, 2)
    });

    if (data && data.length > 0) {
      console.log("CompactGoogleMapSimple: Sample data structure:", {
        firstRow: data[0],
        firstRowKeys: data[0] ? Object.keys(data[0]) : [],
        hasLatitude: data[0]?.latitude !== undefined,
        hasLongitude: data[0]?.longitude !== undefined,
        hasSpatialCoordinates: data[0]?.["Spatial Coordinates"] !== undefined
      });

      const processedMarkers = extractMapMarkers(data, locationColumn);
      console.log("CompactGoogleMapSimple: Processed markers from data prop:", processedMarkers.length);
      setMarkers(processedMarkers);
      setLoading(false);
    } else {
      console.log("CompactGoogleMapSimple: No data provided, clearing markers");
      setMarkers([]);
      setLoading(false);
    }
  }, [data, locationColumn, activeView, selectedColumns]);

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
