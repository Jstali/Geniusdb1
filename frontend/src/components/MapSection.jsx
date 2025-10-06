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
const createMarkerIcon = (color) => {
  // Check if google.maps is available
  if (typeof google === "undefined" || !google || !google.maps) {
    // Fallback to location pin SVG path if Google Maps API is not loaded
    return {
      path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
      fillColor: color,
      fillOpacity: 1,
      strokeColor: "white",
      strokeWeight: 2,
      scale: 1.5,
      anchor: { x: 12, y: 24 }, // Anchor point at the bottom of the pin
    };
  }

  // Use a custom location pin SVG path
  return {
    path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "white",
    strokeWeight: 2,
    scale: 1.2,
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
  const [loading, setLoading] = useState(true); // Start with loading true
  const [error, setError] = useState(null);
  const [lastSuccessfulMarkers, setLastSuccessfulMarkers] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const abortControllerRef = useRef(null);

  // Get API base URL from environment or default to localhost:8000
  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

  console.log("MapSection received props:", { data, filters, activeView });

  // Convert frontend filters to backend format
  const convertFilters = (frontendFilters) => {
    const backendFilters = {};

    // Site Name filter
    if (frontendFilters.siteName && frontendFilters.siteName.trim() !== "") {
      backendFilters["site_name"] = [
        { op: "contains", value: frontendFilters.siteName.trim() },
      ];
    }

    // Voltage Level filter
    if (frontendFilters.voltage && frontendFilters.voltage.length > 0) {
      backendFilters["voltage_level"] = [
        { op: "in", value: frontendFilters.voltage },
      ];
    }

    // Available Power filter
    if (
      frontendFilters.powerRange &&
      frontendFilters.powerRange.max !== undefined
    ) {
      backendFilters["available_power"] = [
        { op: ">", value: frontendFilters.powerRange.max },
      ];
    }

    // Network Operator filter
    if (frontendFilters.operators && frontendFilters.operators.length > 0) {
      backendFilters["network_operator"] = [
        { op: "in", value: frontendFilters.operators },
      ];
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
            columnsToUse = [...new Set([...selectedColumns, ...locationColumns])];
          } else {
            columnsToUse = defaultLocationColumns;
          }
          
          console.log("=== MAP SECTION DEBUG ===");
          console.log("MapSection: selectedColumns from props:", selectedColumns);
          console.log("MapSection: selectedColumns length:", selectedColumns?.length || 0);
          console.log("MapSection: Using columns for saved view map data:", columnsToUse);
          console.log("MapSection: columnsToUse length:", columnsToUse?.length || 0);
          console.log("=========================");
          
          const payload = {
            filters: backendFilters,
            selected_columns: columnsToUse,
          };

          // Make request to the new backend endpoint
          const response = await fetch(
            `${API_BASE}/api/views/${activeView}/map-data?user_id=1`,
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
          // Fallback to client-side filtering if no active view
          console.log(
            "MapSection: Processing map data with client-side filters...",
            {
              filters,
              dataLength: data.length,
            }
          );

          // Apply filters to the data
          const filteredData = data.filter((site) => {
            // Site name filter
            if (filters.siteName && filters.siteName.trim() !== "") {
              const siteName = site["Site Name"] || "";
              if (
                !siteName.toLowerCase().includes(filters.siteName.toLowerCase())
              ) {
                return false;
              }
            }

            // Voltage filter
            if (filters.voltage && filters.voltage.length > 0) {
              const siteVoltage = site["Site Voltage"];
              if (siteVoltage && !filters.voltage.includes(siteVoltage)) {
                return false;
              }
            }

            // Power range filter
            if (filters.powerRange) {
              const headroom = site["Generation Headroom Mw"];
              if (
                headroom !== undefined &&
                headroom !== null &&
                !isNaN(headroom)
              ) {
                if (headroom > filters.powerRange.max) {
                  return false;
                }
              }
            }

            // Operator filter
            if (filters.operators && filters.operators.length > 0) {
              const licenceArea = site["Licence Area"];
              if (licenceArea && !filters.operators.includes(licenceArea)) {
                return false;
              }
            }

            // Check if site has valid coordinates
            const spatialCoords = site["Spatial Coordinates"];
            if (!spatialCoords || spatialCoords === "\\N") {
              return false;
            }

            return true;
          });

          console.log("Filtered data count:", filteredData.length);

          // Transform the filtered data into markers with proper numeric parsing
          const transformedMarkers = filteredData
            .map((site, index) => {
              // Get spatial coordinates (format: "lat, lng")
              const spatialCoords = site["Spatial Coordinates"];
              if (!spatialCoords || spatialCoords === "\\N") {
                return null;
              }

              try {
                // Parse coordinates (format: "lat, lng")
                const coords = spatialCoords
                  .split(",")
                  .map((coord) => parseFloat(coord.trim()));
                if (
                  coords.length !== 2 ||
                  isNaN(coords[0]) ||
                  isNaN(coords[1])
                ) {
                  return null;
                }

                const [lat, lng] = coords;

                // Validate that lat and lng are valid numbers
                if (isNaN(lat) || isNaN(lng)) {
                  return null;
                }

                return {
                  id: `${site["Site Name"] || "Site"}-${index}`,
                  position: { lat, lng },
                  popupText: site["Site Name"] || "Unknown Site",
                  siteName: site["Site Name"] || "Unknown Site",
                  siteType: site["Site Type"] || "Unknown",
                  siteVoltage: site["Site Voltage"] || "Unknown",
                  county: site["County"] || "Unknown",
                  generationHeadroom: site["Generation Headroom Mw"],
                  licenceArea: site["Licence Area"] || "Unknown",
                  color: getMarkerColor(site["Generation Headroom Mw"]),
                  ...site,
                };
              } catch (parseError) {
                console.error("Error parsing coordinates:", parseError);
                return null;
              }
            })
            .filter((marker) => marker !== null); // Remove null markers

          console.log(
            "Setting markers from client-side data:",
            transformedMarkers
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
    if (markers.length === 0 && lastSuccessfulMarkers.length > 0 && !loading && dataLoaded) {
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
          data={data}
          filters={filters}
          onMarkerClick={onMarkerClick}
          activeView={activeView}
          markers={markers}
        />
      </div>
    </div>
  );
};

export default MapSection;
