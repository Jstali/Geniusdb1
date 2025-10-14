import React, { useState, useEffect } from "react";
import CustomChartBuilder from "../components/CustomChartBuilder";

const API_BASE = (window._env_ && window._env_.API_BASE) || "";

const Charts = () => {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
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

          // Generate columns from the data
          if (json.length > 0) {
            const keys = Object.keys(json[0]);
            const cols = keys.map((k) => ({
              accessorKey: k,
              header: String(k)
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase()),
            }));
            setColumns(cols);
          }
        } else {
          setData([]);
          setColumns([]);
          setError("Unexpected data format from backend");
        }
      } catch (err) {
        console.error("Error fetching transformer data:", err);
        setError("Failed to fetch site data. Please check backend.");
        setData([]);
        setColumns([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Charts</h1>
        <p className="text-gray-600">
          Build custom charts from your data. Select a chart type and configure
          the axes.
        </p>
      </div>
      <CustomChartBuilder data={data} columns={columns} />
    </div>
  );
};

export default Charts;
