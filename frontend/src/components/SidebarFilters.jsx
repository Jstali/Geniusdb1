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
    powerRange: { min: 0, max: 200 },
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
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
              Filters
            </h3>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-gray-300 hover:text-violet-400 transition-colors duration-200 md:hidden"
        >
          {isCollapsed ? ">>" : "<<"}
        </button>
      </div>

      {!isCollapsed && (
        <div className="flex flex-col gap-4">
          {/* Search by Site Name */}
          <div> 
            <label className=" ">
              Search by Site Name
              </label>
            <input
              type="text"
              placeholder="Enter site name..."
              className="w-full px-4 py-2.5 bg-white/10 border border-violet-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200 backdrop-blur-sm hover:bg-white/15"
              onChange={handleSiteNameChange}
              value={currentFilters.siteName || ""}
            />
          </div>

          {/* Voltage Level Filter */}
          <div>
            <label className="">
              Voltage Level
            </label>
            <select
              className="w-full px-4 py-2.5 bg-white/10 border border-violet-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200 backdrop-blur-sm hover:bg-white/15"
              value={currentFilters.voltage || ""}
              onChange={handleVoltageChange}
            >
              <option value="" className="bg-slate-800">All Voltage Levels</option>
              {voltageLevels.map((voltage) => (
                <option key={voltage} value={voltage} className="bg-slate-800">
                  {voltage} kV
                </option>
              ))}
            </select>
          </div>

          {/* Available Power Range Input */}
          <div>
            <label className="">
              Available Power (MW)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="0"
              className="w-full px-4 py-2.5 bg-white/10 border border-violet-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200 backdrop-blur-sm hover:bg-white/15"
              value={currentFilters.powerRange?.min ?? 0}
              onChange={(e) => handlePowerRangeChange(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1.5">Show sites with power ≥ this value</p>
          </div>

          {/* Network Operators Filter */}
          <div>
            <label className="">
              Network Operator
            </label>
            <select
              className="w-full px-4 py-2.5 bg-white/10 border border-violet-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200 backdrop-blur-sm hover:bg-white/15"
              value={currentFilters.operators || ""}
              onChange={handleOperatorChange}
            >
              <option value="" className="bg-slate-800">All Operators</option>
              {operators.map((operator) => (
                <option key={operator} value={operator} className="bg-slate-800">
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
