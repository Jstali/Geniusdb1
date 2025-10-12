import React from "react";
import SavedViewsDropdown from "./SavedViewsDropdown";

const DEFAULT_MENU = [
  "Home",
  "Summary",
  "Charts",
  "Map View",
  "Table View",
  "Admin Panel",
];

const Header = ({
  active = "Home",
  onNavigate = () => {},
  onLogout = null,
  menu = DEFAULT_MENU,
  children = null,
  className = "",
  onViewLoad = null, // Add onViewLoad prop
}) => {
  return (
    <header className={`w-full px-4 py-4 bg-white border-b border-gray-200 shadow-sm ${className}`}>
      <div className="w-full">
        <div className="flex items-center justify-between">
          {/* Left: Title */}
          <div className="flex items-center">
            <img 
              src="/geniusdb2.png" 
              alt="Genius DB Logo" 
              className="w-12 h-12 mr-4 object-contain"
            />
            <h1 className="text-2xl font-bold text-gray-900">
              GeniusDB
            </h1>
          </div>

          {/* Right: children or logout */}
          <div className="flex items-center">
            {children ? (
              children
            ) : (
              <div className="flex items-center gap-4">
                {onViewLoad && <SavedViewsDropdown onLoadView={onViewLoad} />}
                {onLogout ? (
                  <button
                    onClick={onLogout}
                    className="modern-btn bg-red-500 hover:bg-red-600 text-white"
                  >
                    Logout
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
