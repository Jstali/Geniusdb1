import React, { useState, useEffect, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
});

// Function to determine marker color based on generation headroom
const getMarkerColor = (headroom) => {
  if (headroom === null || headroom === undefined) {
    return "#808080"; // Gray for unknown values
  }

  const numericHeadroom = typeof headroom === 'string' ? parseFloat(headroom) : headroom;
  
  if (isNaN(numericHeadroom)) {
    return "#808080"; // Gray for invalid values
  }

  if (numericHeadroom >= 50) {
    return "#008000"; // Green for 50MW and greater
  } else if (numericHeadroom >= 0) {
    return "#FFA500"; // Amber for 0-50MW
  } else if (numericHeadroom >= -50) {
    return "#FF6B6B"; // Light red for -50 to 0MW
  } else {
    return "#FF0000"; // Dark red for less than -50MW
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

// Component to handle simple marker rendering without viewport optimization
const SimpleMarkers = ({ markers, onMarkerClick }) => {
  // Limit markers for performance without complex viewport logic
  const limitedMarkers = useMemo(() => {
    return markers.slice(0, 200); // Limit to 200 markers for performance
  }, [markers]);

  return (
    <>
      {limitedMarkers.map((marker) => (
        <Marker
          key={marker.id}
          position={[marker.position.lat, marker.position.lng]}
          icon={createCustomIcon(marker.color)}
          eventHandlers={{
            click: () => {
              if (onMarkerClick) {
                onMarkerClick(marker);
              }
            },
          }}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-bold text-lg mb-1">{marker.siteName}</h3>
              {marker.generationHeadroom !== null && marker.generationHeadroom !== undefined && (
                <p className="text-sm mt-1">
                  <span className="font-medium">Generation Headroom:</span>{" "}
                  <span
                    className={
                      marker.generationHeadroom >= 50
                        ? "text-geniusAquamarine"
                        : marker.generationHeadroom >= 0
                        ? "text-orange-500"
                        : marker.generationHeadroom >= -50
                        ? "text-red-500"
                        : "text-red-700"
                    }
                  >
                    {marker.generationHeadroom} MW
                  </span>
                </p>
              )}
              {marker.siteVoltage && (
                <p className="text-xs mt-1">
                  <span className="font-medium">Voltage:</span> {marker.siteVoltage} kV
                </p>
              )}
              {marker.county && (
                <p className="text-xs mt-1">
                  <span className="font-medium">County:</span> {marker.county}
                </p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
};

const WorkingLeafletMap = ({
  isHomePage = false,
  data = [],
  onMarkerClick,
  showMarkers = true,
}) => {
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Default center coordinates (England)
  const center = [52.0, 0.0];
  const homePageCenter = [52.0, 0.0];
  const homePageZoom = 8;
  const defaultZoom = 8;

  // Process markers from data
  const processedMarkers = useMemo(() => {
    if (!showMarkers || !data || data.length === 0) {
      return [];
    }

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
          const coordsStr = site["Spatial Coordinates"].trim();
          const coords = coordsStr
            .split(",")
            .map((coord) => parseFloat(coord.trim()));
          if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
            [lat, lng] = coords;
          }
        }

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

    return result;
  }, [data, showMarkers]);

  // Determine which markers to use
  const markers = useMemo(() => {
    if (externalMarkers.length > 0) {
      return externalMarkers;
    } else {
      return processedMarkers;
    }
  }, [externalMarkers, processedMarkers]);

  const handleMarkerClick = useCallback(
    (marker) => {
      setSelectedMarker(marker);
      if (onMarkerClick) {
        onMarkerClick(marker);
      }
    },
    [onMarkerClick]

  const handleMapClick = useCallback(() => {
    setSelectedMarker(null);
    if (onMarkerClick) {
      onMarkerClick(null);
    }
  }, [onMarkerClick]);

  return (
    <div className="w-full h-full">
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
        <SimpleMarkers markers={showMarkers ? markers : []} onMarkerClick={handleMarkerClick} />
      </MapContainer>
    </div>
};

export default React.memo(WorkingLeafletMap);
