import React, { useState, useEffect, useRef, useMemo } from "react";
import GoogleMapComponent from "./GoogleMapComponent";
import { extractMapMarkers } from "../lib/filterUtils";

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

// Home page map settings - configured to show regional view of England
const homePageMapConfig = {
  center: { lat: 52.0, lng: 0.0 }, // Centered on East of England region
  zoom: 8, // More focused zoom level to show East of England and South East regions
  bounds: "disabled", // Disable auto-fit to allow custom zoom
  padding: 20,
  controls: {
    zoom: true,
    fullscreen: false, // Disable for home page
    layers: false, // Simplified for overview
  },
};

const CompactGoogleMap = ({
  isHomePage = false,
  data = [],
  filters,
  onMarkerClick,
  selectedColumns = [], // Add this prop
  activeView = null, // Add this prop to track active view
  locationColumn = "Site Name", // Add locationColumn prop
}) => {
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [error, setError] = useState(null);
  const [lastSuccessfulMarkers, setLastSuccessfulMarkers] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const abortControllerRef = useRef(null);

  // Get API base URL from environment or default to localhost:8000
  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

  console.log("CompactGoogleMap received props:", {
    isHomePage,
    dataLength: data?.length || 0,
    dataType: typeof data,
    filters,
    activeView,
    selectedColumns
  });
  
  // Debug: Log the first data item to see structure
  if (data && data.length > 0) {
    console.log("CompactGoogleMap: First data item structure:", {
      keys: Object.keys(data[0]),
      sampleItem: data[0]
    });
  }

  // Set default filters if not provided
  const effectiveFilters = filters || useMemo(() => ({}), []);

  // Convert frontend filters to backend format
  const convertFilters = (frontendFilters) => {
    const backendFilters = {};

    // Site Name filter
    if (frontendFilters.siteName && frontendFilters.siteName.trim() !== "") {
      backendFilters["site_name"] = frontendFilters.siteName.trim();
    }

    // Voltage Level filter
    if (frontendFilters.voltage && frontendFilters.voltage !== "") {
      backendFilters["voltage_level"] = parseInt(frontendFilters.voltage);
    }

    // Available Power filter - use >= operator as per requirements
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

    console.log("Converted filters:", backendFilters);
    return backendFilters;
  };

  // Process data from parent component instead of fetching from backend
  useEffect(() => {
    const processMapData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("CompactGoogleMap: Processing data from parent component", {
          dataLength: data?.length || 0,
          isHomePage,
          activeView,
          effectiveFilters
        });
        
        // Check if we have any data at all
        if (!data || data.length === 0) {
          console.log("CompactGoogleMap: No data provided, creating test markers");
          const testMarkers = [
            {
              id: "test-marker-1",
              position: { lat: 51.5074, lng: -0.1278 }, // London
              popupText: "Test Marker - London",
              siteName: "Test Site 1",
              color: "#008000",
            },
            {
              id: "test-marker-2", 
              position: { lat: 53.4808, lng: -2.2426 }, // Manchester
              popupText: "Test Marker - Manchester",
              siteName: "Test Site 2",
              color: "#FFA500",
            }
          ];
          setMarkers(testMarkers);
          setLastSuccessfulMarkers(testMarkers);
          setDataLoaded(true);
          setLoading(false);
          return;
        }

        // Debug: Log first few data items to understand structure
        if (data && data.length > 0) {
          console.log("CompactGoogleMap: Sample data items:", data.slice(0, 3));
        }

        // If we have an active view, always fetch from backend regardless of parent data
        if (activeView) {
          console.log("CompactGoogleMap: Active view detected, fetching from backend");
          // This will be handled in the else if (activeView) block below
        } else if (data && data.length > 0) {
          console.log("CompactGoogleMap: Processing data with length:", data.length);
          
          // Check if we have spatial coordinates in the data
          const hasSpatialCoords = data.some(site => site["Spatial Coordinates"]);
          console.log("CompactGoogleMap: Data has spatial coordinates:", hasSpatialCoords);
          
          if (!hasSpatialCoords) {
            console.log("CompactGoogleMap: No spatial coordinates found in data. Available keys:", 
              data.length > 0 ? Object.keys(data[0]) : "No data");
          }
          // Apply client-side filtering to the data
          const filteredData = data.filter((site) => {
            // Site name filter
            if (
              effectiveFilters.siteName &&
              effectiveFilters.siteName.trim() !== ""
            ) {
              const siteName = site["Site Name"] || site.site_name || "";
              if (
                !siteName
                  .toLowerCase()
                  .includes(effectiveFilters.siteName.toLowerCase())
              ) {
                return false;
              }
            }

            // Voltage filter
            if (effectiveFilters.voltage && effectiveFilters.voltage !== "") {
              const siteVoltage = site["Site Voltage"] || site.site_voltage;
              if (siteVoltage && siteVoltage !== effectiveFilters.voltage) {
                return false;
              }
            }

            // Power range filter
            if (effectiveFilters.powerRange?.min !== undefined) {
              const headroom = parseFloat(site["Generation Headroom Mw"] || site.generation_headroom);
              if (isNaN(headroom) || headroom < effectiveFilters.powerRange.min) {
                return false;
              }
            }

            // Operator filter
            if (effectiveFilters.operators) {
              const licenceArea = site["Licence Area"] || site.licence_area || "";
              if (licenceArea !== effectiveFilters.operators) {
                return false;
              }
            }

            return true;
          });

          console.log("Filtered data count:", filteredData.length);

          // Transform the filtered data into markers
          const transformedMarkers = filteredData
            .map((site, index) => {
              // Try different possible coordinate field names
              const spatialCoords = site["Spatial Coordinates"] || 
                                  site["spatial_coordinates"] || 
                                  site["coordinates"] || 
                                  site["lat_lng"] ||
                                  site["position"];
              
              console.log(`Processing site ${index}:`, {
                siteName: site["Site Name"],
                spatialCoords: spatialCoords,
                type: typeof spatialCoords,
                availableKeys: Object.keys(site).filter(key => 
                  key.toLowerCase().includes('coord') || 
                  key.toLowerCase().includes('lat') || 
                  key.toLowerCase().includes('lng') ||
                  key.toLowerCase().includes('position')
                )
              });
              
              if (!spatialCoords || spatialCoords === "\\N") {
                console.log(`Skipping site ${index} - no valid spatial coordinates`);
                return null;
              }

              try {
                // Handle different coordinate formats
                let coords;
                
                // Check if it's already an array
                if (Array.isArray(spatialCoords)) {
                  coords = spatialCoords.map(coord => parseFloat(coord));
                } else {
                  // Split by comma and parse
                  coords = spatialCoords
                    .split(",")
                    .map((coord) => parseFloat(coord.trim()));
                }
                
                console.log(`Parsed coordinates for site ${index}:`, coords);
                
                if (
                  coords.length !== 2 ||
                  isNaN(coords[0]) ||
                  isNaN(coords[1])
                ) {
                  console.log(`Invalid coordinates for site ${index}:`, coords);
                  return null;
                }

                const [lat, lng] = coords;

                if (isNaN(lat) || isNaN(lng)) {
                  console.log(`NaN coordinates for site ${index}:`, { lat, lng });
                  return null;
                }

                // Validate coordinate ranges (rough bounds for UK)
                if (lat < 49 || lat > 61 || lng < -8 || lng > 2) {
                  console.log(`Coordinates out of UK range for site ${index}:`, { lat, lng });
                  // Don't return null - just log the warning, as coordinates might be valid
                }

                const marker = {
                  id: `${site["Site Name"] || site.site_name || "Site"}-${index}`,
                  position: { lat, lng },
                  popupText: site["Site Name"] || site.site_name || "Unknown Site",
                  siteName: site["Site Name"] || site.site_name || "Unknown Site",
                  siteType: site["Site Type"] || site.site_type || "Unknown",
                  siteVoltage: site["Site Voltage"] || site.site_voltage || "Unknown",
                  county: site["County"] || site.county || "Unknown",
                  generationHeadroom: site["Generation Headroom Mw"] || site.generation_headroom,
                  licenceArea: site["Licence Area"] || site.licence_area || "Unknown",
                  color: getMarkerColor(site["Generation Headroom Mw"] || site.generation_headroom),
                  ...site,
                };
                
                console.log(`Created marker for site ${index}:`, {
                  id: marker.id,
                  position: marker.position,
                  siteName: marker.siteName,
                  color: marker.color
                });
                
                return marker;
              } catch (parseError) {
                console.error("Error parsing coordinates:", parseError);
                return null;
              }
            })
            .filter((marker) => marker !== null);

          console.log("CompactGoogleMap: Setting markers from parent data:", transformedMarkers.length);
          console.log("CompactGoogleMap: Sample markers:", transformedMarkers.slice(0, 3));
          console.log("CompactGoogleMap: Successfully created markers from spatial coordinates:", {
            totalSites: filteredData.length,
            successfulMarkers: transformedMarkers.length,
            failedMarkers: filteredData.length - transformedMarkers.length
          });
          
          // Always add a test marker for debugging
          console.log("CompactGoogleMap: Adding test marker for debugging");
          const testMarker = {
            id: "test-marker",
            position: { lat: 51.5074, lng: -0.1278 }, // London coordinates
            popupText: "Test Marker - London",
            siteName: "Test Site",
            siteType: "Test",
            siteVoltage: "Test",
            county: "Test",
            generationHeadroom: 50,
            licenceArea: "Test",
            color: "#008000", // Green
          };
          transformedMarkers.push(testMarker);
          console.log("CompactGoogleMap: Added test marker:", testMarker);
          
          setMarkers(transformedMarkers);
          setLastSuccessfulMarkers(transformedMarkers);
          setDataLoaded(true);
        } else if (activeView) {
          // If we have an active view, always fetch from backend
          console.log(
            "CompactGoogleMap: Fetching filtered map data with active view",
            {
              activeView,
              filters: effectiveFilters,
            }
          );

          // Convert frontend filters to backend format
          const backendFilters = convertFilters(effectiveFilters);

          // Log filters before sending to backend
          console.log("Sending filters to backend:", backendFilters);

          // Prepare the request payload with the correct structure
          // Use selectedColumns from props if available, otherwise use default location columns
          const defaultLocationColumns = [
            "site_name",
            "latitude", 
            "longitude",
            "voltage_level",
            "available_power",
            "network_operator",
          ];
          
          // If selectedColumns are provided, use them but ensure location columns are included
          let columnsToUse;
          if (selectedColumns && selectedColumns.length > 0) {
            // Add location columns if they're not already included
            const locationColumns = ["latitude", "longitude", "site_name"];
            columnsToUse = [...new Set([...selectedColumns, ...locationColumns])];
          } else {
            columnsToUse = defaultLocationColumns;
          }
            
          console.log("CompactGoogleMap: Using columns for map data:", columnsToUse);
          console.log("CompactGoogleMap: selectedColumns from props:", selectedColumns);
          console.log("CompactGoogleMap: defaultLocationColumns:", defaultLocationColumns);
          console.log("CompactGoogleMap: activeView:", activeView);
          
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
          console.log("CompactGoogleMap: Received filtered map data", result);

          if (result.error) {
            throw new Error(result.error);
          }

          // Transform backend response to markers with proper numeric parsing
          console.log("CompactGoogleMap: Processing backend response rows:", result.rows.length);
          console.log("CompactGoogleMap: Sample row:", result.rows[0]);
          
          const transformedMarkers = result.rows
            .map((row, index) => {
              console.log(`Processing row ${index}:`, {
                site_name: row.site_name,
                latitude: row.latitude,
                longitude: row.longitude,
                available_power: row.available_power
              });
              
              const lat = parseFloat(row.latitude);
              const lng = parseFloat(row.longitude);

              // Only include sites with valid coordinates
              if (isNaN(lat) || isNaN(lng)) {
                console.log(`Skipping row ${index} - invalid coordinates: lat=${lat}, lng=${lng}`);
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

          console.log("Setting markers from active view:", transformedMarkers.length, "markers");
          console.log("Sample transformed marker:", transformedMarkers[0]);
          setMarkers(transformedMarkers);
          setLastSuccessfulMarkers(transformedMarkers);
          setDataLoaded(true);
        } else if (isHomePage) {
          // For home page, use the new /api/map-data endpoint
          console.log(
            "CompactGoogleMap: Fetching filtered map data for home page",
            {
              filters: effectiveFilters,
            }
          );

          // Convert frontend filters to backend format
          const backendFilters = convertFilters(effectiveFilters);

          // Log filters before sending to backend
          console.log("Sending filters to home page endpoint:", backendFilters);

          // Prepare the request payload with the correct structure
          // Use selectedColumns from props if available, otherwise use default location columns
          const defaultLocationColumns = [
            "site_name",
            "latitude", 
            "longitude",
            "voltage_level",
            "available_power",
            "network_operator",
          ];
          
          // If selectedColumns are provided, use them but ensure location columns are included
          let columnsToUse;
          if (selectedColumns && selectedColumns.length > 0) {
            // Add location columns if they're not already included
            const locationColumns = ["latitude", "longitude", "site_name"];
            columnsToUse = [...new Set([...selectedColumns, ...locationColumns])];
          } else {
            columnsToUse = defaultLocationColumns;
          }
            
          console.log("CompactGoogleMap: Using columns for home page map data:", columnsToUse);
          console.log("CompactGoogleMap: selectedColumns from props (home page):", selectedColumns);
          console.log("CompactGoogleMap: defaultLocationColumns (home page):", defaultLocationColumns);
          
          const payload = {
            filters: backendFilters,
            selected_columns: columnsToUse,
          };

          // Make request to the new home page backend endpoint
          const response = await fetch(`${API_BASE}/api/map-data`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            signal: abortControllerRef.current.signal,
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();
          console.log("CompactGoogleMap: Received home page map data", result);

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
              };
            })
            .filter((marker) => marker !== null); // Remove null markers

          console.log(
            "Setting markers from home page data:",
            transformedMarkers
          );
          setMarkers(transformedMarkers);
          setLastSuccessfulMarkers(transformedMarkers);
          setDataLoaded(true);
        } else {
          // Apply filters to the data
          const filteredData = data.filter((site) => {
            // Site name filter
            if (
              effectiveFilters.siteName &&
              effectiveFilters.siteName.trim() !== ""
            ) {
              const siteName = site["Site Name"] || "";
              if (
                !siteName
                  .toLowerCase()
                  .includes(effectiveFilters.siteName.toLowerCase())
              ) {
                return false;
              }
            }

            // Voltage filter
            if (effectiveFilters.voltage && effectiveFilters.voltage !== "") {
              const siteVoltage = site["Site Voltage"];
              if (siteVoltage && siteVoltage !== effectiveFilters.voltage) {
                return false;
              }
            }

            // Power range filter
            if (
              effectiveFilters.powerRange &&
              effectiveFilters.powerRange.min !== undefined
            ) {
              const headroom = site["Generation Headroom Mw"];
              if (
                headroom !== undefined &&
                headroom !== null &&
                !isNaN(headroom) &&
                headroom < effectiveFilters.powerRange.min
              ) {
                return false;
              }
            }

            // Operator filter
            if (
              effectiveFilters.operators &&
              effectiveFilters.operators !== ""
            ) {
              const licenceArea = site["Licence Area"];
              if (licenceArea && licenceArea !== effectiveFilters.operators) {
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
          console.log("CompactGoogleMap: Request was cancelled");
          return; // Exit early if request was cancelled
        }

        console.error("CompactGoogleMap: Error fetching map data:", err);
        setError(err.message || "Failed to fetch map data");
        setMarkers([]);
      } finally {
        setLoading(false);
      }
    };

    processMapData();

    // Cleanup function to cancel any ongoing requests
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [data, isHomePage, selectedColumns, activeView, effectiveFilters, getMarkerColor]);

  // Fallback mechanism: if markers are empty but we have successful markers, restore them
  useEffect(() => {
    if (markers.length === 0 && lastSuccessfulMarkers.length > 0 && !loading && dataLoaded) {
      console.log("CompactGoogleMap: Restoring markers from last successful state");
      setMarkers(lastSuccessfulMarkers);
    }
  }, [markers, lastSuccessfulMarkers, loading, dataLoaded]);

  console.log("CompactGoogleMap rendering with markers:", markers);

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
      <div
        className={`map-container relative w-full overflow-hidden ${
          isHomePage
            ? "home-page-map-container"
            : "h-[calc(100%-2rem)]"
        }`}
        style={{ height: "600px" }}
      >
        <GoogleMapComponent
          isHomePage={isHomePage}
          data={data}
          filters={filters}
          onMarkerClick={onMarkerClick}
          selectedColumns={selectedColumns}
          activeView={activeView}
          markers={markers}
          showMarkers={true}
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
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Pin Color Legend</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 rounded-full bg-green-500 flex-shrink-0"></div>
                    <span className="text-gray-700">Green - 50MW Generation Headroom and greater</span>
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

export default CompactGoogleMap;
