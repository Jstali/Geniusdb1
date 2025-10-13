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

  // Helper function to calculate risk level based on Generation Headroom
  const calculateRiskLevel = (headroom) => {
    if (headroom === null || headroom === undefined) return { label: "Unknown", color: "gray" };
    const value = parseFloat(headroom);
    if (isNaN(value)) return { label: "Unknown", color: "gray" };
    
    if (value >= 50) return { label: "Low (Green)", color: "green" };
    if (value >= 20) return { label: "Medium (Amber)", color: "amber" };
    return { label: "High (Red)", color: "red" };
  };

  // Get property values with fallbacks - ONLY required fields
  const siteName =
    getPropertyValue(selectedSite, "site_name", "siteName", "Site Name") ||
    "Unknown Site";
  
  const bsp =
    getPropertyValue(
      selectedSite,
      "Bulk supply point",
      "bulk_supply_point",
      "bulkSupplyPoint"
    ) || "Not Available";
  
  const gsp =
    getPropertyValue(
      selectedSite,
      "Grid supply point",
      "grid_supply_point",
      "gridSupplyPoint",
      "Associatedgsp",
      "associatedgsp"
    ) || "Not Available";
  
  const firmCapacity = getPropertyValue(
    selectedSite,
    "Firm Capacity",
    "Firm_Capacity",
    "firm_capacity",
    "firmCapacity"
  );
  
  const genCapacity = getPropertyValue(
    selectedSite,
    "Generation Capacity",
    "Generation_Capacity",
    "generation_capacity",
    "generationCapacity"
  );
  
  const spareCapacity = getPropertyValue(
    selectedSite,
    "Spare Summer",
    "Spare_Summer",
    "spare_summer",
    "spareCapacity"
  );
  
  const generationHeadroom = getPropertyValue(
    selectedSite,
    "Generation Headroom Mw",
    "generation_headroom",
    "generationHeadroom"
  );
  
  const riskLevel = calculateRiskLevel(generationHeadroom);

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
        {/* Site Name as Heading */}
        <div>
          <h4 className="text-xl font-semibold text-gray-800 mb-4">{siteName}</h4>
          
          <div className="space-y-2 text-sm">
            {/* Risk Level */}
            <div className="flex justify-between bg-gray-50 p-3 rounded-lg transition-colors duration-200 hover:bg-gray-100">
              <span className="text-gray-600 font-medium">Risk Level:</span>
              <span className={`font-semibold ${
                riskLevel.color === "green" ? "text-green-600" :
                riskLevel.color === "amber" ? "text-amber-600" :
                riskLevel.color === "red" ? "text-red-600" :
                "text-gray-600"
              }`}>
                {riskLevel.label}
              </span>
            </div>

            {/* BSP (Bulk Supply Point) */}
            <div className="flex justify-between bg-gray-50 p-3 rounded-lg transition-colors duration-200 hover:bg-gray-100">
              <span className="text-gray-600 font-medium">Bulk Supply Point:</span>
              <span className="font-medium text-gray-800">{bsp}</span>
            </div>

            {/* GSP (Grid Supply Point) */}
            <div className="flex justify-between bg-gray-50 p-3 rounded-lg transition-colors duration-200 hover:bg-gray-100">
              <span className="text-gray-600 font-medium">Grid Supply Point:</span>
              <span className="font-medium text-gray-800">{gsp}</span>
            </div>

            {/* Firm Capacity */}
            <div className="flex justify-between bg-gray-50 p-3 rounded-lg transition-colors duration-200 hover:bg-gray-100">
              <span className="text-gray-600 font-medium">Firm Capacity:</span>
              <span className="font-medium text-gray-800">
                {firmCapacity !== null && firmCapacity !== undefined
                  ? `${parseFloat(firmCapacity).toFixed(2)} MW`
                  : "Not Available"}
              </span>
            </div>

            {/* Gen Capacity (Generation Capacity) */}
            <div className="flex justify-between bg-gray-50 p-3 rounded-lg transition-colors duration-200 hover:bg-gray-100">
              <span className="text-gray-600 font-medium">Generative Capacity:</span>
              <span className="font-medium text-gray-800">
                {genCapacity !== null && genCapacity !== undefined
                  ? `${parseFloat(genCapacity).toFixed(2)} MW`
                  : "Not Available"}
              </span>
            </div>

            {/* Spare Capacity */}
            <div className="flex justify-between bg-gray-50 p-3 rounded-lg transition-colors duration-200 hover:bg-gray-100">
              <span className="text-gray-600 font-medium">Spare Capacity:</span>
              <span className="font-medium text-gray-800">
                {spareCapacity !== null && spareCapacity !== undefined
                  ? `${parseFloat(spareCapacity).toFixed(2)} MW`
                  : "Not Available"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteDetailsPanel;
