import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ViewManagementModal from "./ViewManagementModal";

const Sidebar = ({
  activeTab,
  setActiveTab,
  className = "",
  onViewLoad,
  currentTableView,
  currentChartView,
  currentPivotView,
  allColumns = [],
}) => {
  const navigate = useNavigate();
  const [isViewManagerOpen, setIsViewManagerOpen] = useState(false);

  const menuItems = ["Home", "Summary", "Charts", "Admin Panel"];

  return (
    <>
      <aside className={`bg-white shadow-md overflow-x-auto z-10 ${className}`}>
        <nav className="px-6 pt-0 pb-4 flex justify-between items-center">
          <ul className="flex space-x-4">
            {menuItems.map((item) => (
              <li key={item}>
                <button
                  onClick={() => setActiveTab(item)}
                  className={`px-5 py-2.5 text-base rounded-lg transition-all duration-300 whitespace-nowrap transform hover:scale-105 hover:shadow-md ${
                    activeTab === item
                      ? "bg-blue-600 text-white font-semibold shadow-lg"
                      : "text-gray-600 hover:bg-gray-100 font-medium"
                  }`}
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
          {activeTab === "Home" && (
            <button
              onClick={() => setIsViewManagerOpen(true)}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition text-sm font-semibold"
            >
              View Management
            </button>
          )}
        </nav>
      </aside>

      {activeTab === "Home" && (
        <ViewManagementModal
          isOpen={isViewManagerOpen}
          onClose={() => setIsViewManagerOpen(false)}
          onLoadView={(viewConfig) => {
            if (onViewLoad) {
              onViewLoad(viewConfig);
            }
            setIsViewManagerOpen(false);
          }}
          currentTableView={currentTableView}
          allColumns={allColumns}
        />
      )}
    </>
  );
};

export default Sidebar;
