import React, { useState, useEffect, useMemo } from "react";
import CompactGoogleMapSimple from "../components/CompactGoogleMapSimple";
import SidebarFilters from "../components/SidebarFilters";
import SiteDetailsPanel from "../components/SiteDetailsPanel";
import DataTable from "../components/DataTable";
// Removed CustomChartBuilder import
import { getActiveData, extractMapMarkers } from "../lib/filterUtils";

const API_BASE = (window._env_ && window._env_.API_BASE) || "";

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
  const [filteredTableData, setFilteredTableData] = useState(null); // null means no table filters active
  const [tableFilters, setTableFilters] = useState({}); // Add state for table filters
  const [activeData, setActiveData] = useState([]); // Add state for active filtered dataset
  const [showFullSites, setShowFullSites] = useState(false); // Add state for site filtering toggle
  const [filters, setFilters] = useState({
    siteName: "",
    voltage: "",
    powerRange: { min: 0 },
    operators: "",
  });
  // Get activeView from tableViewConfig instead of maintaining separate state
  const activeView = tableViewConfig?.activeView || null;

  // Function to filter sites based on the requirements
  const filterSitesByCategory = (data) => {
    if (showFullSites) {
      return data; // Show all sites
    }

    // Filter for limited sites: 10 green, 20 amber, 70 red
    const greenSites = data.filter(item => item["Generation Headroom Mw"] >= 50);
    const amberSites = data.filter(item => 
      item["Generation Headroom Mw"] >= 20 && item["Generation Headroom Mw"] < 50
    );
    const redSites = data.filter(item => item["Generation Headroom Mw"] < 20);

    // Take limited number of sites from each category
    const limitedGreenSites = greenSites.slice(0, 10);
    const limitedAmberSites = amberSites.slice(0, 20);
    const limitedRedSites = redSites.slice(0, 70);

    return [...limitedGreenSites, ...limitedAmberSites, ...limitedRedSites];
  };

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
      // First apply site filtering, then apply view configuration
      const filteredSites = filterSitesByCategory(data);
      const computedActiveData = getActiveData(filteredSites, {
        selectedColumns: tableViewConfig?.selectedColumns || [],
        filters: tableViewConfig?.filters || {}
      });
      
      console.log("HomePage: Computed activeData", {
        originalDataLength: data.length,
        filteredSitesLength: filteredSites.length,
        activeDataLength: computedActiveData.length,
        showFullSites,
        sampleActiveData: computedActiveData.slice(0, 3)
      });
      
      setActiveData(computedActiveData);
      // Don't initialize filteredTableData here - let table control it
    } else {
      console.log("HomePage: No data available, setting activeData to empty array");
      setActiveData([]);
      setFilteredTableData(null);
    }
  }, [data, tableViewConfig?.selectedColumns, tableViewConfig?.filters, activeView, showFullSites]);

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
    console.log("🔵 HomePage: Received filtered data from DataTable", {
      originalDataLength: data.length,
      filteredDataLength: filteredData.length,
      sampleData: filteredData.slice(0, 3),
      timestamp: new Date().toISOString()
    });
    // Always update filteredTableData - this drives the map updates
    // Even if filteredData is empty array (0 results), we set it to show no pins
    setFilteredTableData(filteredData);
    console.log("🟢 HomePage: filteredTableData state updated to", filteredData.length, "items - map should update now");
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

  // Calculate summary statistics based on filtered data
  const summaryStats = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Use filtered sites for statistics
    const filteredSites = filterSitesByCategory(data);
    const totalSubstations = filteredSites.length;
    const headroomValues = filteredSites
      .map((item) => item["Generation Headroom Mw"])
      .filter((val) => val !== null && val !== undefined);

    const avgHeadroom =
      headroomValues.length > 0
        ? headroomValues.reduce((sum, val) => sum + val, 0) /
          headroomValues.length
        : null;

    const greenSites = filteredSites.filter(
      (item) => item["Generation Headroom Mw"] >= 50
    ).length;
    const amberSites = filteredSites.filter(
      (item) =>
        item["Generation Headroom Mw"] >= 20 &&
        item["Generation Headroom Mw"] < 50
    ).length;
    const redSites = filteredSites.filter(
      (item) => item["Generation Headroom Mw"] < 20
    ).length;

    return {
      totalSubstations,
      avgHeadroom,
      greenSites,
      amberSites,
      redSites,
    };
  }, [data, showFullSites]);

  // Extract unique voltage levels and operators from data
  const voltageLevels = [...new Set(data.map((site) => site["Site Voltage"]))]
    .filter(Boolean)
    .sort((a, b) => a - b);
  const operators = [...new Set(data.map((site) => site["Licence Area"]))]
    .filter(Boolean)
    .sort();
  
  // Extract unique site names for autocomplete
  const siteNames = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Get all site names and clean them
    const allSiteNames = data.map((site) => {
      const siteName = site["Site Name"] || site.site_name;
      return siteName ? siteName.trim() : null;
    }).filter(Boolean);
    
    // Debug logging
    console.log("All site names before deduplication:", allSiteNames.length);
    console.log("Sample site names:", allSiteNames.slice(0, 5));
    
    // Use Map to ensure true uniqueness (preserves order)
    const uniqueSiteNames = [];
    const seen = new Set();
    
    for (const name of allSiteNames) {
      if (!seen.has(name)) {
        seen.add(name);
        uniqueSiteNames.push(name);
      }
    }
    
    console.log("Unique site names after deduplication:", uniqueSiteNames.length);
    console.log("Sample unique site names:", uniqueSiteNames.slice(0, 5));
    
    return uniqueSiteNames.sort();
  }, [data]);

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
    <div className="flex flex-col h-full pt-1 transition-all duration-300">
      {/* Top section with map and panels */}
      <div className="flex gap-4 h-[600px] mb-6 transition-all duration-300 flex-layout">
        {/* Left panel - Filters */}
        <div className="w-80 shrink-0 transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1" style={{boxShadow: '0 4px 12px rgba(3, 3, 4, 0.08)', border: '1px solid rgba(3, 3, 4, 0.1)', borderRadius: '12px'}}>
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
            siteNames={siteNames}
            currentFilters={filters}
          />
        </div>

        {/* Center - Map with extra width */}
        <div className="flex-grow transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1" style={{boxShadow: '0 6px 16px rgba(3, 3, 4, 0.12)', borderRadius: '12px', border: '1px solid rgba(3, 3, 4, 0.1)'}}>
          <div className="h-full rounded-lg overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl relative">
            {console.log("🗺️ HomePage: Passing data to CompactGoogleMapSimple:", {
              filteredTableDataIsNull: filteredTableData === null,
              filteredTableDataLength: filteredTableData?.length || 0,
              activeDataLength: activeData.length,
              rawDataLength: data.length,
              filteredSitesLength: filterSitesByCategory(data).length,
              mapFilters,
              selectedColumns: tableViewConfig?.selectedColumns || [],
              activeView,
              showFullSites,
              dataToUse: filteredTableData !== null ? "filteredTableData" : "filteredSites",
              actualDataLength: filteredTableData !== null ? filteredTableData.length : filterSitesByCategory(data).length
            })}
            <CompactGoogleMapSimple
              isHomePage={true}
              data={filteredTableData !== null ? filteredTableData : filterSitesByCategory(data)} // Always use filtered sites for map
              filters={mapFilters}
              selectedColumns={tableViewConfig?.selectedColumns || []}
              onMarkerClick={handleMarkerClick}
              activeView={activeView} // Pass active view to map component
              locationColumn={tableViewConfig?.mapConfig?.locationColumn || "Site Name"}
              useTableFilters={true}
            />
          </div>
        </div>

        {/* Right panel - Site Details */}
        <div className="w-80 shrink-0 transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1" style={{boxShadow: '0 4px 12px rgba(3, 3, 4, 0.08)', border: '1px solid rgba(3, 3, 4, 0.1)', borderRadius: '12px'}}>
          <SiteDetailsPanel
            selectedSite={selectedSite}
            summaryStats={summaryStats}
            onClose={() => setSelectedSite(null)}
          />
        </div>
      </div>

      {/* Bottom section - Table (removed chart section) */}
      <div className="flex-grow bg-white rounded-lg shadow-lg p-4 transition-all duration-300 hover:shadow-xl table-container transform hover:-translate-y-1" style={{boxShadow: '0 4px 12px rgba(3, 3, 4, 0.08)', borderRadius: '12px', border: '1px solid rgba(3, 3, 4, 0.1)'}}>
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
          key={`table-${activeView || 'default'}-${showFullSites}`} // Re-render when site filtering changes
          data={data} // Pass full dataset to table
          columns={columns}
          selectedColumns={tableViewConfig?.selectedColumns || []} // Pass empty array when no columns selected
          onSelectedColumnsChange={handleSelectedColumnsChange}
          onFilteredDataChange={handleFilteredDataChange} // Pass handler for filtered data changes
          onFiltersChange={handleFiltersChange} // Pass handler for filter changes
          initialFilters={tableViewConfig?.filters || {}} // Pass initial filters from saved view
          initialSortConfig={tableViewConfig?.sortBy ? { sortBy: tableViewConfig.sortBy, sortDirection: tableViewConfig.sortDirection } : null} // Pass initial sort config
          initialPaginationConfig={tableViewConfig?.pageSize ? { pageSize: tableViewConfig.pageSize, currentPage: tableViewConfig.currentPage } : null} // Pass initial pagination config
          showFullSites={showFullSites} // Pass site filtering state
          onToggleFullSites={() => setShowFullSites(!showFullSites)} // Pass toggle handler
        />
        )}
      </div>
    </div>
  );
};

export default HomePage;
