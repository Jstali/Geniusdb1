import React, { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const SummaryPage = () => {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSummaryData = async () => {
      try {
        setLoading(true);
        console.log("SummaryPage: Fetching summary data...");

        // Fetch the transformer data from the backend API
        const response = await fetch(`${API_BASE}/data/transformers`);
        if (!response.ok) {
          throw new Error(
            `HTTP error while fetching data! status: ${response.status}`
          );
        }
        const jsonData = await response.json();
        console.log("Fetched transformer data:", jsonData.length, "records");
        console.log("Sample data:", jsonData.slice(0, 3));

        // Calculate summary statistics
        const totalSites = jsonData.length;

        // Calculate voltage distribution
        const voltageDistribution = {};
        jsonData.forEach((site) => {
          const voltage = site["Site Voltage"];
          if (voltage) {
            voltageDistribution[voltage] =
              (voltageDistribution[voltage] || 0) + 1;
          }
        });

        // Calculate generation headroom statistics
        const headroomValues = jsonData
          .map((site) => site["Generation Headroom Mw"])
          .filter((val) => val !== null && val !== undefined && !isNaN(val));

        const avgHeadroom =
          headroomValues.length > 0
            ? headroomValues.reduce((sum, val) => sum + val, 0) /
              headroomValues.length
            : 0;

        const maxHeadroom =
          headroomValues.length > 0 ? Math.max(...headroomValues) : 0;

        const minHeadroom =
          headroomValues.length > 0 ? Math.min(...headroomValues) : 0;

        // Calculate headroom categories
        const greenSites = headroomValues.filter(val => val >= 50).length;
        const amberSites = headroomValues.filter(val => val >= 20 && val < 50).length;
        const redSites = headroomValues.filter(val => val < 20).length;

        // Calculate site type distribution
        const siteTypeDistribution = {};
        jsonData.forEach((site) => {
          const siteType = site["Site Type"];
          if (siteType) {
            siteTypeDistribution[siteType] =
              (siteTypeDistribution[siteType] || 0) + 1;
          }
        });

        // Calculate county distribution (top 10)
        const countyDistribution = {};
        jsonData.forEach((site) => {
          const county = site["County"];
          if (county && county !== "\\N") {
            countyDistribution[county] = (countyDistribution[county] || 0) + 1;
          }
        });

        // Get top 10 counties
        const topCounties = Object.entries(countyDistribution)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([county, count]) => ({ county, count }));

        // Calculate operator distribution
        const operatorDistribution = {};
        jsonData.forEach((site) => {
          const operator = site["Licence Area"];
          if (operator && operator !== "\\N") {
            operatorDistribution[operator] = (operatorDistribution[operator] || 0) + 1;
          }
        });

        // Get top 5 operators
        const topOperators = Object.entries(operatorDistribution)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([operator, count]) => ({ operator, count }));

        // Calculate total generation headroom
        const totalHeadroom = headroomValues.reduce((sum, val) => sum + val, 0);

        // Prepare the summary data
        const data = {
          totalSites,
          voltageDistribution,
          avgHeadroom: avgHeadroom.toFixed(2),
          maxHeadroom: maxHeadroom.toFixed(2),
          minHeadroom: minHeadroom.toFixed(2),
          totalHeadroom: totalHeadroom.toFixed(2),
          greenSites,
          amberSites,
          redSites,
          siteTypeDistribution,
          topCounties,
          topOperators,
          operatorDistribution,
          totalVoltages: Object.keys(voltageDistribution).length,
          totalSiteTypes: Object.keys(siteTypeDistribution).length,
          totalCounties: Object.keys(countyDistribution).length,
          totalOperators: Object.keys(operatorDistribution).length,
        };

        setSummaryData(data);
      } catch (err) {
        console.error("Error fetching summary data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSummaryData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="glass-card bg-red-500/10 border-red-500/30 text-red-300 px-4 py-3 rounded-xl"
        role="alert"
      >
        <strong className="font-bold">Error! </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  if (!summaryData) {
    return (
      <div
        className="glass-card bg-yellow-500/10 border-yellow-500/30 text-yellow-300 px-4 py-3 rounded-xl"
        role="alert"
      >
        <strong className="font-bold">No data! </strong>
        <span className="block sm:inline">No summary data available.</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 space-y-12">
      {/* Header Section */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent mb-4">
          System Summary
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          Comprehensive overview of power system infrastructure and performance metrics
        </p>
      </div>

      {/* Key Metrics Section */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">Key Performance Indicators</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="glass-card p-8 hover:scale-105 transition-all duration-300 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-300 mb-3">Total Sites</h3>
              <p className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {summaryData.totalSites}
              </p>
            </div>
          </div>

          <div className="glass-card p-8 hover:scale-105 transition-all duration-300 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-300 mb-3">Avg. Headroom</h3>
              <p className="text-5xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                {summaryData.avgHeadroom} MW
              </p>
            </div>
          </div>

          <div className="glass-card p-8 hover:scale-105 transition-all duration-300 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-300 mb-3">Total Headroom</h3>
              <p className="text-5xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                {summaryData.totalHeadroom} MW
              </p>
            </div>
          </div>

          <div className="glass-card p-8 hover:scale-105 transition-all duration-300 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2M9 8h6m-6 4h6m-6 4h6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-300 mb-3">Voltage Levels</h3>
              <p className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {summaryData.totalVoltages}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Site Status Overview */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">Site Status Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-card p-8 border-l-4 border-green-500 hover:scale-105 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-300">Green Sites (≥50MW)</h3>
            </div>
            <p className="text-5xl font-bold text-green-400 mb-2">
              {summaryData.greenSites}
            </p>
            <p className="text-lg text-gray-400">
              {((summaryData.greenSites / summaryData.totalSites) * 100).toFixed(1)}% of total
            </p>
          </div>

          <div className="glass-card p-8 border-l-4 border-yellow-500 hover:scale-105 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-300">Amber Sites (20-49MW)</h3>
            </div>
            <p className="text-5xl font-bold text-yellow-400 mb-2">
              {summaryData.amberSites}
            </p>
            <p className="text-lg text-gray-400">
              {((summaryData.amberSites / summaryData.totalSites) * 100).toFixed(1)}% of total
            </p>
          </div>

          <div className="glass-card p-8 border-l-4 border-red-500 hover:scale-105 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-300">Red Sites (&lt;20MW)</h3>
            </div>
            <p className="text-5xl font-bold text-red-400 mb-2">
              {summaryData.redSites}
            </p>
            <p className="text-lg text-gray-400">
              {((summaryData.redSites / summaryData.totalSites) * 100).toFixed(1)}% of total
            </p>
          </div>
        </div>
      </section>

      {/* Distribution Analysis */}
      <section className="mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Voltage Distribution */}
          <div className="glass-card p-8">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">Voltage Distribution</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(summaryData.voltageDistribution)
                .sort((a, b) => b[1] - a[1])
                .map(([voltage, count]) => (
                  <div
                    key={voltage}
                    className="bg-white/5 backdrop-blur-sm border border-violet-500/20 rounded-lg p-6 text-center hover:bg-white/10 hover:shadow-glow-sm transition-all duration-300 hover:scale-105"
                  >
                    <p className="text-lg font-semibold text-gray-300 mb-2">{voltage} kV</p>
                    <p className="text-3xl font-bold text-blue-400">{count}</p>
                  </div>
                ))}
            </div>
          </div>

          {/* Site Type Distribution */}
          <div className="glass-card p-8">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">Site Type Distribution</h2>
            </div>
            <div className="space-y-4">
              {Object.entries(summaryData.siteTypeDistribution)
                .sort((a, b) => b[1] - a[1])
                .map(([siteType, count]) => (
                  <div
                    key={siteType}
                    className="flex justify-between items-center bg-white/5 backdrop-blur-sm border border-violet-500/20 rounded-lg p-4 hover:bg-white/10 hover:shadow-glow-sm transition-all duration-300"
                  >
                    <span className="text-lg font-medium text-gray-300">{siteType}</span>
                    <span className="text-2xl font-bold text-green-400">
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Analytics */}
      <section className="mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Top Counties */}
          <div className="glass-card p-8">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">Top 10 Counties</h2>
            </div>
            <div className="space-y-3">
              {summaryData.topCounties.map((item, index) => (
                <div key={item.county} className="flex justify-between items-center bg-white/5 backdrop-blur-sm border border-violet-500/20 rounded-lg p-4 hover:bg-white/10 transition-all duration-300">
                  <div className="flex items-center">
                    <span className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center mr-3 text-sm font-bold text-blue-400">
                      {index + 1}
                    </span>
                    <span className="text-lg font-medium text-gray-200">{item.county}</span>
                  </div>
                  <span className="px-3 py-1 inline-flex text-sm font-semibold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Operators */}
          <div className="glass-card p-8">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">Top 5 Network Operators</h2>
            </div>
            <div className="space-y-4">
              {summaryData.topOperators.map((item, index) => (
                <div key={item.operator} className="bg-white/5 backdrop-blur-sm border border-violet-500/20 rounded-lg p-4 hover:bg-white/10 transition-all duration-300">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center">
                      <span className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center mr-3 text-sm font-bold text-green-400">
                        {index + 1}
                      </span>
                      <span className="text-lg font-medium text-gray-200">{item.operator}</span>
                    </div>
                    <span className="text-2xl font-bold text-green-400">{item.count}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Percentage of total</span>
                    <span className="text-lg font-semibold text-gray-300">
                      {((item.count / summaryData.totalSites) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SummaryPage;
