import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "../components/Header";
import Footer from "../components/Footer";
import HomePage from "./HomePage.jsx";
import MapView from "./MapView.jsx";
import TableView from "../components/TableView";
import ChartGeneratorDemo from "./ChartGeneratorDemo.jsx";
import SummaryPage from "./SummaryPage.jsx";
import ViewManagementModal from "../components/ViewManagementModal";
import { API_BASE } from "../config/api";

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Home");
  const [allColumns, setAllColumns] = useState([]);
  const [isViewManagerOpen, setIsViewManagerOpen] = useState(false);

  // View management state
  const [tableViewConfig, setTableViewConfig] = useState({
    selectedColumns: [],
    filters: {},
  });

  const [chartViewConfig, setChartViewConfig] = useState({
    type: "bar",
    xAxis: "",
    yAxis: "",
  });

  const [mapViewConfig, setMapViewConfig] = useState({
    locationColumn: "Site Name",
    showMarkers: true,
    markerFilter: [],
  });

  // Chart state for persistence across page navigation
  const [generatedChart, setGeneratedChart] = useState(null);

  // Fetch all columns for ViewManager
  useEffect(() => {
    const fetchColumns = async () => {
      try {
        const response = await fetch(`${API_BASE}/data/columns`);
        if (response.ok) {
          const data = await response.json();
          // Extract column objects from the data structure
          const columns = Object.keys(data).reduce((acc, tableName) => {
            if (data[tableName] && Array.isArray(data[tableName])) {
              acc.push(...data[tableName]);
            }
            return acc;
          }, []);
          setAllColumns(columns);
        }
      } catch (error) {
        console.error("Failed to fetch columns:", error);
      }
    };

    fetchColumns();
  }, []);

  const handleLogout = () => {
    try {
      // Clear all authentication-related data
      localStorage.removeItem("isLoggedIn");
      localStorage.clear(); // Clear all localStorage data
      
      // Force navigation to login page
      navigate("/login", { replace: true });
      
      // Force a page refresh to ensure clean state
      window.location.href = "/login";
    } catch (e) {
      console.warn("Unable to clear login state", e);
      // Fallback: force navigation even if localStorage fails
      navigate("/login", { replace: true });
      window.location.href = "/login";
    }
  };

  const handleNavigate = (tab) => {
    if (tab === "View Management") {
      setIsViewManagerOpen(true);
    } else {
      setActiveTab(tab);
    }
  };

  const resolveViewSlot = async (viewName) => {
    if (!viewName) {
      return null;
    }

    const slotMatch = viewName.match(/^View\s+(\d+)$/i);
    if (slotMatch) {
      return parseInt(slotMatch[1], 10);
    }

    try {
      const response = await fetch(`${API_BASE}/api/user/views`);
      if (!response.ok) {
        console.warn("Failed to fetch saved views list:", response.status);
        return null;
      }

      const payload = await response.json();
      const views = Array.isArray(payload?.views) ? payload.views : [];
      const matchingView = views.find((view) => view.name === viewName);

      if (matchingView?.slot) {
        return matchingView.slot;
      }
    } catch (err) {
      console.warn("Error resolving view slot from backend:", err);
    }

    return null;
  };

  // Load a saved view by name
  const handleLoadSavedView = async (viewName) => {
    try {
      console.log("Loading saved view:", viewName);

      const slot = await resolveViewSlot(viewName);

      if (!slot) {
        console.warn("Unable to resolve slot for view:", viewName);
        localStorage.removeItem("activeView");
        return;
      }

      const response = await fetch(`${API_BASE}/api/user/views/${slot}`);

      if (response.status === 404) {
        console.warn(`Saved view slot ${slot} not found. Clearing active view.`);
        localStorage.removeItem("activeView");
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        console.error("Error loading view:", data.error);
        return;
      }

      // Parse all saved configurations
      const savedFilters = data.filters ? JSON.parse(data.filters) : {};
      const savedChartConfig = data.chart_config
        ? JSON.parse(data.chart_config)
        : { type: "bar", xAxis: "", yAxis: "" };
      const savedMapConfig = data.map_config
        ? JSON.parse(data.map_config)
        : { locationColumn: "Site Name", showMarkers: true, markerFilter: [] };
      const savedSortConfig = data.sort_config
        ? JSON.parse(data.sort_config)
        : { sortBy: [], sortDirection: "asc" };
      const savedPaginationConfig = data.pagination_config
        ? JSON.parse(data.pagination_config)
        : { pageSize: 10, currentPage: 1 };
      
      // Apply the loaded view configuration with all saved state
      const viewConfig = {
        tableView: {
          selectedColumns: data.selected_columns
            ? data.selected_columns.split(",")
            : [],
          filters: savedFilters,
          sortBy: savedSortConfig.sortBy,
          sortDirection: savedSortConfig.sortDirection,
          pageSize: savedPaginationConfig.pageSize,
          currentPage: savedPaginationConfig.currentPage,
        },
        chartView: savedChartConfig,
        mapView: savedMapConfig,
        viewName: viewName,
      };

      // Apply the view configuration
      handleViewLoad(viewConfig);
    } catch (err) {
      console.error("Failed to load saved view:", err);
    }
  };

  const handleViewLoad = (viewConfig) => {
    console.log("=== Dashboard: handleViewLoad called ===");
    console.log("View config:", viewConfig);

    // Clear the previously generated chart when switching views
    setGeneratedChart(null);

    // Update table view configuration with enhanced state
    if (viewConfig.tableView) {
      // Create a completely new config object, replacing the old one entirely
      // IMPORTANT: Explicitly set filters to the saved filters or empty object
      // This prevents filters from one view bleeding into another
      const savedFilters = viewConfig.tableView.filters || {};
      console.log("Setting filters for view:", viewConfig.viewName, "Filters:", savedFilters);
      
      const newTableViewConfig = {
        selectedColumns: viewConfig.tableView.selectedColumns || [],
        filters: savedFilters, // Explicitly use saved filters, not previous filters
        sortBy: viewConfig.tableView.sortBy || [],
        sortDirection: viewConfig.tableView.sortDirection || "asc",
        pageSize: viewConfig.tableView.pageSize || 10,
        currentPage: viewConfig.tableView.currentPage || 1,
        activeView: viewConfig.viewName || null, // Set active view
        // Preserve map config if it exists
        ...(tableViewConfig?.mapConfig ? { mapConfig: tableViewConfig.mapConfig } : {}),
      };
      console.log("Enhanced table view config updated:", newTableViewConfig);
      console.log("Selected columns:", newTableViewConfig.selectedColumns);
      console.log("Filters:", newTableViewConfig.filters);
      console.log("Sort config:", {
        sortBy: newTableViewConfig.sortBy,
        sortDirection: newTableViewConfig.sortDirection,
      });
      console.log("Pagination config:", {
        pageSize: newTableViewConfig.pageSize,
        currentPage: newTableViewConfig.currentPage,
      });
      setTableViewConfig(newTableViewConfig);
    }

    // Update chart view configuration
    if (viewConfig.chartView) {
      setChartViewConfig(viewConfig.chartView);
      console.log("Chart view config updated:", viewConfig.chartView);
    }

    // Update map view configuration (if provided)
    if (viewConfig.mapView) {
      setMapViewConfig(viewConfig.mapView);
      console.log("Map view config updated:", viewConfig.mapView);
    }

    // Save active view to localStorage for persistence across reloads
    if (viewConfig.viewName) {
      localStorage.setItem("activeView", viewConfig.viewName);
    }

    console.log("=== Dashboard: handleViewLoad completed ===");
  };

  // Auto-load saved view on mount
  useEffect(() => {
    const savedActiveView = localStorage.getItem("activeView");
    if (savedActiveView) {
      console.log("Auto-loading saved view on mount:", savedActiveView);
      handleLoadSavedView(savedActiveView);
    }
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case "Home":
        return (
          <HomePage
            tableViewConfig={{
              ...tableViewConfig,
              mapConfig: mapViewConfig, // Pass map configuration
              // activeView is already in tableViewConfig
            }}
            setTableViewConfig={setTableViewConfig}
            chartViewConfig={chartViewConfig}
            setChartViewConfig={setChartViewConfig}
          />
        );
      case "Summary":
        return <SummaryPage />;
      case "Map View":
        console.log("=== Dashboard: Rendering MapView ===");
        console.log("activeView:", tableViewConfig?.activeView);
        console.log("tableViewConfig:", tableViewConfig);
        console.log(
          "selectedColumns being passed:",
          tableViewConfig?.selectedColumns || []
        );
        return (
          <MapView
            activeView={tableViewConfig?.activeView || null}
            selectedColumns={tableViewConfig?.selectedColumns || []}
          />
        ); // Pass active view and selected columns to MapView
      case "Table View":
        return <TableView />;
      case "Chart Generator":
        return (
          <div className="p-6">
            <ChartGeneratorDemo
              selectedColumns={tableViewConfig?.selectedColumns || []}
              filters={tableViewConfig?.filters || {}}
              chartConfig={chartViewConfig}
              generatedChart={generatedChart}
              setGeneratedChart={setGeneratedChart}
              setChartConfig={setChartViewConfig}
            />
          </div>
        );
      case "Admin Panel":
        return (
          <div className="p-6">
            <h2 className="text-2xl text-gray-950 font-bold mb-4">
              Admin Panel
            </h2>
            <p className="text-gray-600">Admin panel content goes here</p>
          </div>
        );
      default:
        return <HomePage />;
    }
  };

  // Animation variants for page transitions
  const pageVariants = {
    initial: {
      opacity: 0,
      y: 20,
    },
    in: {
      opacity: 1,
      y: 0,
    },
    out: {
      opacity: 0,
      y: -20,
    },
  };

  const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.3,
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#F6F2F4" }}
    >
      <Header
        active={activeTab}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        onViewLoad={handleViewLoad}
        className={
          activeTab === "Home" ? "fixed top-0 left-0 right-0 z-20" : ""
        }
      />
      <motion.main
        className={`flex-grow p-6 ${
          activeTab === "Home" ||
          activeTab === "Summary" ||
          activeTab === "Charts"
            ? "pb-16"
            : ""
        } ${activeTab === "Home" ? "pt-24" : "mt-4"}`}
        key={activeTab}
        variants={pageVariants}
        initial="initial"
        animate="in"
        exit="out"
        transition={pageTransition}
      >
        {renderContent()}
      </motion.main>
      <Footer
        showButtons={activeTab === "Home"}
        className={
          activeTab === "Home" ||
          activeTab === "Summary" ||
          activeTab === "Charts"
            ? "fixed bottom-0 left-0 right-0 z-10"
            : ""
        }
      />

      {/* View Management Modal */}
      <ViewManagementModal
        isOpen={isViewManagerOpen}
        onClose={() => setIsViewManagerOpen(false)}
        onLoadView={(viewConfig) => {
          if (handleViewLoad) {
            handleViewLoad(viewConfig);
          }
          setIsViewManagerOpen(false);
        }}
        currentTableView={tableViewConfig}
        currentChartConfig={chartViewConfig}
        allColumns={allColumns}
        activeView={tableViewConfig?.activeView || null}
      />
    </div>
  );
};

export default Dashboard;
