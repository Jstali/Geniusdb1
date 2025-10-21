import React, { useState, useEffect, useRef } from "react";

const SavedViewsDropdown = ({ onLoadView }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [views, setViews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const dropdownRef = useRef(null);

  // Get API base URL from environment or default to localhost:8000
  const API_BASE = (window._env_ && window._env_.API_BASE) || "";

  // Fetch saved views
  const fetchViews = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_BASE}/api/user/views`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setViews(data.views || []);
    } catch (err) {
      setError("Failed to fetch views: " + err.message);
      console.error("Error fetching views:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Toggle dropdown and fetch views when opening
  const toggleDropdown = async () => {
    if (!isOpen) {
      await fetchViews();
    }
    setIsOpen(!isOpen);
  };

  // Handle view selection
  const handleViewSelect = async (view) => {
    try {
      setLoading(true);
      setIsOpen(false);

      const response = await fetch(`${API_BASE}/api/user/views/${view.slot}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      // Apply the loaded view configuration
      const viewConfig = {
        tableView: {
          selectedColumns: data.selected_columns
            ? data.selected_columns.split(",")
            : [],
          filters: data.filters ? JSON.parse(data.filters) : {},
        },
        chartView: data.chart_config
          ? JSON.parse(data.chart_config)
          : {
              type: "bar",
              xAxis: "",
              yAxis: "",
            },
        mapView: data.map_config
          ? JSON.parse(data.map_config)
          : {
              locationColumn: "Site Name",
              showMarkers: true,
              markerFilter: [],
            },
        viewName: view.name || `View ${view.slot}`, // Add view name to config
      };

      onLoadView(viewConfig);

      // Show success notification
      showNotification(
        `View '${view.name || `View ${view.slot}`}' loaded successfully`
      );
    } catch (err) {
      setError("Failed to load view: " + err.message);
      console.error("Error loading view:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle view deletion
  const handleDeleteView = async (slot, name) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/user/views/${slot}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Remove the deleted view from the local state
      setViews(views.filter((view) => view.slot !== slot));

      // Show success notification
      showNotification(`View '${name || `View ${slot}`}' deleted successfully`);
    } catch (err) {
      setError("Failed to delete view: " + err.message);
      console.error("Error deleting view:", err);
    } finally {
      setLoading(false);
    }
  };

  // Show notification
  const showNotification = (message) => {
    // Create notification element
    const notification = document.createElement("div");
    notification.className =
      "fixed top-20 right-4 bg-white text-gray-800 px-6 py-3 rounded-lg shadow-xl border-2 border-green-500 z-[9999] font-medium";
    notification.textContent = message;

    // Add to document
    document.body.appendChild(notification);

    // Add animation
    notification.style.transform = "translateX(100%)";
    notification.style.transition = "transform 0.3s ease-in-out";
    
    // Trigger animation
    setTimeout(() => {
      notification.style.transform = "translateX(0)";
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.transform = "translateX(100%)";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        disabled={loading}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition text-sm font-medium ml-2"
      >
        {loading ? "Loading..." : "Saved Views"}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg z-50 border border-gray-200">
          <div className="py-1">
            {error && (
              <div className="px-4 py-2 text-red-600 text-sm">{error}</div>
            )}

            {views.length === 0 && !loading && !error ? (
              <div className="px-4 py-2 text-gray-500 text-sm">
                No saved views
              </div>
            ) : (
              views.map((view) => (
                <div
                  key={view.slot}
                  className="flex justify-between items-center px-4 py-2 hover:bg-gray-100"
                >
                  <button
                    onClick={() => handleViewSelect(view)}
                    disabled={loading}
                    className="flex-grow text-left text-gray-700 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {view.name || `View ${view.slot}`}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteView(
                        view.slot,
                        view.name || `View ${view.slot}`
                      );
                    }}
                    disabled={loading}
                    className="ml-2 text-red-500 hover:text-red-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedViewsDropdown;
