import React, { useState, useEffect, useRef, useMemo } from "react";
import GoogleMapComponent from "./GoogleMapComponent";

// Function to determine marker color based on generation headroom
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

// Custom marker icon component - using location pin symbol
const createMarkerIcon = (color, isClicked = false) => {
  const scale = isClicked ? 1.8 : 1.2; // Larger scale when clicked

  // Check if google.maps is available
  if (typeof google === "undefined" || !google || !google.maps) {
    // Fallback to location pin SVG path if Google Maps API is not loaded
    return {
      path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
      fillColor: color,
      fillOpacity: 1,
      strokeColor: "white",
      strokeWeight: isClicked ? 3 : 2, // Thicker stroke when clicked
      scale: scale,
      anchor: { x: 12, y: 24 }, // Anchor point at the bottom of the pin
    };
  }

  // Use a custom location pin SVG path
  return {
    path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "white",
    strokeWeight: isClicked ? 3 : 2, // Thicker stroke when clicked
    scale: scale,
    anchor: new google.maps.Point(12, 24), // Anchor point at the bottom of the pin
  };
};

const MapSection = ({
  data = [],
  filters = {},
  onMarkerClick,
  activeView = null,
  selectedColumns = [],
}) => {
  const [markers, setMarkers] = useState([]);
  const [clickedMarkerId, setClickedMarkerId] = useState(null); // Track which marker is clicked
  const [loading, setLoading] = useState(true); // Start with loading true
  const [error, setError] = useState(null);
  const [lastSuccessfulMarkers, setLastSuccessfulMarkers] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const abortControllerRef = useRef(null);

  // Get API base URL from environment or default to localhost:8000
  const API_BASE = (window._env_ && window._env_.API_BASE) || "";

  console.log("MapSection received props:", {
    dataLength: data?.length || 0,
    filters,
    activeView,
    selectedColumns: selectedColumns?.length || 0,
    dataSample: data?.slice(0, 2),
  });

  // Convert frontend filters to backend format
  const convertFilters = (frontendFilters) => {
    const backendFilters = {};

    // Site Name filter
    if (frontendFilters.siteName && frontendFilters.siteName.trim() !== "") {
      backendFilters["site_name"] = frontendFilters.siteName.trim();
    }

    // Voltage Level filter
    if (frontendFilters.voltage && frontendFilters.voltage !== "") {
      backendFilters["voltage_level"] = frontendFilters.voltage;
    }

    // Available Power filter - use min value for >= comparison
    if (
      frontendFilters.powerRange &&
      frontendFilters.powerRange.min !== undefined &&
      frontendFilters.powerRange.min > 0
    ) {
      backendFilters["available_power"] = frontendFilters.powerRange.min;
    }

    // Network Operator filter
    if (frontendFilters.operators && frontendFilters.operators !== "") {
      backendFilters["network_operator"] = frontendFilters.operators;
    }

    return backendFilters;
  };

  // Fetch filtered map data from backend when filters or active view changes
  useEffect(() => {
    const fetchFilteredMapData = async () => {
      // Cancel any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        setLoading(true);
        setError(null);

        // If we have an active view, use the new backend endpoint
        if (activeView) {
          console.log(
            "MapSection: Fetching filtered map data with active view",
            {
              activeView,
              filters,
            }
          );

          // Convert frontend filters to backend format
          const backendFilters = convertFilters(filters);

          // Log filters before sending to backend
          console.log("Sending filters to backend:", backendFilters);

          // Prepare the request payload with the correct structure
          // Use selectedColumns from saved view if available, otherwise use default location columns
          const defaultLocationColumns = [
            "site_name",
            "latitude",
            "longitude",
            "voltage_level",
            "available_power",
            "network_operator",
          ];

          let columnsToUse;
          if (selectedColumns && selectedColumns.length > 0) {
            // Add location columns if they're not already included
            const locationColumns = ["latitude", "longitude", "site_name"];
            columnsToUse = [
              ...new Set([...selectedColumns, ...locationColumns]),
            ];
          } else {
            columnsToUse = defaultLocationColumns;
          }

          console.log("=== MAP SECTION DEBUG ===");
          console.log(
            "MapSection: selectedColumns from props:",
            selectedColumns
          );
          console.log(
            "MapSection: selectedColumns length:",
            selectedColumns?.length || 0
          );
          console.log(
            "MapSection: Using columns for saved view map data:",
            columnsToUse
          );
          console.log(
            "MapSection: columnsToUse length:",
            columnsToUse?.length || 0
          );
          console.log("=========================");

          const payload = {
            filters: backendFilters,
            selected_columns: columnsToUse,
          };

          // Make request to the new backend endpoint
          const response = await fetch(
            `${API_BASE}/data/views/${activeView}/map-data?user_id=1`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
              signal: abortControllerRef.current.signal,
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();
          console.log("MapSection: Received filtered map data", result);

          if (result.error) {
            throw new Error(result.error);
          }

          // Transform backend response to markers with proper numeric parsing
          const transformedMarkers = result.rows
            .map((row, index) => {
              const lat = parseFloat(row.latitude);
              const lng = parseFloat(row.longitude);

              // Only include sites with valid coordinates
              if (isNaN(lat) || isNaN(lng)) {
                return null;
              }

              return {
                id: `${row.site_name}-${index}`,
                position: { lat, lng },
                popupText: `${row.site_name}`,
                siteName: row.site_name,
                siteVoltage: row.voltage_level,
                generationHeadroom: row.available_power,
                licenceArea: row.network_operator,
                color: getMarkerColor(row.available_power),
                ...row,
              };
            })
            .filter((marker) => marker !== null); // Remove null markers

          console.log("Setting markers from active view:", transformedMarkers);
          setMarkers(transformedMarkers);
          setLastSuccessfulMarkers(transformedMarkers);
          setDataLoaded(true);
        } else {
          // Data comes from MapView with filters already applied, so use it directly
          console.log(
            "MapSection: Using data from MapView (already filtered)",
            {
              dataLength: data.length,
              dataKeys: data.length > 0 ? Object.keys(data[0]) : [],
            }
          );

          // Transform the data into markers (no additional filtering needed)
          const transformedMarkers = data
            .map((site, index) => {
              // Get coordinates directly from the data
              const lat = site.latitude;
              const lng = site.longitude;

              console.log(`Processing site ${index}:`, {
                siteName: site["Site Name"] || site.site_name,
                lat,
                lng,
                isValid: !(!lat || !lng || isNaN(lat) || isNaN(lng)),
              });

              // Validate that lat and lng are valid numbers
              if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
                console.log(`Skipping site ${index} - invalid coordinates:`, {
                  lat,
                  lng,
                });
                return null;
              }

              return {
                id: `${site["Site Name"] || site.site_name || "Site"}-${index}`,
                position: { lat, lng },
                popupText:
                  site["Site Name"] || site.site_name || "Unknown Site",
                siteName: site["Site Name"] || site.site_name || "Unknown Site",
                siteType: site["Site Type"] || site.site_type || "Unknown",
                siteVoltage:
                  site["Site Voltage"] || site.site_voltage || "Unknown",
                county: site["County"] || site.county || "Unknown",
                generationHeadroom:
                  site["Generation Headroom Mw"] || site.generation_headroom,
                licenceArea:
                  site["Licence Area"] || site.licence_area || "Unknown",
                color: getMarkerColor(
                  site["Generation Headroom Mw"] || site.generation_headroom
                ),
                ...site,
              };
            })
            .filter((marker) => marker !== null); // Remove null markers

          console.log(
            "Setting markers from backend data:",
            transformedMarkers.length,
            "markers"
          );
          console.log(
            "Sample marker IDs:",
            transformedMarkers.slice(0, 3).map((m) => m.id)
          );
          setMarkers(transformedMarkers);
          setLastSuccessfulMarkers(transformedMarkers);
          setDataLoaded(true);
        }
      } catch (err) {
        if (err.name === "AbortError") {
          console.log("MapSection: Request was cancelled");
          return; // Exit early if request was cancelled
        }

        console.error("MapSection: Error fetching map data:", err);
        setError(err.message || "Failed to fetch map data");
        setMarkers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFilteredMapData();

    // Cleanup function to cancel any ongoing requests
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [data, activeView, filters]);

  // Fallback mechanism: if markers are empty but we have successful markers, restore them
  useEffect(() => {
    if (
      markers.length === 0 &&
      lastSuccessfulMarkers.length > 0 &&
      !loading &&
      dataLoaded
    ) {
      console.log("MapSection: Restoring markers from last successful state");
      setMarkers(lastSuccessfulMarkers);
    }
  }, [markers, lastSuccessfulMarkers, loading, dataLoaded]);

  console.log("MapSection rendering with markers:", markers);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <strong className="font-bold">Error! </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full" style={{ zIndex: "1" }}>
      <div className="map-container relative w-full overflow-hidden h-[700px]">
        <GoogleMapComponent
          key={`map-${markers.length}`}
          data={data}
          filters={filters}
          onMarkerClick={onMarkerClick}
          activeView={activeView}
          markers={markers}
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
                    <div className="w-4 h-4 rounded-full bg-green-500 flex-shrink-0"></div>
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
    </div>
  );
};

export default MapSection;
