import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import GoogleMapComponent from "./GoogleMapComponent";

// Utility function for marker color
function getMarkerColor(headroom) {
  if (headroom >= 50) {
    return "#008000"; // Green for 50MW and greater
  } else if (headroom >= 20) {
    return "#FFA500"; // Amber for 20MW to 50MW
  } else {
    return "#FF0000"; // Red for less than 20MW
  }
}

// Define the focused region bounds for the substation cluster area
const FOCUSED_REGION_BOUNDS = [
  [51.3, -1.2], // Southwest corner [lat, lng]
  [52.3, 0.5], // Northeast corner [lat, lng]
];

const HomePageMap = ({
  substationData,
  onMarkerClick,
  selectedMarkerId,
  onTableRowSelect,
  tableData,
}) => {
  const [mapData, setMapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMapInteractive, setIsMapInteractive] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);
  const [filters, setFilters] = useState({
    siteName: "",
    voltage: "",
    powerRange: { min: 0, max: 200 },
    operators: "",
  });
  const [voltageLevels, setVoltageLevels] = useState([]);
  const [operators, setOperators] = useState([]);
  const [summaryStats, setSummaryStats] = useState(null);
  const mapRef = useRef(null);
  const markerRefs = useRef({});

  // Extract unique voltage levels and operators from data
  useEffect(() => {
    if (substationData && substationData.length > 0) {
      const voltages = [
        ...new Set(
          substationData.map((item) => item.site_voltage).filter(Boolean)
        ),
      ].sort((a, b) => a - b);
      const ops = [
        ...new Set(
          substationData.map((item) => item.licence_area).filter(Boolean)
        ),
      ].sort();
      setVoltageLevels(voltages);
      setOperators(ops);
    }
  }, [substationData]);

  // Calculate summary statistics
  const calculateSummaryStats = useCallback((data) => {
    if (!data || data.length === 0) return null;

    const totalSubstations = data.length;
    const headroomValues = data
      .map((item) => item.generation_headroom)
      .filter((val) => val !== null && val !== undefined);

    const avgHeadroom =
      headroomValues.length > 0
        ? headroomValues.reduce((sum, val) => sum + val, 0) /
          headroomValues.length
        : null;

    const greenSites = data.filter(
      (item) => item.generation_headroom >= 50
    ).length;
    const amberSites = data.filter(
      (item) => item.generation_headroom >= 20 && item.generation_headroom < 50
    ).length;
    const redSites = data.filter(
      (item) => item.generation_headroom < 20
    ).length;

    return {
      totalSubstations,
      avgHeadroom,
      greenSites,
      amberSites,
      redSites,
    };
  }, []);

  useEffect(() => {
    console.log("HomePageMap: substationData prop received:", substationData);
    console.log(
      "HomePageMap: substationData length:",
      substationData ? substationData.length : 0
    );

    // Use provided data or sample data
    if (substationData && substationData.length > 0) {
      console.log(
        "HomePageMap: Using provided substation data:",
        substationData.slice(0, 3)
      ); // Log first 3 items

      // Add color information to each marker
      const dataWithColors = substationData.map((site) => ({
        ...site,
        color: getMarkerColor(site.generation_headroom),
      }));

      setMapData(dataWithColors);
      setSummaryStats(calculateSummaryStats(dataWithColors));
    } else {
      setMapData([]);
      setSummaryStats(null);
    }
    setLoading(false);
  }, [substationData]);

  const filteredMapData = useMemo(() => {
    return mapData.filter((site) => {
      // Site name filter
      if (
        filters.siteName &&
        !site.site_name?.toLowerCase().includes(filters.siteName.toLowerCase())
      )
        return false;

      // Voltage filter
      if (
        filters.voltage &&
        filters.voltage !== "" &&
        String(site.site_voltage) !== String(filters.voltage)
      )
        return false;

      // Power range filter - use min value for >= comparison
      if (
        site.generation_headroom !== null &&
        site.generation_headroom !== undefined &&
        filters.powerRange.min !== undefined &&
        filters.powerRange.min > 0
      ) {
        if (site.generation_headroom < filters.powerRange.min) return false;
      }

      // Operator filter
      if (
        filters.operators &&
        filters.operators !== "" &&
        site.licence_area !== filters.operators
      )
        return false;

      return true;
    });
  }, [mapData, filters]);

  // Handle keyboard events for map interaction
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Control" || e.key === "Meta") {
      setIsMapInteractive(true);
    }
  }, []);

  // Handle keyboard release events
  const handleKeyUp = useCallback((e) => {
    if (e.key === "Control" || e.key === "Meta") {
      setIsMapInteractive(false);
    }
  }, []);

  // Add event listeners for keyboard interactions
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Handle marker click
  const handleMarkerClick = useCallback(
    (marker) => {
      console.log("HomePageMap: Marker clicked:", marker);
      setSelectedSite(marker);
      if (onMarkerClick) {
        onMarkerClick(marker);
      }
    },
    [onMarkerClick]
  );

  // Handle map click (deselect marker)
  const handleMapClick = useCallback(() => {
    setSelectedSite(null);
    if (onMarkerClick) {
      onMarkerClick(null);
    }
  }, [onMarkerClick]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
        role="alert"
      >
        <strong className="font-bold">Error! </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  // Count markers by color category
  const greenMarkers = filteredMapData.filter(
    (marker) => marker.color === "#008000"
  ).length;
  const amberMarkers = filteredMapData.filter(
    (marker) => marker.color === "#FFA500"
  ).length;
  const redMarkers = filteredMapData.filter(
    (marker) => marker.color === "#FF0000"
  ).length;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Grid Substations Map
          </h2>
          <p className="text-gray-600">
            Displaying {filteredMapData.length} electrical grid substations
          </p>
        </div>
        <div className="bg-blue-100 px-3 py-1 rounded-full">
          <span className="text-sm font-medium text-blue-800">
            {filteredMapData.length} Sites
          </span>
        </div>
      </div>
      <p className="text-gray-600 mb-4">
        Locations of electrical grid substations. Color coding based on
        Generation Headroom:
      </p>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-geniusAquamarine rounded-full mr-2"></div>
          <span className="text-sm">Green: ≥ 50MW ({greenMarkers})</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-orange-500 rounded-full mr-2"></div>
          <span className="text-sm">Amber: 20-50MW ({amberMarkers})</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-600 rounded-full mr-2"></div>
          <span className="text-sm">Red: &lt; 20MW ({redMarkers})</span>
        </div>
      </div>

      <div className="map-container relative w-full h-[500px] overflow-hidden">
        <GoogleMapComponent
          data={filteredMapData}
          onMarkerClick={handleMarkerClick}
          isHomePage={true}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <div className="bg-blue-50 px-3 py-2 rounded-lg">
          <span className="text-sm font-medium text-blue-800">
            Substations:
          </span>
          <span className="text-sm text-blue-600 ml-2">
            {filteredMapData.length}
          </span>
        </div>
        <div className="bg-geniusAquamarine/10 px-3 py-2 rounded-lg">
          <span className="text-sm font-medium text-geniusAquamarine">
            Center:
          </span>
          <span className="text-sm text-geniusAquamarine ml-2">
            52.0000, 0.5000
          </span>
        </div>
        <div className="bg-purple-50 px-3 py-2 rounded-lg">
          <span className="text-sm font-medium text-purple-800">Zoom:</span>
          <span className="text-sm text-purple-600 ml-2">8</span>
        </div>
      </div>
    </div>
  );
};

export default HomePageMap;
