import React from "react";

const SiteDetailsPanel = ({ selectedSite, summaryStats, onClose }) => {
  if (!selectedSite) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">Site Details</h3>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-violet-400 transition-colors duration-200 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="text-center py-8">
            <p className="text-gray-400">
              Select a site on the map to see details
            </p>
          </div>

          {summaryStats && (
            <div className="mt-6 flex-1">
              <h4 className="font-medium text-gray-300 mb-2">
                Summary Statistics
              </h4>
              <div className="flex-1 overflow-y-auto rounded pr-2">
                <div className="space-y-5 px-3 py-2">
                  <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg transition-colors duration-200 hover:bg-white/10 border border-violet-500/20">
                    <span className="text-sm text-purple-200">
                      Total Substations:
                    </span>
                    <span className="text-lg font-semibold text-white">
                      {summaryStats.totalSubstations}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg transition-colors duration-200 hover:bg-white/10 border border-violet-500/20">
                    <span className="text-sm text-purple-200">Avg. Headroom:</span>
                    <span className="text-lg font-semibold text-white">
                      {summaryStats.avgHeadroom?.toFixed(2) || "N/A"} MW
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg transition-colors duration-200 hover:bg-white/10 border border-violet-500/20">
                    <span className="text-sm text-purple-200">
                      Green Sites (≥50MW):
                    </span>
                    <span className="text-lg font-semibold text-green-400">
                      {summaryStats.greenSites || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg transition-colors duration-200 hover:bg-white/10 border border-violet-500/20">
                    <span className="text-sm text-purple-200">
                      Amber Sites (20-50MW):
                    </span>
                    <span className="text-lg font-semibold text-yellow-400">
                      {summaryStats.amberSites || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg transition-colors duration-200 hover:bg-white/10 border border-violet-500/20">
                    <span className="text-sm text-purple-200">
                      Red Sites (&lt;20MW):
                    </span>
                    <span className="text-lg font-semibold text-red-400">
                      {summaryStats.redSites || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Helper function to safely get property values
  const getPropertyValue = (obj, ...keys) => {
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (
        obj[key] !== undefined &&
        obj[key] !== null &&
        obj[key] !== "\\N" &&
        obj[key] !== ""
      ) {
        return obj[key];
      }
    }
    return null;
  };

  // Get property values with fallbacks
  const siteName =
    getPropertyValue(selectedSite, "site_name", "siteName", "Site Name") ||
    "Unknown Site";
  const bulkSupplyPoint =
    getPropertyValue(
      selectedSite,
      "Bulk supply point",
      "bulk_supply_point",
      "bulkSupplyPoint"
    ) || "Not Available";
  const connectivityVoltage =
    getPropertyValue(
      selectedSite,
      "site_voltage",
      "siteVoltage",
      "Site Voltage"
    ) || "Not Available";
  const availablePower = getPropertyValue(
    selectedSite,
    "Generation Headroom Mw",
    "generation_headroom",
    "generationHeadroom"
  );
  const constraint = getPropertyValue(
    selectedSite,
    "Constraint description",
    "constraint_description",
    "constraintDescription"
  );
  const county =
    getPropertyValue(selectedSite, "county", "County") || "Not Available";
  const futureOutlook =
    getPropertyValue(selectedSite, "future_outlook", "futureOutlook") ||
    "No future outlook data available for this site.";

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">Site Details</h3>
        <button
          onClick={onClose}
          className="text-gray-300 hover:text-violet-400 transition-colors duration-200 text-2xl"
        >
          ×
        </button>
      </div>

      <div className="flex-1 flex flex-col space-y-4 overflow-y-auto">
        <div>
          <h4 className="font-medium text-gray-200 mb-3 text-lg">{siteName}</h4>
          <div className="space-y-3 px-3 py-2">
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg transition-colors duration-200 hover:bg-white/10 border border-violet-500/20">
              <span className="text-sm text-purple-200">Bulk Supply Point:</span>
              <span className="text-lg font-semibold text-white">{bulkSupplyPoint}</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg transition-colors duration-200 hover:bg-white/10 border border-violet-500/20">
              <span className="text-sm text-purple-200">Connectivity Voltage:</span>
              <span className="text-lg font-semibold text-white">{connectivityVoltage} kV</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg transition-colors duration-200 hover:bg-white/10 border border-violet-500/20">
              <span className="text-sm text-purple-200">Available Power:</span>
              <span className="text-lg font-semibold text-white">
                {availablePower !== null && availablePower !== undefined
                  ? `${availablePower} MW`
                  : "Not Available"}
              </span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg transition-colors duration-200 hover:bg-white/10 border border-violet-500/20">
              <span className="text-sm text-purple-200">Constraint:</span>
              <span className="text-lg font-semibold text-white">
                {constraint !== null && constraint !== undefined
                  ? constraint
                  : "None"}
              </span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg transition-colors duration-200 hover:bg-white/10 border border-violet-500/20">
              <span className="text-sm text-purple-200">County:</span>
              <span className="text-lg font-semibold text-white">{county}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-violet-500/20 pt-4">
          <h4 className="font-medium text-gray-300 mb-2">Future Outlook</h4>
          <p className="text-sm text-gray-400">{futureOutlook}</p>
        </div>
      </div>

      {summaryStats && (
        <div className="mt-6 pt-4 border-t border-violet-500/20">
          <h4 className="font-medium text-gray-300 mb-2">Summary Statistics</h4>
          <div className="max-h-60 overflow-y-auto rounded pr-2">
            <div className="space-y-5 px-3 py-2">
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg transition-colors duration-200 hover:bg-white/10 border border-violet-500/20">
                <span className="text-sm text-purple-200">
                  Total Substations:
                </span>
                <span className="text-lg font-semibold text-white">
                  {summaryStats.totalSubstations}
                </span>
              </div>
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg transition-colors duration-200 hover:bg-white/10 border border-violet-500/20">
                <span className="text-sm text-purple-200">Avg. Headroom:</span>
                <span className="text-lg font-semibold text-white">
                  {summaryStats.avgHeadroom?.toFixed(2) || "N/A"} MW
                </span>
              </div>
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg transition-colors duration-200 hover:bg-white/10 border border-violet-500/20">
                <span className="text-sm text-purple-200">
                  Green Sites (≥50MW):
                </span>
                <span className="text-lg font-semibold text-green-400">
                  {summaryStats.greenSites || 0}
                </span>
              </div>
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg transition-colors duration-200 hover:bg-white/10 border border-violet-500/20">
                <span className="text-sm text-purple-200">
                  Amber Sites (20-50MW):
                </span>
                <span className="text-lg font-semibold text-yellow-400">
                  {summaryStats.amberSites || 0}
                </span>
              </div>
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg transition-colors duration-200 hover:bg-white/10 border border-violet-500/20">
                <span className="text-sm text-purple-200">
                  Red Sites (&lt;20MW):
                </span>
                <span className="text-lg font-semibold text-red-400">
                  {summaryStats.redSites || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteDetailsPanel;