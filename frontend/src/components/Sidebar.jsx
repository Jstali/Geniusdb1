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
      <aside className={`backdrop-blur-xl bg-white/5 border-b border-violet-500/20 shadow-glow overflow-x-auto z-10 ${className}`}>
        <nav className="px-6 py-4 flex flex-wrap justify-between items-center gap-4">
          <ul className="flex flex-wrap gap-4">
            {menuItems.map((item) => (
              <li key={item}>
                <button
                  onClick={() => setActiveTab(item)}
                  className={`px-5 py-2.5 text-base rounded-lg transition-all duration-300 whitespace-nowrap hover:scale-105 ${
                    activeTab === item
                      ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold shadow-glow"
                      : "text-gray-300 hover:bg-white/10 font-medium hover:text-violet-400 hover:shadow-glow-sm"
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
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-glow hover:shadow-glow-lg transition-all duration-300 hover:scale-105 font-semibold whitespace-nowrap"
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
