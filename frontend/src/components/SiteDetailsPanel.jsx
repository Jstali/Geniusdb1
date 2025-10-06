import React from "react";

const SiteDetailsPanel = ({ selectedSite, summaryStats, onClose }) => {
  if (!selectedSite) {
    return (
      <div className="site-details-container bg-white p-4 w-80 md:w-80">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Site Details</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
          >
            ×
          </button>
        </div>

        <div className="text-center py-8">
          <p className="text-gray-500">
            Select a site on the map to see details
          </p>
        </div>

        {summaryStats && (
          <div className="mt-6">
            <h4 className="font-medium text-gray-700 mb-2">
              Summary Statistics
            </h4>
            <div className="max-h-60 overflow-y-auto bg-white rounded pr-2">
              <div className="space-y-2">
                <div className="flex justify-between bg-gray-50 p-2 rounded transition-colors duration-200 hover:bg-gray-100">
                  <span className="text-sm text-gray-600">
                    Total Substations:
                  </span>
                  <span className="text-sm font-medium">
                    {summaryStats.totalSubstations}
                  </span>
                </div>
                <div className="flex justify-between bg-gray-50 p-2 rounded transition-colors duration-200 hover:bg-gray-100">
                  <span className="text-sm text-gray-600">Avg. Headroom:</span>
                  <span className="text-sm font-medium">
                    {summaryStats.avgHeadroom?.toFixed(2) || "N/A"} MW
                  </span>
                </div>
                <div className="flex justify-between bg-gray-50 p-2 rounded transition-colors duration-200 hover:bg-gray-100">
                  <span className="text-sm text-gray-600">
                    Green Sites (≥50MW):
                  </span>
                  <span className="text-sm font-medium">
                    {summaryStats.greenSites || 0}
                  </span>
                </div>
                <div className="flex justify-between bg-gray-50 p-2 rounded transition-colors duration-200 hover:bg-gray-100">
                  <span className="text-sm text-gray-600">
                    Amber Sites (20-50MW):
                  </span>
                  <span className="text-sm font-medium">
                    {summaryStats.amberSites || 0}
                  </span>
                </div>
                <div className="flex justify-between bg-gray-50 p-2 rounded transition-colors duration-200 hover:bg-gray-100">
                  <span className="text-sm text-gray-600">
                    Red Sites (&lt;20MW):
                  </span>
                  <span className="text-sm font-medium">
                    {summaryStats.redSites || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Helper function to safely get property values
  const getPropertyValue = (obj, ...keys) => {
    for (let key of keys) {
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
    <div className="site-details-container bg-white p-4 w-80 md:w-80 max-h-screen overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Site Details</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
        >
          ×
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">{siteName}</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between bg-gray-50 p-2 rounded transition-colors duration-200 hover:bg-gray-100">
              <span className="text-gray-600">Bulk Supply Point:</span>
              <span className="font-medium">{bulkSupplyPoint}</span>
            </div>
            <div className="flex justify-between bg-gray-50 p-2 rounded transition-colors duration-200 hover:bg-gray-100">
              <span className="text-gray-600">Connectivity Voltage:</span>
              <span className="font-medium">{connectivityVoltage} kV</span>
            </div>
            <div className="flex justify-between bg-gray-50 p-2 rounded transition-colors duration-200 hover:bg-gray-100">
              <span className="text-gray-600">Available Power:</span>
              <span className="font-medium">
                {availablePower !== null && availablePower !== undefined
                  ? `${availablePower} MW`
                  : "Not Available"}
              </span>
            </div>
            <div className="flex justify-between bg-gray-50 p-2 rounded transition-colors duration-200 hover:bg-gray-100">
              <span className="text-gray-600">Constraint:</span>
              <span className="font-medium">
                {constraint !== null && constraint !== undefined
                  ? constraint
                  : "None"}
              </span>
            </div>
            <div className="flex justify-between bg-gray-50 p-2 rounded transition-colors duration-200 hover:bg-gray-100">
              <span className="text-gray-600">County:</span>
              <span className="font-medium">{county}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h4 className="font-medium text-gray-700 mb-2">Future Outlook</h4>
          <p className="text-sm text-gray-600">{futureOutlook}</p>
        </div>
      </div>

      {summaryStats && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="font-medium text-gray-700 mb-2">Summary Statistics</h4>
          <div className="max-h-60 overflow-y-auto bg-white rounded pr-2">
            <div className="space-y-2">
              <div className="flex justify-between bg-gray-50 p-2 rounded transition-colors duration-200 hover:bg-gray-100">
                <span className="text-sm text-gray-600">
                  Total Substations:
                </span>
                <span className="text-sm font-medium">
                  {summaryStats.totalSubstations}
                </span>
              </div>
              <div className="flex justify-between bg-gray-50 p-2 rounded transition-colors duration-200 hover:bg-gray-100">
                <span className="text-sm text-gray-600">Avg. Headroom:</span>
                <span className="text-sm font-medium">
                  {summaryStats.avgHeadroom?.toFixed(2) || "N/A"} MW
                </span>
              </div>
              <div className="flex justify-between bg-gray-50 p-2 rounded transition-colors duration-200 hover:bg-gray-100">
                <span className="text-sm text-gray-600">
                  Green Sites (≥50MW):
                </span>
                <span className="text-sm font-medium">
                  {summaryStats.greenSites || 0}
                </span>
              </div>
              <div className="flex justify-between bg-gray-50 p-2 rounded transition-colors duration-200 hover:bg-gray-100">
                <span className="text-sm text-gray-600">
                  Amber Sites (20-50MW):
                </span>
                <span className="text-sm font-medium">
                  {summaryStats.amberSites || 0}
                </span>
              </div>
              <div className="flex justify-between bg-gray-50 p-2 rounded transition-colors duration-200 hover:bg-gray-100">
                <span className="text-sm text-gray-600">
                  Red Sites (&lt;20MW):
                </span>
                <span className="text-sm font-medium">
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
