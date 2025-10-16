import React, { useState, useEffect } from "react";

const API_BASE = (window._env_ && window._env_.API_BASE) || "";

const SummaryPage = () => {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data sources used in the application
  const dataSources = [
    { name: "UKPN Grid and Primary Sites" },
    { name: "UKPN LTDS Infrastructure Projects" },
    { name: "UKPN Grid Supply Points Overview" },
  ];

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

        // Calculate summary statistics - ONLY what we need
        const totalSites = jsonData.length;

        // Calculate total generation capacity from Generation_Capacity field
        const generationCapacityValues = jsonData
          .map((site) => site["Generation Capacity"] || site["Generation_Capacity"])
          .filter((val) => val !== null && val !== undefined && !isNaN(val));

        const totalGenerationCapacity =
          generationCapacityValues.length > 0
            ? generationCapacityValues.reduce((sum, val) => sum + parseFloat(val), 0)
            : 0;

        // Prepare the simplified summary data
        const data = {
          totalSites,
          totalGenerationCapacity: totalGenerationCapacity.toFixed(2),
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
      <div className="min-h-screen flex justify-center items-center" style={{backgroundColor: '#F6F2F4'}}>
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex justify-center items-center p-8" style={{backgroundColor: '#F6F2F4'}}>
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg max-w-md">
          <strong className="font-bold">Error! </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  if (!summaryData) {
    return (
      <div className="min-h-screen flex justify-center items-center p-8" style={{backgroundColor: '#F6F2F4'}}>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-6 py-4 rounded-lg max-w-md">
          <strong className="font-bold">No data! </strong>
          <span className="block sm:inline">No summary data available.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10" style={{backgroundColor: '#F6F2F4'}}>
      {/* Page Title */}
      <h1 className="text-center text-2xl font-bold text-indigo-600 py-8">
        Summary Overview
      </h1>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 px-8">
        {/* Total Sites Card */}
        <div className="bg-white shadow-md rounded-xl p-6 hover:scale-105 transition transform duration-200">
          <p className="text-gray-500 uppercase text-sm">Total Sites</p>
          <h2 className="text-3xl font-semibold text-indigo-600 mt-2">
            {summaryData.totalSites}
          </h2>
        </div>

        {/* Total Generation Capacity Card */}
        <div className="bg-white shadow-md rounded-xl p-6 hover:scale-105 transition transform duration-200">
          <p className="text-gray-500 uppercase text-sm">Total Generation Capacity (MW)</p>
          <h2 className="text-3xl font-semibold text-indigo-600 mt-2">
            {summaryData.totalGenerationCapacity}
          </h2>
        </div>
      </div>

      {/* Data Sources Section */}
      <div className="px-8 mt-10">
        <h3 className="text-lg font-semibold text-gray-700">Data Sources</h3>
        <div className="flex flex-col gap-2 mt-4">
          {dataSources.map((source, index) => (
            <div
              key={index}
              className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-700"
            >
              {source.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SummaryPage;
