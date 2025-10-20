import React, { useState, useEffect, useMemo } from "react";

const API_BASE = (window._env_ && window._env_.API_BASE) || "";

const Summary = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/data/transformers`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = await res.json();
        if (Array.isArray(json)) {
          setData(json);
        } else {
          setData([]);
          setError("Unexpected data format from backend");
        }
      } catch (err) {
        console.error("Error fetching transformer data:", err);
        setError("Failed to fetch site data. Please check backend.");
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const summaryStats = useMemo(() => {
    if (!data || data.length === 0) return null;

    const totalSubstations = data.length;
    const headroomValues = data
      .map((item) => item["Generation Headroom Mw"])
      .filter((v) => v !== null && v !== undefined && !isNaN(v));

    const avgHeadroom =
      headroomValues.length > 0
        ? headroomValues.reduce((s, v) => s + Number(v), 0) /
          headroomValues.length
        : null;

    const greenSites = data.filter(
      (it) => Number(it["Generation Headroom Mw"]) >= 50
    ).length;

    const amberSites = data.filter(
      (it) =>
        Number(it["Generation Headroom Mw"]) >= 20 &&
        Number(it["Generation Headroom Mw"]) < 50
    ).length;

    const redSites = data.filter(
      (it) => Number(it["Generation Headroom Mw"]) < 20
    ).length;

    // Voltage level distribution
    const voltageDistribution = data.reduce((acc, site) => {
      const voltage = site["Site Voltage"];
      if (voltage) {
        acc[voltage] = (acc[voltage] || 0) + 1;
      }
      return acc;
    }, {});

    // Operator distribution
    const operatorDistribution = data.reduce((acc, site) => {
      const operator = site["Licence Area"];
      if (operator) {
        acc[operator] = (acc[operator] || 0) + 1;
      }
      return acc;
    }, {});

    return {
      totalSubstations,
      avgHeadroom,
      greenSites,
      amberSites,
      redSites,
      voltageDistribution,
      operatorDistribution,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Error! </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Summary Dashboard
        </h1>

        {summaryStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Substations */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100">
                  <svg
                    className="h-6 w-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Substations
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {summaryStats.totalSubstations}
                  </p>
                </div>
              </div>
            </div>

            {/* Average Headroom */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-geniusAquamarine/20">
                  <svg
                    className="h-6 w-6 text-geniusAquamarine"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Avg. Headroom
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {summaryStats.avgHeadroom?.toFixed(2) || "N/A"} MW
                  </p>
                </div>
              </div>
            </div>

            {/* Green Sites */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-geniusAquamarine/20">
                  <div className="h-6 w-6 bg-geniusAquamarine rounded-full"></div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Green Sites (≥50MW)
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {summaryStats.greenSites}
                  </p>
                </div>
              </div>
            </div>

            {/* Amber Sites */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-orange-100">
                  <div className="h-6 w-6 bg-orange-500 rounded-full"></div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Amber Sites (20-50MW)
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {summaryStats.amberSites}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Voltage Level Distribution */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Voltage Level Distribution
            </h3>
            <div className="space-y-3">
              {Object.entries(summaryStats?.voltageDistribution || {}).map(
                ([voltage, count]) => (
                  <div
                    key={voltage}
                    className="flex justify-between items-center"
                  >
                    <span className="text-sm text-gray-600">{voltage} kV</span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Operator Distribution */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Network Operator Distribution
            </h3>
            <div className="space-y-3">
              {Object.entries(summaryStats?.operatorDistribution || {}).map(
                ([operator, count]) => (
                  <div
                    key={operator}
                    className="flex justify-between items-center"
                  >
                    <span className="text-sm text-gray-600">{operator}</span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Summary;
