import React from "react";

const SiteDetailsPanel = ({ selectedSite, summaryStats, onClose }) => {
  if (!selectedSite) {
    return (
      <div
        className="site-details-container p-4 w-80 md:w-80 transition-all duration-300 hover:shadow-xl"
        style={{
          backgroundColor: "white",
          boxShadow: "0 4px 12px rgba(3, 3, 4, 0.08)",
          borderRadius: "12px",
          border: "1px solid rgba(3, 3, 4, 0.1)",
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <h3
            className="text-lg font-semibold"
            style={{ color: "#030304", fontWeight: "bold" }}
          >
            Site Details
          </h3>
          <button
            onClick={onClose}
            className="transition-all duration-300 transform hover:scale-110"
            style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#AD96DC" }}
            onMouseEnter={(e) => (e.target.style.color = "#FF6B6B")}
            onMouseLeave={(e) => (e.target.style.color = "#AD96DC")}
          >
            ×
          </button>
        </div>

        <div className="text-center py-8">
          <p style={{ color: "rgba(3, 3, 4, 0.7)" }}>
            Select a site on the map to see details
          </p>
        </div>

        {summaryStats && (
          <div className="mt-6">
            <h4
              className="font-medium mb-2"
              style={{ color: "#030304", fontWeight: "bold" }}
            >
              Summary Statistics
            </h4>
            <div
              className="max-h-60 overflow-y-auto rounded pr-2"
              style={{
                backgroundColor: "#F6F2F4",
                boxShadow: "0 1px 3px rgba(3, 3, 4, 0.1)",
              }}
            >
              <div className="space-y-2">
                <div
                  className="flex justify-between p-2 rounded transition-all duration-300 hover:shadow-md"
                  style={{ backgroundColor: "white" }}
                >
                  <span
                    className="text-sm"
                    style={{ color: "rgba(3, 3, 4, 0.7)" }}
                  >
                    Total Substations:
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: "#412234" }}
                  >
                    {summaryStats.totalSubstations}
                  </span>
                </div>
                <div
                  className="flex justify-between p-2 rounded transition-all duration-300 hover:shadow-md"
                  style={{ backgroundColor: "white" }}
                >
                  <span
                    className="text-sm"
                    style={{ color: "rgba(3, 3, 4, 0.7)" }}
                  >
                    Avg. Headroom:
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: "#412234" }}
                  >
                    {summaryStats.avgHeadroom?.toFixed(2) || "N/A"} MW
                  </span>
                </div>
                <div
                  className="flex justify-between p-2 rounded transition-all duration-300 hover:shadow-md"
                  style={{ backgroundColor: "#8DE971", color: "#030304" }}
                >
                  <span className="text-sm font-medium">Green Sites (≥50MW):</span>
                  <span className="text-sm font-medium">
                    {summaryStats.greenSites || 0}
                  </span>
                </div>
                <div
                  className="flex justify-between p-2 rounded transition-all duration-300 hover:shadow-md"
                  style={{ backgroundColor: "#FFD93D", color: "#030304" }}
                >
                  <span className="text-sm">Amber Sites (20-50MW):</span>
                  <span className="text-sm font-medium">
                    {summaryStats.amberSites || 0}
                  </span>
                </div>
                <div
                  className="flex justify-between p-2 rounded transition-all duration-300 hover:shadow-md"
                  style={{ backgroundColor: "#FF6B6B", color: "white" }}
                >
                  <span className="text-sm">Red Sites (&lt;20MW):</span>
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
    if (headroom === null || headroom === undefined)
      return { label: "Unknown", color: "black" };
    const value = parseFloat(headroom);
    if (isNaN(value)) return { label: "Unknown", color: "black" };

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
    <div
      className="site-details-container p-4 w-80 md:w-80 max-h-screen overflow-y-auto transition-all duration-300 hover:shadow-xl"
      style={{
        backgroundColor: "white",
        boxShadow: "0 4px 12px rgba(3, 3, 4, 0.08)",
        borderRadius: "12px",
        border: "1px solid rgba(3, 3, 4, 0.1)",
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <h3
          className="text-lg font-semibold"
          style={{ color: "#030304", fontWeight: "bold" }}
        >
          Site Details
        </h3>
        <button
          onClick={onClose}
          className="transition-all duration-300 transform hover:scale-110"
          style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#AD96DC" }}
          onMouseEnter={(e) => (e.target.style.color = "#FF6B6B")}
          onMouseLeave={(e) => (e.target.style.color = "#AD96DC")}
        >
          ×
        </button>
      </div>

      <div className="space-y-4">
        {/* Site Name as Heading */}
        <div>
          <h4
            className="text-xl font-semibold mb-4"
            style={{ color: "#030304", fontWeight: "bold" }}
          >
            {siteName}
          </h4>

          <div className="space-y-2 text-sm">
            {/* Risk Level */}
            <div
              className="flex justify-between p-3 rounded-lg transition-all duration-300 hover:shadow-md"
              style={{ backgroundColor: "white" }}
            >
              <span
                className="font-medium"
                style={{ color: "rgba(3, 3, 4, 0.7)" }}
              >
                Risk Level:
              </span>
              <span
                className={`font-semibold ${
                  riskLevel.color === "green"
                  ? "text-green-600"
                  : riskLevel.color === "amber"
                  ? "text-amber-600"
                  : riskLevel.color === "red"
                  ? "text-red-600"
                  : "text-green-600"
                  
                }`}
              >
                {riskLevel.label}
              </span>
            </div>

            {/* BSP (Bulk Supply Point) */}
            <div
              className="flex justify-between p-3 rounded-lg transition-all duration-300 hover:shadow-md"
              style={{ backgroundColor: "white" }}
            >
              <span
                className="font-medium"
                style={{ color: "rgba(3, 3, 4, 0.7)" }}
              >
                Bulk Supply Point:
              </span>
              <span className="font-medium" style={{ color: "#412234" }}>
                {bsp}
              </span>
            </div>

            {/* GSP (Grid Supply Point) */}
            <div
              className="flex justify-between p-3 rounded-lg transition-all duration-300 hover:shadow-md"
              style={{ backgroundColor: "white" }}
            >
              <span
                className="font-medium"
                style={{ color: "rgba(3, 3, 4, 0.7)" }}
              >
                Grid Supply Point:
              </span>
              <span className="font-medium" style={{ color: "#412234" }}>
                {gsp}
              </span>
            </div>

            {/* Firm Capacity */}
            <div
              className="flex justify-between p-3 rounded-lg transition-all duration-300 hover:shadow-md"
              style={{ backgroundColor: "white" }}
            >
              <span
                className="font-medium"
                style={{ color: "rgba(3, 3, 4, 0.7)" }}
              >
                Firm Capacity:
              </span>
              <span className="font-medium" style={{ color: "#412234" }}>
                {firmCapacity !== null && firmCapacity !== undefined
                  ? `${parseFloat(firmCapacity).toFixed(2)} MW`
                  : "Not Available"}
              </span>
            </div>

            {/* Gen Capacity (Generation Capacity) */}
            <div
              className="flex justify-between p-3 rounded-lg transition-all duration-300 hover:shadow-md"
              style={{ backgroundColor: "white" }}
            >
              <span
                className="font-medium"
                style={{ color: "rgba(3, 3, 4, 0.7)" }}
              >
                Generation Capacity:
              </span>
              <span className="font-medium" style={{ color: "#412234" }}>
                {genCapacity !== null && genCapacity !== undefined
                  ? `${parseFloat(genCapacity).toFixed(2)} MW`
                  : "Not Available"}
              </span>
            </div>

            {/* Spare Capacity */}
            <div
              className="flex justify-between p-3 rounded-lg transition-all duration-300 hover:shadow-md"
              style={{ backgroundColor: "white" }}
            >
              <span
                className="font-medium"
                style={{ color: "rgba(3, 3, 4, 0.7)" }}
              >
                Spare Capacity:
              </span>
              <span className="font-medium" style={{ color: "#412234" }}>
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
