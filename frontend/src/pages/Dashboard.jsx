import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "../components/Header";
import Footer from "../components/Footer";
import HomePage from "./HomePage";
import MapView from "./MapView";
import TableView from "../components/TableView";
import ChartGeneratorDemo from "./ChartGeneratorDemo";
import SummaryPage from "./SummaryPage";
import ViewManagementModal from "../components/ViewManagementModal";

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
        const API_BASE = (window._env_ && window._env_.API_BASE) || "";
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
      localStorage.removeItem("isLoggedIn");
    } catch (e) {
      console.warn("Unable to clear login state", e);
    }
    navigate("/login");
  };

  const handleNavigate = (tab) => {
    if (tab === "View Management") {
      setIsViewManagerOpen(true);
    } else {
      setActiveTab(tab);
    }
  };

  const handleViewLoad = (viewConfig) => {
    console.log("=== Dashboard: handleViewLoad called ===");
    console.log("View config:", viewConfig);

    // Update table view configuration with enhanced state
    if (viewConfig.tableView) {
      const newTableViewConfig = {
        ...tableViewConfig,
        ...viewConfig.tableView,
        activeView: viewConfig.viewName || null, // Set active view
        // Ensure all enhanced fields are included
        selectedColumns: viewConfig.tableView.selectedColumns || [],
        filters: viewConfig.tableView.filters || {},
        sortBy: viewConfig.tableView.sortBy || [],
        sortDirection: viewConfig.tableView.sortDirection || "asc",
        pageSize: viewConfig.tableView.pageSize || 10,
        currentPage: viewConfig.tableView.currentPage || 1,
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

    console.log("=== Dashboard: handleViewLoad completed ===");
  };

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
        allColumns={allColumns}
      />
    </div>
  );
};

export default Dashboard;
