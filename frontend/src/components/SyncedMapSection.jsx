import React, { useState, useEffect, useCallback, useMemo } from "react";
import LeafletMapComponent from "./LeafletMapComponent";
import SimpleMapFallback from "./SimpleMapFallback";
import { extractMapMarkers } from "../lib/filterUtils";

// Function to determine marker color based on generation headroom
const getMarkerColor = (headroom) => {
  if (headroom === null || headroom === undefined) {
    return "#808080"; // Gray for unknown values
  }

  // Convert to number if it's a string
  const numericHeadroom = typeof headroom === 'string' ? parseFloat(headroom) : headroom;
  
  if (isNaN(numericHeadroom)) {
    return "#808080"; // Gray for invalid values
  }

  // Updated color logic for the actual data range (-211 to +90)
  if (numericHeadroom >= 50) {
    return "#008000"; // Green for 50MW and greater (excellent capacity)
  } else if (numericHeadroom >= 0) {
    return "#FFA500"; // Amber for 0-50MW (moderate capacity)
  } else if (numericHeadroom >= -50) {
    return "#FF6B6B"; // Light red for -50 to 0MW (low capacity)
  } else {
    return "#FF0000"; // Dark red for less than -50MW (very low capacity)
  }
};

const SyncedMapSection = ({
  data = [],
  filteredData = [], // This will be the filtered data from the table
  filters = {},
  onMarkerClick,
  selectedColumns = [],
  activeView = null,
  isHomePage = false,
}) => {
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Use filtered data if available, otherwise use all data
  const dataToUse = useMemo(() => {
    if (filteredData && filteredData.length > 0) {
      return filteredData;
    } else {
      return data;
    }
  }, [data, filteredData]);

  // Process data to create markers
  useEffect(() => {

    if (dataToUse && dataToUse.length > 0) {
      try {
        setLoading(true);
        setError(null);

        // Transform data into markers
        const processedMarkers = dataToUse
          .map((site, index) => {
            // Extract coordinates
            let lat = null;
            let lng = null;

            if (site.position && site.position.length === 2) {
              lat = parseFloat(site.position[0]);
              lng = parseFloat(site.position[1]);
            } else if (site.latitude && site.longitude) {
              lat = parseFloat(site.latitude);
              lng = parseFloat(site.longitude);
            } else if (site["Spatial Coordinates"]) {
              // Parse "lat, lng" format
              const coordsStr = site["Spatial Coordinates"].trim();
              const coords = coordsStr
                .split(",")
                .map((coord) => parseFloat(coord.trim()));
              if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                [lat, lng] = coords;
              }
            }

            // Validate coordinates
            if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
              return null;
            }

            const headroomValue = site.generation_headroom || site["Generation Headroom Mw"] || null;
            const markerColor = getMarkerColor(headroomValue);

            const marker = {
              position: { lat: parseFloat(lat), lng: parseFloat(lng) },
              ...site,
            };

            return marker;
          })
          .filter((marker) => marker !== null);

        setMarkers(processedMarkers);
        setLoading(false);
      } catch (err) {
        console.error("SyncedMapSection: Error processing markers:", err);
        setError("Failed to process map markers: " + err.message);
        setLoading(false);
      }
    } else {
      setMarkers([]);
      setLoading(false);
    }
  }, [dataToUse, activeView, selectedColumns, filters]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Error! </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full" style={{ zIndex: "1" }}>
      <div className="map-container relative w-full overflow-hidden h-[700px] bg-gray-100">
        <LeafletMapComponent
          key={`working-map-${markers.length}-${filteredData.length}`}
          data={dataToUse}
          markers={markers}
          onMarkerClick={onMarkerClick}
          isHomePage={isHomePage}
        />
        
        {/* Map info overlay */}
        <div className="absolute top-4 right-4 bg-white bg-opacity-90 p-2 rounded-lg shadow-lg text-sm">
          <div className="font-semibold">Map Info</div>
          <div>Total Sites: {data.length}</div>
          <div>Visible Sites: {markers.length}</div>
          {filteredData.length > 0 && (
            <div>Filtered: {filteredData.length}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SyncedMapSection;
