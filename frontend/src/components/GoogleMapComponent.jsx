import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";

// Map container style
const containerStyle = {
  width: "100%",
  height: "100%",
};

// Default center coordinates
const center = {
  lat: 52.0,
  lng: 0.0,
};

// Home page map settings - configured to show regional view of England
const homePageMapConfig = {
  center: { lat: 52.0, lng: 0.0 }, // Centered on East of England region
  zoom: 8, // More focused zoom level to show East of England and South East regions
  bounds: "disabled", // Disable auto-fit to allow custom zoom
  padding: 20,
  controls: {
    zoom: true,
    fullscreen: false,
    layers: false,
  },
};

const GoogleMapComponent = ({
  isHomePage = false,
  data = [],
  filters,
  onMarkerClick,
  selectedColumns = [],
  activeView = null,
  markers: externalMarkers = [],
  onMapLoaded = null, // Callback to notify parent when map is loaded
  showMarkers = true, // New prop to control marker visibility
}) => {
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [clickedMarkerId, setClickedMarkerId] = useState(null); // Track which marker is clicked
  const [map, setMap] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [markersInitialized, setMarkersInitialized] = useState(false);

  // Get Google Maps API key from environment
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  // Load Google Maps API
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  // Function to determine marker color based on generation headroom
  const getMarkerColor = useCallback((headroom) => {
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
  }, []);

  // Create custom marker icon based on color and size - using location pin symbol
  const createMarkerIcon = useCallback((color, isClicked = false) => {
    const scale = isClicked ? 1.8 : 1.2; // Larger scale when clicked
    
    // Check if google.maps is available
    if (typeof google === "undefined" || !google || !google.maps) {
      // Fallback to location pin SVG path if Google Maps API is not loaded
      console.log("Google Maps API not loaded, using fallback location pin");
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
  }, []);

  // Process markers from data using useMemo for performance
  const processedMarkers = useMemo(() => {
    if (!showMarkers) {
      console.log("Markers disabled, returning empty markers array");
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log("No data provided, returning empty markers array");
      return [];
    }

    console.log("Processing data to create markers, data length:", data.length);

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
          console.log("Skipping site due to invalid coordinates:", site);
          return null; // Skip invalid coordinates
        }

        const marker = {
          id:
            site.id ||
            `${site.site_name || site["Site Name"] || "Site"}-${index}`,
          position: { lat: parseFloat(lat), lng: parseFloat(lng) },
          siteName: site.site_name || site["Site Name"] || "Unknown Site",
          siteVoltage: site.site_voltage || site["Site Voltage"] || "Unknown",
          generationHeadroom:
            site.generation_headroom || site["Generation Headroom Mw"] || null,
          county: site.county || site["County"] || "Unknown",
          licenceArea: site.licence_area || site["Licence Area"] || "Unknown",
          color: getMarkerColor(
            site.generation_headroom || site["Generation Headroom Mw"]
          ),
          ...site,
        };

        console.log("Created marker:", marker);
        return marker;
      })
      .filter((marker) => marker !== null); // Remove null markers

    console.log("Processed markers count:", result.length);
    return result;
  }, [data, getMarkerColor, showMarkers]);

  // Determine which markers to use - external markers take precedence
  const markers = useMemo(() => {
    console.log("GoogleMapComponent: Determining markers:", {
      externalMarkersLength: externalMarkers.length,
      processedMarkersLength: processedMarkers.length,
      externalMarkers: externalMarkers.slice(0, 2),
      processedMarkers: processedMarkers.slice(0, 2)
    });
    
    if (externalMarkers.length > 0) {
      console.log("Using external markers:", externalMarkers.length);
      return externalMarkers;
    } else {
      console.log("Using processed markers:", processedMarkers.length);
      return processedMarkers;
    }
  }, [externalMarkers, processedMarkers]);

  useEffect(() => {
    console.log("GoogleMapComponent: Markers updated:", {
      markersCount: markers.length,
      externalMarkersCount: externalMarkers.length,
      processedMarkersCount: processedMarkers.length,
      showMarkers,
      mapLoaded,
      isHomePage,
      activeView
    });
    console.log("GoogleMapComponent: Sample marker IDs:", markers.slice(0, 3).map(m => m.id));
  }, [markers, externalMarkers, processedMarkers, showMarkers, mapLoaded, isHomePage, activeView]);

  // Effect to handle marker rendering when map is loaded
  useEffect(() => {
    if (mapLoaded && map && markers.length > 0 && showMarkers) {
      console.log("GoogleMapComponent: Map loaded and markers available, count:", markers.length);
      console.log("GoogleMapComponent: Force re-render triggered");
      setMarkersInitialized(true);
      // Markers will be rendered by the JSX conditional rendering
    } else if (markers.length === 0 && markersInitialized) {
      console.log("GoogleMapComponent: Markers cleared, but keeping initialization state");
    } else if (!showMarkers) {
      console.log("GoogleMapComponent: Markers disabled by showMarkers prop");
    }
  }, [mapLoaded, map, markers, markersInitialized, showMarkers]);

  // Notify parent when map is loaded
  useEffect(() => {
    if (mapLoaded && onMapLoaded) {
      onMapLoaded(true);
    }
  }, [mapLoaded, onMapLoaded]);

  // Separate effect to handle bounds fitting when markers change
  // Disabled for home page to allow custom zoom level
  useEffect(() => {
    if (mapLoaded && map && !isHomePage && markers.length > 0) {
      console.log("Fitting map to updated markers, count:", markers.length);
      try {
        const bounds = new google.maps.LatLngBounds();
        markers.forEach((marker) => {
          if (
            marker.position &&
            typeof marker.position.lat === "number" &&
            typeof marker.position.lng === "number" &&
            !isNaN(marker.position.lat) &&
            !isNaN(marker.position.lng)
          ) {
            bounds.extend(marker.position);
          }
        });
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds);
        }
      } catch (error) {
        console.error("Error fitting map to updated bounds:", error);
      }
    }
  }, [mapLoaded, map, isHomePage, markers]);

  const onLoad = useCallback(
    function callback(map) {
      console.log("Google Map loaded successfully");
      console.log("GoogleMapComponent: Map loaded with markers:", markers.length);
      setMap(map);
      setMapLoaded(true);
      // Bounds fitting is handled by the separate useEffect above
    },
    [markers.length]
  );

  const onUnmount = useCallback(function callback(map) {
    console.log("Google Map unmounted");
    setMap(null);
    setMapLoaded(false);
  }, []);

  const handleMarkerClick = useCallback(
    (marker) => {
      console.log("Marker clicked:", marker);
      setSelectedMarker(marker);
      setClickedMarkerId(marker.id); // Track which marker is clicked
      if (onMarkerClick) {
        onMarkerClick(marker);
      }
    },
    [onMarkerClick]
  );

  const handleMapClick = useCallback(() => {
    console.log("Map clicked, closing info window");
    setSelectedMarker(null);
    setClickedMarkerId(null); // Reset clicked marker
    if (onMarkerClick) {
      onMarkerClick(null);
    }
  }, [onMarkerClick]);

  if (!isLoaded) {
    console.log("Google Maps API not loaded yet");
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    console.log("Error in GoogleMapComponent:", error);
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

  console.log("Rendering map with markers:", markers);

  return (
    <div
      className={`map-container relative w-full overflow-hidden ${
        isHomePage
          ? "home-page-map-container"
          : "h-[calc(100%-2rem)]"
      }`}
    >
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={isHomePage ? homePageMapConfig.center : center}
        zoom={isHomePage ? homePageMapConfig.zoom : 8}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleMapClick}
        options={{
          zoomControl: isHomePage ? homePageMapConfig.controls.zoom : true,
          fullscreenControl: isHomePage
            ? homePageMapConfig.controls.fullscreen
            : true,
          streetViewControl: false,
          mapTypeControl: false,
          gestureHandling: "auto",
        }}
      >
        {mapLoaded && showMarkers && markers.length > 0 && (() => {
          console.log("GoogleMapComponent: Rendering markers:", {
            mapLoaded,
            showMarkers,
            markersLength: markers.length,
            markers: markers.slice(0, 3)
          });
          return true;
        })() && markers.map((marker) => {
          // Ensure marker position is valid before rendering
          if (
            !marker.position ||
            isNaN(marker.position.lat) ||
            isNaN(marker.position.lng)
          ) {
            console.log("Skipping marker with invalid position:", marker);
            return null;
          }

          console.log("Rendering marker:", marker);
          const isClicked = clickedMarkerId === marker.id;
          return (
            <Marker
              key={marker.id}
              position={marker.position}
              icon={createMarkerIcon(marker.color, isClicked)}
              onClick={() => handleMarkerClick(marker)}
            />
          );
        })}

        {/* InfoWindow popup disabled - no popup will show when markers are clicked */}
        {false && mapLoaded && selectedMarker && (
          <InfoWindow
            position={selectedMarker.position}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="p-2">
              <h3 className="font-bold text-lg mb-1">
                {selectedMarker.siteName}
              </h3>
              {selectedMarker.generationHeadroom !== null &&
                selectedMarker.generationHeadroom !== undefined && (
                  <p className="text-sm mt-1">
                    <span className="font-medium">Generation Headroom:</span>{" "}
                    <span
                      className={
                        selectedMarker.generationHeadroom >= 50
                          ? "text-green-600"
                          : selectedMarker.generationHeadroom >= 20
                          ? "text-orange-500"
                          : "text-red-600"
                      }
                    >
                      {selectedMarker.generationHeadroom} MW
                    </span>
                  </p>
                )}
              {selectedMarker.siteVoltage && (
                <p className="text-xs mt-1">
                  <span className="font-medium">Voltage:</span>{" "}
                  {selectedMarker.siteVoltage} kV
                </p>
              )}
              {selectedMarker.county && (
                <p className="text-xs mt-1">
                  <span className="font-medium">County:</span>{" "}
                  {selectedMarker.county}
                </p>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
};

export default React.memo(GoogleMapComponent);
