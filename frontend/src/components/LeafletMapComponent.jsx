import React, { useState, useEffect, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

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

// Create custom marker icon with pin design
const createCustomIcon = (color) => {
  return L.divIcon({
    html: `
      <div style="
        position: relative;
        width: 24px;
        height: 24px;
      ">
        <!-- Pin body -->
        <div style="
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 20px;
          background-color: ${color};
          border: 2px solid white;
          border-radius: 50% 50% 50% 0;
          transform: translateX(-50%) rotate(-45deg);
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        "></div>
        <!-- Pin point -->
        <div style="
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 8px solid ${color};
          filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
  });
};

// Component to handle map bounds fitting
const MapBoundsFitter = ({ markers, isHomePage }) => {
  const map = useMap();

  useEffect(() => {
    if (markers.length > 0 && !isHomePage) {
      const group = new L.featureGroup();
      markers.forEach(marker => {
        if (marker.position && !isNaN(marker.position.lat) && !isNaN(marker.position.lng)) {
          group.addLayer(L.marker([marker.position.lat, marker.position.lng]));
        }
      });
      
      if (group.getLayers().length > 0) {
        map.fitBounds(group.getBounds(), { padding: [20, 20] });
      }
    }
  }, [markers, map, isHomePage]);

  return null;
};

// Component to handle clustering
const ClusteredMarkers = ({ markers, onMarkerClick }) => {
  const map = useMap();

  useEffect(() => {
    if (markers.length === 0) return;

    // Create marker cluster group
    const clusterGroup = L.markerClusterGroup({
    });

    // Add markers to cluster group
    markers.forEach((marker) => {
      if (
        marker.position &&
        !isNaN(marker.position.lat) &&
        !isNaN(marker.position.lng)
      ) {
        const leafletMarker = L.marker([marker.position.lat, marker.position.lng], {
          icon: createCustomIcon(marker.color)
        });

        // Add popup
        leafletMarker.bindPopup(`
          <div class="p-2">
            <h3 class="font-bold text-lg mb-1">${marker.siteName}</h3>
            ${marker.generationHeadroom !== null && marker.generationHeadroom !== undefined ? `
              <p class="text-sm mt-1">
                <span class="font-medium">Generation Headroom:</span>
                <span class="${marker.generationHeadroom >= 50 ? 'text-green-600' : marker.generationHeadroom >= 0 ? 'text-orange-500' : marker.generationHeadroom >= -50 ? 'text-red-500' : 'text-red-700'}">
                  ${marker.generationHeadroom} MW
                </span>
              </p>
            ` : ''}
            ${marker.siteVoltage ? `
              <p class="text-xs mt-1">
                <span class="font-medium">Voltage:</span> ${marker.siteVoltage} kV
              </p>
            ` : ''}
            ${marker.county ? `
              <p class="text-xs mt-1">
                <span class="font-medium">County:</span> ${marker.county}
              </p>
            ` : ''}
          </div>
        `);

        // Add click handler
        leafletMarker.on('click', () => {
          if (onMarkerClick) {
            onMarkerClick(marker);
          }
        });

        clusterGroup.addLayer(leafletMarker);
      }
    });

    // Add cluster group to map
    map.addLayer(clusterGroup);

    // Cleanup function
    return () => {
      map.removeLayer(clusterGroup);
    };
  }, [markers, map, onMarkerClick]);

  return null;
};

const LeafletMapComponent = ({
  isHomePage = false,
  data = [],
  filters,
  onMarkerClick,
  selectedColumns = [],
  activeView = null,
  onMapLoaded = null,
  showMarkers = true,
}) => {
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Default center coordinates (England)
  const center = [52.0, 0.0];
  const homePageCenter = [52.0, 0.0];
  const homePageZoom = 8;
  const defaultZoom = 8;

  // Process markers from data using useMemo for performance
  const processedMarkers = useMemo(() => {
    if (!showMarkers) {
      return [];
    }
    
    if (!data || data.length === 0) {
      return [];
    }

    // Transform the data into markers
    const result = data
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
          // Parse "lat, lng" format - handle both "lat,lng" and "lat, lng" formats
          const coordsStr = site["Spatial Coordinates"].trim();
          const coords = coordsStr
            .split(",")
            .map((coord) => parseFloat(coord.trim()));
          if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
            [lat, lng] = coords;
          }
        }

        // Validate that lat and lng are valid numbers
        if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
          return null; // Skip invalid coordinates
        }

        const headroomValue = site.generation_headroom || site["Generation Headroom Mw"] || null;
        const markerColor = getMarkerColor(headroomValue);
        
        const marker = {
          position: { lat: parseFloat(lat), lng: parseFloat(lng) },
          color: markerColor,
          generationHeadroom: headroomValue,
          siteName: site.site_name || site["Site Name"] || "Unknown Site",
          siteVoltage: site.site_voltage || site["Site Voltage"] || null,
          county: site.county || null,
          ...site,
        };

        return marker;
      })
      .filter((marker) => marker !== null); // Remove null markers

    return result;
  }, [data, showMarkers]);

  // Use processed markers
  const markers = useMemo(() => {
    return processedMarkers;
  }, [processedMarkers]);

  // Notify parent when map is loaded
  useEffect(() => {
    if (mapLoaded && onMapLoaded) {
      onMapLoaded(true);
    }
  }, [mapLoaded, onMapLoaded]);

  const handleMarkerClick = useCallback(
    (marker) => {
      setSelectedMarker(marker);
      if (onMarkerClick) {
        onMarkerClick(marker);
      }
    },
    [onMarkerClick]
  );

  const handleMapClick = useCallback(() => {
    setSelectedMarker(null);
    if (onMarkerClick) {
      onMarkerClick(null);
    }
  }, [onMarkerClick]);

  if (!mapLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`map-container relative w-full overflow-hidden ${
      isHomePage ? "home-page-map-container" : "h-[calc(100%-2rem)]"
    }`}>
      <MapContainer
        center={isHomePage ? homePageCenter : center}
        zoom={isHomePage ? homePageZoom : defaultZoom}
        style={{ height: "100%", width: "100%" }}
        whenCreated={() => setMapLoaded(true)}
        onClick={handleMapClick}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapBoundsFitter markers={markers} isHomePage={isHomePage} />
        <ClusteredMarkers markers={showMarkers ? markers : []} onMarkerClick={handleMarkerClick} />
      </MapContainer>
    </div>
  );
};

export default React.memo(LeafletMapComponent);
