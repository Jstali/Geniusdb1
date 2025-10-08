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
    <header className={`w-full px-6 py-4 backdrop-blur-xl bg-white/5 border-b border-violet-500/20 shadow-glow ${className}`}>
      <div className="max-w-full mx-auto">
        <div className="flex items-center justify-between">
          {/* Left: Title */}
          <div className="flex items-center">
            <img 
              src="/geniusdb2.png" 
              alt="Genius DB Logo" 
              className="w-16 h-16 mr-3 object-contain drop-shadow-lg"
            />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
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
                    className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg shadow-glow hover:shadow-glow-lg transition-all duration-300 hover:scale-105 font-medium whitespace-nowrap"
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
