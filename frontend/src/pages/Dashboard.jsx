import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import HomePage from "./HomePage";
import MapView from "./MapView";
import TableView from "../components/TableView";
import CustomChartBuilder from "../components/CustomChartBuilder";
import SummaryPage from "./SummaryPage";
import AdminPanel from "./AdminPanel";

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Home");
  const [allColumns, setAllColumns] = useState([]);

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

  // Fetch all columns for ViewManager
  useEffect(() => {
    const fetchColumns = async () => {
      try {
        const response = await fetch("/data/columns");
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
    navigate("/login");
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
      console.log("Sort config:", { sortBy: newTableViewConfig.sortBy, sortDirection: newTableViewConfig.sortDirection });
      console.log("Pagination config:", { pageSize: newTableViewConfig.pageSize, currentPage: newTableViewConfig.currentPage });
      setTableViewConfig(newTableViewConfig);
    }

    // Update chart view configuration
    if (viewConfig.chartView) {
      setChartViewConfig(viewConfig.chartView);
      console.log("Chart view config updated:", viewConfig.chartView);
    }

    // Update map view configuration (if provided)
    if (viewConfig.mapView) {
      console.log("Map view config updated:", viewConfig.mapView);
      // Map view configuration will be handled by the map components
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
        console.log("selectedColumns being passed:", tableViewConfig?.selectedColumns || []);
        return <MapView 
          activeView={tableViewConfig?.activeView || null} 
          selectedColumns={tableViewConfig?.selectedColumns || []} 
        />; // Pass active view and selected columns to MapView
      case "Table View":
        return <TableView />;
      case "Charts":
        return (
          <div className="px-4 py-6">
            <div className="mb-4">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Charts</h1>
              <p className="text-gray-600">
                Build custom charts from your data. Select a chart type and
                configure the axes.
              </p>
            </div>
            <CustomChartBuilder
              selectedColumns={tableViewConfig?.selectedColumns || []}
              filters={tableViewConfig?.filters || {}}
              chartType={chartViewConfig?.type || "bar"}
              xAxis={chartViewConfig?.xAxis || ""}
              yAxis={chartViewConfig?.yAxis || ""}
            />
          </div>
        );
      case "Admin Panel":
        return <AdminPanel />;
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header - Always at top */}
      <Header
        onLogout={handleLogout}
        onViewLoad={handleViewLoad}
      />
      
      {/* Sidebar - Below header */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onViewLoad={handleViewLoad}
        currentTableView={tableViewConfig}
        currentChartView={chartViewConfig}
        allColumns={allColumns}
      />
      
      {/* Main content area - Flexible */}
      <div className="flex-1 flex flex-col">
        <motion.main
          className="flex-1 modern-page-container"
          key={activeTab}
          variants={pageVariants}
          initial="initial"
          animate="in"
          exit="out"
          transition={pageTransition}
        >
          {renderContent()}
        </motion.main>
        
        {/* Footer - At bottom */}
        <Footer
          showButtons={activeTab === "Home"}
        />
      </div>
    </div>
  );
};

export default Dashboard;
