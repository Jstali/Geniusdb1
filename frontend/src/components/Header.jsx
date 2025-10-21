import React from "react";
import SavedViewsDropdown from "./SavedViewsDropdown";
import { Bold } from "lucide-react";

const Header = ({
  active = "Home",
  onNavigate = () => {},
  onLogout = null,
  children = null,
  className = "",
  onViewLoad = null,
}) => {
  const navigationItems = ["Home", "Summary", "Chart Generator", "Admin Panel"];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 h-16 z-50 shadow-lg rounded-b-xl transition-all duration-300 hover:shadow-xl ${className}`}
        style={{
          backgroundColor: "#F6F2F4",
          boxShadow: "0 4px 12px rgba(3, 3, 4, 0.12)",
          border: "1px solid rgba(3, 3, 4, 0.1)",
        }}
      >
        <div className="w-full px-6 h-full">
          <div className="flex items-center h-full">
            {/* Left Corner: Logo */}
            <div className="flex items-center space-x-3">
              <img
                src="/geniusdb logo.png"
                alt="GeniusDB Logo"
                className="h-34 w-44"
                style={{
                  filter: "drop-shadow(2px 2px 4px rgba(3, 3, 4, 0.3))",
                }}
              />
              <h1 className="text-3xl font-black">
                <span style={{ color: "#FFC857" }}>GENIUS</span>
                <span style={{ color: "#297373" }}>DB</span>
              </h1>
            </div>

            {/* Center: Navigation */}
            <nav className="flex items-center space-x-8 flex-1 justify-center">
              {navigationItems.map((item) => (
                <button
                  key={item}
                  onClick={() => onNavigate(item)}
                  className={`font-medium text-sm uppercase tracking-wide transition-all duration-300 ${
                    active === item
                      ? "text-black px-4 py-2 rounded-md shadow-md hover:shadow-lg transform hover:scale-105"
                      : "text-black px-3 py-2 rounded-md hover:transform hover:scale-105"
                  }`}
                  style={{
                    backgroundColor:
                      active === item ? "#AD96DC" : "transparent",
                    color: "#030304",
                    boxShadow:
                      active === item
                        ? "0 4px 12px rgba(173, 150, 220, 0.3)"
                        : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (active !== item) {
                      e.target.style.backgroundColor = "#AD96DC";
                      e.target.style.color = "#030304";
                      e.target.style.boxShadow =
                        "0 4px 12px rgba(173, 150, 220, 0.3)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (active !== item) {
                      e.target.style.backgroundColor = "transparent";
                      e.target.style.color = "#030304";
                      e.target.style.boxShadow = "none";
                    }
                  }}
                >
                  {item}
                </button>
              ))}
            </nav>

            {/* Right Corner: Action Buttons */}
            <div className="flex items-center space-x-3">
              {/* View Management Button */}
              <button
                onClick={() => onNavigate("View Management")}
                className="px-4 py-2 text-white rounded-md font-medium text-sm uppercase tracking-wide transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                style={{
                  backgroundColor: "#412234",
                  boxShadow: "0 4px 12px rgba(65, 34, 52, 0.3)",
                }}
                onMouseEnter={(e) => {
                  e.target.style.boxShadow =
                    "0 6px 20px rgba(65, 34, 52, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.boxShadow =
                    "0 4px 12px rgba(65, 34, 52, 0.3)";
                }}
              >
                View Management
              </button>

              {/* Saved Views Dropdown */}
              {onViewLoad && (
                <div className="rounded-md  transition-all duration-300  transform hover:scale-105">
                  <SavedViewsDropdown onLoadView={onViewLoad} />
                </div>
              )}

              {/* Logout Button */}
              {onLogout ? (
                <button
                  onClick={onLogout}
                  className="px-4 py-2 text-white rounded-md font-medium text-sm uppercase tracking-wide transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                  style={{
                    backgroundColor: "#FF6B6B",
                    boxShadow: "0 4px 12px rgba(255, 107, 107, 0.3)",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#FF7276";
                    e.target.style.boxShadow =
                      "0 6px 20px rgba(255, 107, 107, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "#FF6B6B";
                    e.target.style.boxShadow =
                      "0 4px 12px rgba(255, 107, 107, 0.3)";
                  }}
                >
                  Logout
                </button>
              ) : (
                <button
                  onClick={() => onNavigate("Login")}
                  className="px-4 py-2 text-white rounded-md font-medium text-sm uppercase tracking-wide transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                  style={{
                    backgroundColor: "#FF6B6B",
                    boxShadow: "0 4px 12px rgba(255, 107, 107, 0.3)",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#FF7276";
                    e.target.style.boxShadow =
                      "0 6px 20px rgba(255, 107, 107, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "#FF6B6B";
                    e.target.style.boxShadow =
                      "0 4px 12px rgba(255, 107, 107, 0.3)";
                  }}
                >
                  Sign Up
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Spacer to prevent page content from sitting under the fixed header */}
      <div className="w-full" style={{ height: "2rem" }} aria-hidden="true" />
    </>
  );
};

export default Header;
