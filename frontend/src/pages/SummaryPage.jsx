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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
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
        className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative"
        role="alert"
      >
        <strong className="font-bold">No data! </strong>
        <span className="block sm:inline">No summary data available.</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">System Summary</h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Total Sites
          </h3>
          <p className="text-3xl font-bold text-blue-600">
            {summaryData.totalSites}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Avg. Headroom
          </h3>
          <p className="text-3xl font-bold text-green-600">
            {summaryData.avgHeadroom} MW
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Total Headroom
          </h3>
          <p className="text-3xl font-bold text-indigo-600">
            {summaryData.totalHeadroom} MW
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Voltage Levels
          </h3>
          <p className="text-3xl font-bold text-purple-600">
            {summaryData.totalVoltages}
          </p>
        </div>
      </div>

      {/* Headroom Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Green Sites (≥50MW)
          </h3>
          <p className="text-3xl font-bold text-green-600">
            {summaryData.greenSites}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {((summaryData.greenSites / summaryData.totalSites) * 100).toFixed(1)}% of total
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Amber Sites (20-49MW)
          </h3>
          <p className="text-3xl font-bold text-yellow-600">
            {summaryData.amberSites}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {((summaryData.amberSites / summaryData.totalSites) * 100).toFixed(1)}% of total
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Red Sites (&lt;20MW)
          </h3>
          <p className="text-3xl font-bold text-red-600">
            {summaryData.redSites}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {((summaryData.redSites / summaryData.totalSites) * 100).toFixed(1)}% of total
          </p>
        </div>
      </div>

      {/* Voltage Distribution */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Voltage Distribution
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(summaryData.voltageDistribution)
            .sort((a, b) => b[1] - a[1])
            .map(([voltage, count]) => (
              <div
                key={voltage}
                className="border border-gray-200 rounded-lg p-4 text-center"
              >
                <p className="text-lg font-semibold">{voltage} kV</p>
                <p className="text-2xl font-bold text-blue-600">{count}</p>
              </div>
            ))}
        </div>
      </div>

      {/* Site Types */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Site Type Distribution
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(summaryData.siteTypeDistribution)
            .sort((a, b) => b[1] - a[1])
            .map(([siteType, count]) => (
              <div
                key={siteType}
                className="flex justify-between items-center border border-gray-200 rounded-lg p-4"
              >
                <span className="text-gray-700">{siteType}</span>
                <span className="text-xl font-bold text-green-600">
                  {count}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Top Counties */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Top 10 Counties by Site Count
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  County
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Site Count
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {summaryData.topCounties.map((item, index) => (
                <tr key={item.county}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.county}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {item.count}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Operators */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Top 5 Network Operators by Site Count
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Operator
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Site Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Percentage
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {summaryData.topOperators.map((item, index) => (
                <tr key={item.operator}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.operator}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {item.count}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {((item.count / summaryData.totalSites) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SummaryPage;
