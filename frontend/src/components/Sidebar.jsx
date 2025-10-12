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
      <aside className={`bg-white border-b border-gray-200 shadow-sm overflow-x-auto z-10 ${className}`}>
        <nav className="px-6 py-4 flex flex-wrap justify-between items-center gap-4">
          <ul className="flex flex-wrap gap-3">
            {menuItems.map((item) => (
              <li key={item}>
                <button
                  onClick={() => setActiveTab(item)}
                  className={`modern-btn transition-all duration-300 whitespace-nowrap ${
                    activeTab === item
                      ? "modern-btn-primary"
                      : "modern-btn-secondary hover:bg-gray-100"
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
              className="modern-btn modern-btn-primary font-semibold whitespace-nowrap"
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
