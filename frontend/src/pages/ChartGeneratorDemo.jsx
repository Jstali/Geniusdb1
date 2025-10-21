import React, { useState, useEffect } from "react";
import DynamicChartGenerator from "../components/DynamicChartGenerator";

const API_BASE = (window._env_ && window._env_.API_BASE) || "";

const ChartGeneratorDemo = ({ selectedColumns = [], filters = {}, chartConfig = null, generatedChart = null, setGeneratedChart = null }) => {
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data from your API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const processResponse = await fetch(`${API_BASE}/process/transformers`);
        if (!processResponse.ok) {
          throw new Error(`HTTP error while processing data! status: ${processResponse.status}`);
        }
        const processResult = await processResponse.json();
        if (processResult.status === "error") {
          throw new Error(processResult.message);
        }

        const response = await fetch(`${API_BASE}/data/transformers`);
        if (!response.ok) {
          throw new Error(`HTTP error while fetching data! status: ${response.status}`);
        }
        const jsonData = await response.json();

        setTableData(jsonData);
      } catch (err) {
        setError("Error fetching data: " + err.message);
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chart data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DynamicChartGenerator 
        tableData={tableData}
        selectedColumns={selectedColumns}
        filters={filters}
        chartConfig={chartConfig}
        generatedChart={generatedChart}
        setGeneratedChart={setGeneratedChart}
        onLoadView={(view) => {
          console.log('Chart view loaded:', view);
          // You can add additional logic here if needed
        }}
      />
    </div>
  );
};

export default ChartGeneratorDemo;
