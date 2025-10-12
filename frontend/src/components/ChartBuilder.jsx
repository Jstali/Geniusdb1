import React, { useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";

const ChartBuilder = ({ data = [] }) => {
  const [chartType, setChartType] = useState("bar");
  const [xAxis, setXAxis] = useState("");
  const [yAxis, setYAxis] = useState("");
  const [generatedChart, setGeneratedChart] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Get available columns from data
  const availableColumns = data.length > 0 ? Object.keys(data[0]) : [];

  // Predefined charts data
  const predefinedCharts = [
    {
      title: "Top 10 Sites by Generation Capacity",
      type: "bar",
      data: generateTopSitesData(data, "Generation Headroom Mw", 10),
    },
    {
      title: "Top 10 Sites by Total ECR Capacity",
      type: "bar",
      data: generateTopSitesData(data, "Total ECR Capacity", 10),
    },
    {
      title: "Risk Level Distribution",
      type: "pie",
      data: generateRiskDistributionData(data),
    },
    {
      title: "Site Type Distribution",
      type: "pie",
      data: generateSiteTypeDistributionData(data),
    },
  ];

  // Helper function to generate top sites data
  function generateTopSitesData(data, field, limit) {
    if (!data || data.length === 0) return { categories: [], values: [] };

    const sortedData = data
      .filter((item) => item[field] && !isNaN(parseFloat(item[field])))
      .sort((a, b) => parseFloat(b[field]) - parseFloat(a[field]))
      .slice(0, limit);

    return {
      categories: sortedData.map((item) => item["Site Name"] || "Unknown"),
      values: sortedData.map((item) => parseFloat(item[field]) || 0),
    };
  }

  // Helper function to generate risk distribution data
  function generateRiskDistributionData(data) {
    if (!data || data.length === 0) return [];

    const riskLevels = { High: 0, Medium: 0, Low: 0 };

    data.forEach((item) => {
      const headroom = parseFloat(item["Generation Headroom Mw"]);
      if (!isNaN(headroom)) {
        if (headroom < 20) riskLevels.High++;
        else if (headroom < 50) riskLevels.Medium++;
        else riskLevels.Low++;
      }
    });

    return Object.entries(riskLevels).map(([name, value]) => ({ name, value }));
  }

  // Helper function to generate site type distribution data
  function generateSiteTypeDistributionData(data) {
    if (!data || data.length === 0) return [];

    const typeCounts = {};
    data.forEach((item) => {
      const type = item["Site Type"] || "Unknown";
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    return Object.entries(typeCounts).map(([name, value]) => ({ name, value }));
  }

  // Generate chart based on user selection
  const generateChart = () => {
    if (!xAxis || !yAxis) {
      alert("Please select both X and Y axes");
      return;
    }

    setIsLoading(true);

    // Simulate API call delay
    setTimeout(() => {
      const chartData = generateChartData(data, xAxis, yAxis, chartType);
      setGeneratedChart(chartData);
      setIsLoading(false);
    }, 1000);
  };

  // Helper function to generate chart data
  function generateChartData(data, xField, yField, type) {
    if (!data || data.length === 0) return null;

    const processedData = data
      .filter((item) => item[xField] && item[yField])
      .map((item) => ({
        x: item[xField],
        y: parseFloat(item[yField]) || 0,
      }));

    if (type === "bar" || type === "line") {
      const categories = [...new Set(processedData.map((item) => item.x))];
      const values = categories.map((cat) => {
        const items = processedData.filter((item) => item.x === cat);
        return items.reduce((sum, item) => sum + item.y, 0) / items.length;
      });

      return {
        type,
        categories,
        values,
        xAxis: xField,
        yAxis: yField,
      };
    } else if (type === "pie") {
      const grouped = {};
      processedData.forEach((item) => {
        const key = item.x;
        grouped[key] = (grouped[key] || 0) + item.y;
      });

      return {
        type,
        data: Object.entries(grouped).map(([name, value]) => ({ name, value })),
        xAxis: xField,
        yAxis: yField,
      };
    }

    return null;
  }

  // Get chart options for ECharts
  const getChartOptions = (chartData) => {
    if (!chartData) return {};

    if (chartData.type === "bar" || chartData.type === "line") {
      return {
        title: {
          text: `${chartData.yAxis} by ${chartData.xAxis}`,
          left: "center",
        },
        tooltip: {
          trigger: "axis",
        },
        xAxis: {
          type: "category",
          data: chartData.categories,
          axisLabel: {
            rotate: 45,
          },
        },
        yAxis: {
          type: "value",
          name: chartData.yAxis,
        },
        series: [
          {
            data: chartData.values,
            type: chartData.type,
            itemStyle: {
              color: "#3B82F6",
            },
          },
        ],
      };
    } else if (chartData.type === "pie") {
      return {
        title: {
          text: `${chartData.yAxis} by ${chartData.xAxis}`,
          left: "center",
        },
        tooltip: {
          trigger: "item",
        },
        series: [
          {
            type: "pie",
            data: chartData.data,
            radius: "50%",
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: "rgba(0, 0, 0, 0.5)",
              },
            },
          },
        ],
      };
    }

    return {};
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Custom Chart Builder
        </h1>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          Refresh Data
        </button>
      </div>

      {/* Predefined Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {predefinedCharts.map((chart, index) => (
          <div key={index} className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {chart.title}
            </h3>
            <div className="h-64">
              <ReactECharts
                option={getChartOptions(chart)}
                style={{ height: "100%", width: "100%" }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Chart Builder Form */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Build Your Own Chart
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chart Type
            </label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="pie">Pie Chart</option>
              <option value="scatter">Scatter Plot</option>
              <option value="histogram">Histogram</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              X Axis
            </label>
            <select
              value={xAxis}
              onChange={(e) => setXAxis(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="" className="text-gray-600">Select X Axis</option>
              {availableColumns.map((col) => (
                <option key={col} value={col} className="text-gray-900">
                  {col}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Y Axis
            </label>
            <select
              value={yAxis}
              onChange={(e) => setYAxis(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="" className="text-gray-600">Select Y Axis</option>
              {availableColumns.map((col) => (
                <option key={col} value={col} className="text-gray-900">
                  {col}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={generateChart}
          disabled={isLoading || !xAxis || !yAxis}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {isLoading ? "Generating..." : "Generate Chart"}
        </button>

        {/* Generated Chart Display */}
        {generatedChart && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Generated Chart
            </h3>
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="h-96">
                <ReactECharts
                  option={getChartOptions(generatedChart)}
                  style={{ height: "100%", width: "100%" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChartBuilder;
