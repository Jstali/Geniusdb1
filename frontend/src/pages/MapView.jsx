import React, { useState, useEffect, useMemo } from "react";
import SidebarFilters from "../components/SidebarFilters";
import MapSection from "../components/MapSection";
import SiteDetailsCard from "../components/SiteDetailsCard";
import { getActiveData, extractMapMarkers } from "../lib/filterUtils";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const MapView = ({ activeView = null, selectedColumns = [] }) => {
  // Add activeView and selectedColumns props
  const [data, setData] = useState([]);
  const [activeData, setActiveData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    siteName: "",
    voltage: "",
    powerRange: { min: 0, max: 200 },
    operators: "",
  });
  const [selectedSite, setSelectedSite] = useState(null);

  console.log("MapView received props:", { activeView, selectedColumns });

  // Compute activeData whenever data or view configuration changes
  useEffect(() => {
    if (data.length > 0) {
      const computedActiveData = getActiveData(data, {
        selectedColumns: selectedColumns || [],
        filters: {} // MapView doesn't have complex filters yet
      });
      console.log("MapView: Computed activeData", {
        originalDataLength: data.length,
        activeDataLength: computedActiveData.length
      });
      setActiveData(computedActiveData);
    }
  }, [data, selectedColumns]);

  useEffect(() => {
    console.log("MapView: useEffect triggered with dependencies:", { activeView, selectedColumns, filters });
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Use different endpoints based on whether we have an active view
        let endpoint, payload;
        
        // Convert frontend filters to backend format
        const convertFilters = (filters) => {
          const backendFilters = {};
          
          if (filters.siteName && filters.siteName.trim() !== "") {
            backendFilters.site_name = filters.siteName.trim();
          }
          
          if (filters.voltage && filters.voltage !== "") {
            backendFilters.voltage_level = filters.voltage;
          }
          
          if (filters.powerRange && filters.powerRange.min !== undefined && filters.powerRange.min > 0) {
            backendFilters.available_power = filters.powerRange.min;
          }
          
          if (filters.operators && filters.operators !== "") {
            backendFilters.network_operator = filters.operators;
          }
          
          return backendFilters;
        };
        
        const backendFilters = convertFilters(filters);
        
        if (activeView) {
          // Use saved view endpoint with selected columns and filters
          endpoint = `${API_BASE}/api/views/${activeView}/map-data?user_id=1`;
          payload = {
            filters: backendFilters,
            selected_columns: selectedColumns.length > 0 ? selectedColumns : [
              "site_name", "latitude", "longitude", "voltage_level", 
              "available_power", "network_operator"
            ]
          };
          console.log("MapView: Using saved view endpoint with selectedColumns:", selectedColumns, "and filters:", backendFilters);
        } else {
          // Use home page endpoint with filters
          endpoint = `${API_BASE}/api/map-data`;
          payload = {
            filters: backendFilters,
            selected_columns: [
              "site_name", "latitude", "longitude", "voltage_level", 
              "available_power", "network_operator"
            ]
          };
          console.log("MapView: Using home page endpoint with filters:", backendFilters);
        }
        
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();
        console.log("MapView: Received map data", json);
        console.log("MapView: Number of rows received:", json.rows ? json.rows.length : 0);

        if (json.rows && Array.isArray(json.rows)) {
          // Transform the data to match the expected format with proper numeric parsing
          const transformedData = json.rows
            .map((row, index) => {
              const lat = parseFloat(row.latitude);
              const lng = parseFloat(row.longitude);

              // Only include sites with valid coordinates
              if (isNaN(lat) || isNaN(lng)) {
                return null;
              }

              return {
                id: index,
                site_name: row.site_name,
                "Site Name": row.site_name,
                latitude: lat,
                longitude: lng,
                "Site Voltage": row.voltage_level,
                site_voltage: row.voltage_level,
                "Generation Headroom Mw": row.available_power,
                generation_headroom: row.available_power,
                "Licence Area": row.network_operator,
                licence_area: row.network_operator,
                "Spatial Coordinates": `${lat}, ${lng}`,
                position: [lat, lng],
              };
            })
            .filter((item) => item !== null); // Remove null items

          console.log("MapView: Transformed data", transformedData);
          setData(transformedData);
        } else {
          setData([]);
          setError("Unexpected data format from backend");
        }
      } catch (err) {
        console.error("Error fetching map data:", err);
        setError("Failed to fetch site data. Please check backend.");
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeView, selectedColumns, filters]);

  const summaryStats = useMemo(() => {
    if (!data || data.length === 0) return null;
    const totalSubstations = data.length;
    const headroomValues = data
      .map((item) => item["Generation Headroom Mw"])
      .filter((v) => v !== null && v !== undefined && !isNaN(v));
    const avgHeadroom =
      headroomValues.length > 0
        ? headroomValues.reduce((s, v) => s + Number(v), 0) /
          headroomValues.length
        : null;
    const greenSites = data.filter(
      (it) => Number(it["Generation Headroom Mw"]) >= 50
    ).length;
    const amberSites = data.filter(
      (it) =>
        Number(it["Generation Headroom Mw"]) >= 20 &&
        Number(it["Generation Headroom Mw"]) < 50
    ).length;
    const redSites = data.filter(
      (it) => Number(it["Generation Headroom Mw"]) < 20
    ).length;
    return { totalSubstations, avgHeadroom, greenSites, amberSites, redSites };
  }, [data]);

  const voltageLevels = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...new Set(data.map((s) => s["Site Voltage"]))]
      .filter(Boolean)
      .sort((a, b) => a - b);
  }, [data]);

  const operators = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...new Set(data.map((s) => s["Licence Area"]))]
      .filter(Boolean)
      .sort();
  }, [data]);

  const handleMarkerClick = (site) => setSelectedSite(site);

  console.log("MapView rendering with data:", data);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Error! </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 py-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Map View</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Left Sidebar - Filters */}
          <div className="lg:col-span-4 sidebar-panel">
            <SidebarFilters
              onSiteNameSearch={(name) => {
                console.log("MapView: Site name filter changed to:", name);
                setFilters((f) => ({ ...f, siteName: name }));
              }}
              onVoltageFilter={(voltage) => {
                console.log("MapView: Voltage filter changed to:", voltage);
                setFilters((f) => ({ ...f, voltage }));
              }}
              onPowerRangeChange={(range) => {
                console.log("MapView: Power range filter changed to:", range);
                setFilters((f) => ({ ...f, powerRange: range }));
              }}
              onOperatorFilter={(ops) => {
                console.log("MapView: Operator filter changed to:", ops);
                setFilters((f) => ({ ...f, operators: ops }));
              }}
              voltageLevels={voltageLevels}
              operators={operators}
              currentFilters={filters}
            />
          </div>

          {/* Center Map */}
          <div className="lg:col-span-4">
            <div className="h-[700px]">
              {console.log("MapView: Passing data to MapSection:", { dataLength: data.length, filters, activeView, selectedColumns })}
              <MapSection
                data={data} // Use raw data, let MapSection handle filtering
                filters={filters}
                onMarkerClick={handleMarkerClick}
                activeView={activeView} // Pass active view to MapSection
                selectedColumns={selectedColumns} // Pass selected columns to MapSection
              />
            </div>
          </div>

          {/* Right Sidebar - Site Details */}
          <div className="lg:col-span-4 sidebar-panel">
            <SiteDetailsCard
              selectedSite={selectedSite}
              summaryStats={summaryStats}
              onClose={() => setSelectedSite(null)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapView;
