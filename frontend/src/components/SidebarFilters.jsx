import React, { useState } from "react";

const SidebarFilters = ({
  onSiteNameSearch,
  onVoltageFilter,
  onPowerRangeChange,
  onOperatorFilter,
  voltageLevels = [20, 22, 33, 66, 132],
  operators = [
    "Eastern Power Networks (EPN)",
    "London Power Networks (LPN)",
    "South Eastern Power Networks (SPN)",
  ],
  currentFilters = {
    siteName: "",
    voltage: "",
    powerRange: { min: 0 },
    operators: "",
  },
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleSiteNameChange = (e) => {
    onSiteNameSearch(e.target.value);
  };

  const handleVoltageChange = (e) => {
    onVoltageFilter(e.target.value);
  };

  const handlePowerRangeChange = (min) => {
    onPowerRangeChange({ min: parseFloat(min) });
  };

  const handleOperatorChange = (e) => {
    onOperatorFilter(e.target.value);
  };

  return (
    <div className="map-container bg-white p-6 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-gray-500 hover:text-gray-700 transition-colors duration-200 md:hidden"
        >
          {isCollapsed ? ">>" : "<<"}
        </button>
      </div>

      {!isCollapsed && (
        <div className="space-y-6">
          {/* Search by Site Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search by Site Name
            </label>
            <input
              type="text"
              placeholder="Enter site name..."
              className="w-full px-3 py-2 border text-gray-600 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              onChange={handleSiteNameChange}
              value={currentFilters.siteName || ""}
            />
          </div>

          {/* Voltage Level Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Voltage Level
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              value={currentFilters.voltage || ""}
              onChange={handleVoltageChange}
            >
              <option value="">All Voltage Levels</option>
              {voltageLevels.map((voltage) => (
                <option key={voltage} value={voltage}>
                  {voltage} kV
                </option>
              ))}
            </select>
          </div>

          {/* Available Power Range Slider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Available Power (MW) &ge;
            </label>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              value={currentFilters.powerRange?.min ?? 0}
              onChange={(e) => handlePowerRangeChange(e.target.value)}
            />
          </div>

          {/* Network Operators Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Network Operator
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              value={currentFilters.operators || ""}
              onChange={handleOperatorChange}
            >
              <option value="">All Operators</option>
              {operators.map((operator) => (
                <option key={operator} value={operator}>
                  {operator}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default SidebarFilters;
