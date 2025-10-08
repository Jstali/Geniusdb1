import React, { useState, useEffect, useMemo } from "react";
import CompactGoogleMapSimple from "../components/CompactGoogleMapSimple";
import SidebarFilters from "../components/SidebarFilters";
import SiteDetailsPanel from "../components/SiteDetailsPanel";
import DataTable from "../components/DataTable";
// Removed CustomChartBuilder import
import { getActiveData, extractMapMarkers } from "../lib/filterUtils";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const HomePage = ({
  tableViewConfig = {
    selectedColumns: [], // Empty array means all columns visible by default
    filters: {},
  },
  setTableViewConfig = () => {},
  chartViewConfig = {
    type: "bar",
    xAxis: "",
    yAxis: "",
  },
  setChartViewConfig = () => {},
}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [columns, setColumns] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [filteredTableData, setFilteredTableData] = useState([]); // Add state for filtered table data
  const [tableFilters, setTableFilters] = useState({}); // Add state for table filters
  const [activeData, setActiveData] = useState([]); // Add state for active filtered dataset
  const [filters, setFilters] = useState({
    siteName: "",
    voltage: "",
    powerRange: { min: 0 },
    operators: "",
  });
  // Get activeView from tableViewConfig instead of maintaining separate state
  const activeView = tableViewConfig?.activeView || null;

  // Compute activeData whenever view configuration or data changes
  useEffect(() => {
    console.log("HomePage: Computing activeData", {
      dataLength: data.length,
      tableViewConfig,
      activeView,
      selectedColumns: tableViewConfig?.selectedColumns,
      filters: tableViewConfig?.filters
    });

    if (data.length > 0) {
      const computedActiveData = getActiveData(data, {
        selectedColumns: tableViewConfig?.selectedColumns || [],
        filters: tableViewConfig?.filters || {}
      });
      
      console.log("HomePage: Computed activeData", {
        originalDataLength: data.length,
        activeDataLength: computedActiveData.length,
        sampleActiveData: computedActiveData.slice(0, 3)
      });
      
      setActiveData(computedActiveData);
    } else {
      console.log("HomePage: No data available, setting activeData to empty array");
      setActiveData([]);
    }
  }, [data, tableViewConfig?.selectedColumns, tableViewConfig?.filters, activeView]);

  console.log("HomePage received props:", { tableViewConfig, chartViewConfig });
  console.log("HomePage activeView:", activeView);
  console.log("HomePage selectedColumns:", tableViewConfig?.selectedColumns);
  console.log("HomePage tableViewConfig.filters:", tableViewConfig?.filters);

  // Fetch data from the same endpoint as TableView
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log("Fetching transformer data...");

        // Use the transformers endpoint to get all data with all columns
        const res = await fetch(`${API_BASE}/data/transformers`);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();
        console.log("HomePage: Received transformer data", json);

        if (Array.isArray(json)) {
          setData(json);

          // Generate columns dynamically from the data
          if (json.length > 0) {
            // Use the first row to determine column names
            const firstRow = json[0];
            const keys = Object.keys(firstRow);
            const cols = keys.map((k) => ({
              accessorKey: k,
              header: String(k)
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase()),
            }));
            setColumns(cols);

            // Update tableViewConfig to show all columns if none are selected
            // Only set if currently empty or not set
            if (
              !tableViewConfig?.selectedColumns ||
              tableViewConfig.selectedColumns.length === 0
            ) {
              setTableViewConfig({
                ...tableViewConfig,
                selectedColumns: keys, // Show all columns by default
              });
            }
          } else {
            setColumns([]);
          }
        } else {
          setData([]);
          setError("Unexpected data format from backend");
          setColumns([]);
        }
      } catch (err) {
        console.error("Error fetching transformer data:", err);
        setError(err.message);
        setData([]);
        setColumns([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Apply view configuration when it changes
  useEffect(() => {
    if (
      tableViewConfig?.selectedColumns &&
      tableViewConfig.selectedColumns.length > 0
    ) {
      console.log("Applying view configuration:", tableViewConfig);
    }

    if (tableViewConfig?.filters) {
      console.log("Applying view filters:", tableViewConfig.filters);
    }

    // activeView is now derived from tableViewConfig, no need to set it
  }, [tableViewConfig]);

  // Handle column selection changes
  const handleSelectedColumnsChange = (selectedColumns) => {
    // Update the tableViewConfig with the new selected columns
    setTableViewConfig({
      ...tableViewConfig,
      selectedColumns,
    });
  };

  // Handle filtered data changes from DataTable
  const handleFilteredDataChange = (filteredData) => {
    console.log("HomePage: Received filtered data from DataTable", {
      originalDataLength: data.length,
      filteredDataLength: filteredData.length,
      sampleData: filteredData.slice(0, 3)
    });
    setFilteredTableData(filteredData);
  };

  // Handle filter changes from DataTable
  const handleFiltersChange = (filters) => {
    console.log("HomePage: Received filter changes from DataTable", filters);
    setTableFilters(filters);
    
    // Update tableViewConfig with current filters
    setTableViewConfig(prev => ({
      ...prev,
      filters: filters
    }));
  };

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!data || data.length === 0) return null;

    const totalSubstations = data.length;
    const headroomValues = data
      .map((item) => item["Generation Headroom Mw"])
      .filter((val) => val !== null && val !== undefined);

    const avgHeadroom =
      headroomValues.length > 0
        ? headroomValues.reduce((sum, val) => sum + val, 0) /
          headroomValues.length
        : null;

    const greenSites = data.filter(
      (item) => item["Generation Headroom Mw"] >= 50
    ).length;
    const amberSites = data.filter(
      (item) =>
        item["Generation Headroom Mw"] >= 20 &&
        item["Generation Headroom Mw"] < 50
    ).length;
    const redSites = data.filter(
      (item) => item["Generation Headroom Mw"] < 20
    ).length;

    return {
      totalSubstations,
      avgHeadroom,
      greenSites,
      amberSites,
      redSites,
    };
  }, [data]);

  // Extract unique voltage levels and operators from data
  const voltageLevels = [...new Set(data.map((site) => site["Site Voltage"]))]
    .filter(Boolean)
    .sort((a, b) => a - b);
  const operators = [...new Set(data.map((site) => site["Licence Area"]))]
    .filter(Boolean)
    .sort();

  const handleMarkerClick = (site) => {
    setSelectedSite(site);
  };

  // Create a unified filter object for the map component
  const mapFilters = {
    siteName: filters.siteName,
    voltage: filters.voltage,
    powerRange: filters.powerRange,
    operators: filters.operators,
  };

  console.log("HomePage: mapFilters updated:", mapFilters);

  // Note: filteredDataForMap logic removed - now using activeData for all components

  console.log("HomePage rendering with data:", data);
  console.log("HomePage activeData:", activeData);

  return (
    <div className="min-h-screen flex flex-col space-y-8 p-6">
      {/* Header Section */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent mb-2">
          Power System Dashboard
        </h1>
        <p className="text-lg text-gray-300">
          Interactive map and data analysis for power infrastructure monitoring
        </p>
      </div>

      {/* Main Content Area - Three Compact Panels */}
      <div className="flex flex-col lg:flex-row gap-4 h-[450px]">
        {/* Left Panel - Filters */}
        <div className="w-full lg:w-72 xl:w-80 flex-shrink-0">
          <div className="glass-card p-4 h-full flex flex-col">
            <SidebarFilters
              onSiteNameSearch={(name) => {
                console.log("HomePage: Site name filter changed to:", name);
                setFilters((f) => ({ ...f, siteName: name }));
              }}
              onVoltageFilter={(voltage) => {
                console.log("HomePage: Voltage filter changed to:", voltage);
                setFilters((f) => ({ ...f, voltage }));
              }}
              onPowerRangeChange={(range) => {
                console.log("HomePage: Power range filter changed to:", range);
                setFilters((f) => ({ ...f, powerRange: range }));
              }}
              onOperatorFilter={(operator) => {
                console.log("HomePage: Operator filter changed to:", operator);
                setFilters((f) => ({ ...f, operators: operator }));
              }}
              voltageLevels={voltageLevels}
              operators={operators}
              currentFilters={filters}
            />
          </div>
        </div>

        {/* Center Panel - Map */}
        <div className="flex-1 min-w-0">
          <div className="glass-card p-2 h-full flex flex-col">
            <div className="flex-1 rounded-lg overflow-hidden shadow-lg relative">
              {console.log("HomePage: Passing data to CompactGoogleMapSimple:", {
                dataLength: (activeData.length > 0 ? activeData : data).length,
                activeDataLength: activeData.length,
                rawDataLength: data.length,
                mapFilters,
                selectedColumns: tableViewConfig?.selectedColumns || [],
                activeView
              })}
              <CompactGoogleMapSimple
                isHomePage={true}
                data={activeData.length > 0 ? activeData : data} // Use activeData if available, otherwise fallback to raw data
                filters={mapFilters}
                selectedColumns={tableViewConfig?.selectedColumns || []}
                onMarkerClick={handleMarkerClick}
                activeView={activeView} // Pass active view to map component
                locationColumn={tableViewConfig?.mapConfig?.locationColumn || "Site Name"}
              />
            </div>
          </div>
        </div>

        {/* Right Panel - Site Details */}
        <div className="w-full lg:w-72 xl:w-80 flex-shrink-0">
          <div className="glass-card p-4 h-full flex flex-col">
            <SiteDetailsPanel
              selectedSite={selectedSite}
              summaryStats={summaryStats}
              onClose={() => setSelectedSite(null)}
            />
          </div>
        </div>
      </div>

      {/* Bottom Section - Data Table with More Space */}
      <div className="flex-1 min-h-[500px]">
        <div className="glass-card p-6 h-full">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Data Analysis</h2>
            <p className="text-gray-300">Detailed view of power system infrastructure data</p>
          </div>
          {loading ? (
            <div className="w-full h-64 flex items-center justify-center">
              <div className="text-gray-600">Loading data...</div>
            </div>
          ) : error ? (
            <div className="w-full h-64 flex items-center justify-center">
              <div className="text-red-600">{error}</div>
            </div>
          ) : (
            <DataTable
              key={`table-${activeView || 'default'}-${JSON.stringify(tableViewConfig?.selectedColumns || [])}`} // Force re-render when view changes
              data={activeData.length > 0 ? activeData : data} // Use activeData if available, otherwise fallback to raw data
              columns={columns}
              selectedColumns={tableViewConfig?.selectedColumns || []} // Pass empty array when no columns selected
              onSelectedColumnsChange={handleSelectedColumnsChange}
              onFilteredDataChange={handleFilteredDataChange} // Pass handler for filtered data changes
              onFiltersChange={handleFiltersChange} // Pass handler for filter changes
              initialFilters={tableViewConfig?.filters || {}} // Pass initial filters from saved view
              initialSortConfig={tableViewConfig?.sortBy ? { sortBy: tableViewConfig.sortBy, sortDirection: tableViewConfig.sortDirection } : null} // Pass initial sort config
              initialPaginationConfig={tableViewConfig?.pageSize ? { pageSize: tableViewConfig.pageSize, currentPage: tableViewConfig.currentPage } : null} // Pass initial pagination config
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
