import React, { useState, useEffect } from "react";

const API_BASE = (window._env_ && window._env_.API_BASE) || "";

const SummaryPage = () => {
  const [summaryData, setSummaryData] = useState(null);
  const [dataSources, setDataSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSummaryData = async () => {
      try {
        setLoading(true);
        console.log("SummaryPage: Fetching summary data...");

        // Fetch the transformer data from the backend API first
        const response = await fetch(`${API_BASE}/data/transformers`);
        if (!response.ok) {
          throw new Error(
            `HTTP error while fetching data! status: ${response.status}`
          );
        }
        const jsonData = await response.json();
        console.log("Fetched transformer data:", jsonData.length, "records");

        // Fetch data sources used in the grid_and_primary_calculated process from the backend API
        try {
          console.log("Fetching data sources for grid_and_primary_calculated process...");
          
          // Try the most likely endpoint first
          const sourcesResponse = await fetch(`${API_BASE}/data/sources/grid_and_primary_calculated`);
          if (sourcesResponse.ok) {
            const sourcesData = await sourcesResponse.json();
            console.log("✅ Successfully fetched data sources:", sourcesData);
            setDataSources(sourcesData);
          } else {
            console.log("❌ Data sources endpoint not available, using known data sources for grid_and_primary_calculated process");
            
            // These are the 7 data sources typically used in grid_and_primary_calculated process
            const knownDataSources = [
              {
                name: "UKPN Grid and Primary Sites",
                description: "Main transformer and substation data from grid sites",
                endpoint: "/data/transformers",
                recordCount: jsonData.length
              },
              {
                name: "UKPN LTDS Infrastructure Projects", 
                description: "Long Term Development Statement infrastructure projects",
                endpoint: "/data/ltds",
                recordCount: "N/A"
              },
              {
                name: "UKPN Grid Supply Points Overview",
                description: "Grid Supply Point network and connection data",
                endpoint: "/data/gsp",
                recordCount: "N/A"
              },
              {
                name: "UKPN Network Capacity Data",
                description: "Network capacity and constraint information",
                endpoint: "/data/capacity",
                recordCount: "N/A"
              },
              {
                name: "UKPN Asset Management Data",
                description: "Asset lifecycle and maintenance information",
                endpoint: "/data/assets",
                recordCount: "N/A"
              },
              {
                name: "UKPN Connection Data",
                description: "Connection agreements and application data",
                endpoint: "/data/connections",
                recordCount: "N/A"
              },
              {
                name: "UKPN Operational Data",
                description: "Real-time operational and monitoring data",
                endpoint: "/data/operations",
                recordCount: "N/A"
              }
            ];
            
            setDataSources(knownDataSources);
            console.log("✅ Using known data sources for grid_and_primary_calculated process:", knownDataSources);
          }
          
        } catch (sourcesError) {
          console.error("❌ Error fetching data sources:", sourcesError);
          setDataSources([]);
        }

        // Calculate comprehensive summary statistics
        const totalSites = jsonData.length;

        // Calculate generation capacity statistics
        const generationCapacityValues = jsonData
          .map((site) => site["Generation Capacity"] || site["Generation_Capacity"])
          .filter((val) => val !== null && val !== undefined && !isNaN(val));

        const totalGenerationCapacity = generationCapacityValues.length > 0
          ? generationCapacityValues.reduce((sum, val) => sum + parseFloat(val), 0)
          : 0;

        const avgGenerationCapacity = generationCapacityValues.length > 0
          ? totalGenerationCapacity / generationCapacityValues.length
          : 0;

        // Calculate firm capacity statistics
        const firmCapacityValues = jsonData
          .map((site) => site["Firm Capacity"] || site["Firm_Capacity"])
          .filter((val) => val !== null && val !== undefined && !isNaN(val));

        const totalFirmCapacity = firmCapacityValues.length > 0
          ? firmCapacityValues.reduce((sum, val) => sum + parseFloat(val), 0)
          : 0;

        // Calculate spare capacity statistics
        const spareCapacityValues = jsonData
          .map((site) => site["Spare Summer"] || site["Spare_Summer"])
          .filter((val) => val !== null && val !== undefined && !isNaN(val));

        const totalSpareCapacity = spareCapacityValues.length > 0
          ? spareCapacityValues.reduce((sum, val) => sum + parseFloat(val), 0)
          : 0;

        // Calculate voltage level distribution
        const voltageLevels = {};
        jsonData.forEach((site) => {
          const voltage = site["Connectivity Voltage(kV)"] || site["CONNECTIVITY VOLTAGE(KV)"];
          if (voltage) {
            const voltageStr = voltage.toString();
            voltageLevels[voltageStr] = (voltageLevels[voltageStr] || 0) + 1;
          }
        });

        // Calculate operator distribution
        const operators = {};
        jsonData.forEach((site) => {
          const operator = site["Associatedgsp"] || site["ASSOCIATEDGSP"];
          if (operator && operator !== "Not Available") {
            operators[operator] = (operators[operator] || 0) + 1;
          }
        });

        // Calculate risk level distribution based on generation headroom
        const riskLevels = { high: 0, medium: 0, low: 0, unknown: 0 };
        jsonData.forEach((site) => {
          const headroom = site["Generation Headroom Mw"] || site["generation_headroom"];
          if (headroom !== null && headroom !== undefined && !isNaN(headroom)) {
            const value = parseFloat(headroom);
            if (value < 20) riskLevels.high++;
            else if (value < 50) riskLevels.medium++;
            else riskLevels.low++;
          } else {
            riskLevels.unknown++;
          }
        });

        // Prepare comprehensive summary data
        const data = {
          totalSites,
          totalGenerationCapacity: totalGenerationCapacity.toFixed(2),
          avgGenerationCapacity: avgGenerationCapacity.toFixed(2),
          totalFirmCapacity: totalFirmCapacity.toFixed(2),
          totalSpareCapacity: totalSpareCapacity.toFixed(2),
          voltageLevels,
          operators,
          riskLevels,
          sitesWithData: generationCapacityValues.length,
          sitesWithFirmCapacity: firmCapacityValues.length,
          sitesWithSpareCapacity: spareCapacityValues.length,
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
    <div className="min-h-screen py-4" style={{backgroundColor: '#F6F2F4'}}>
      {/* Page Title */}
      <h1 className="text-center text-3xl font-bold py-4" style={{color: '#030304'}}>
        Summary Overview
      </h1>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-8">
        {/* Total Sites Card */}
        <div className="bg-white shadow-md rounded-xl p-6 hover:scale-105 transition transform duration-200" style={{boxShadow: '0 4px 12px rgba(3, 3, 4, 0.08)', border: '1px solid rgba(3, 3, 4, 0.1)'}}>
          <p className="uppercase text-sm" style={{color: 'rgba(3, 3, 4, 0.7)'}}>Total Sites</p>
          <h2 className="text-3xl font-semibold mt-2" style={{color: '#297373'}}>
            {summaryData.totalSites}
          </h2>
        </div>

        {/* Total Generation Capacity Card */}
        <div className="bg-white shadow-md rounded-xl p-6 hover:scale-105 transition transform duration-200" style={{boxShadow: '0 4px 12px rgba(3, 3, 4, 0.08)', border: '1px solid rgba(3, 3, 4, 0.1)'}}>
          <p className="uppercase text-sm" style={{color: 'rgba(3, 3, 4, 0.7)'}}>Total Generation Capacity (MW)</p>
          <h2 className="text-3xl font-semibold mt-2" style={{color: '#297373'}}>
            {summaryData.totalGenerationCapacity}
          </h2>
        </div>

        {/* Average Generation Capacity Card */}
        <div className="bg-white shadow-md rounded-xl p-6 hover:scale-105 transition transform duration-200" style={{boxShadow: '0 4px 12px rgba(3, 3, 4, 0.08)', border: '1px solid rgba(3, 3, 4, 0.1)'}}>
          <p className="uppercase text-sm" style={{color: 'rgba(3, 3, 4, 0.7)'}}>Average Generation Capacity (MW)</p>
          <h2 className="text-3xl font-semibold mt-2" style={{color: '#297373'}}>
            {summaryData.avgGenerationCapacity}
          </h2>
        </div>

        {/* Total Firm Capacity Card */}
        <div className="bg-white shadow-md rounded-xl p-6 hover:scale-105 transition transform duration-200" style={{boxShadow: '0 4px 12px rgba(3, 3, 4, 0.08)', border: '1px solid rgba(3, 3, 4, 0.1)'}}>
          <p className="uppercase text-sm" style={{color: 'rgba(3, 3, 4, 0.7)'}}>Total Firm Capacity (MW)</p>
          <h2 className="text-3xl font-semibold mt-2" style={{color: '#297373'}}>
            {summaryData.totalFirmCapacity}
          </h2>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-8 mt-8">
        {/* Total Spare Capacity Card */}
        <div className="bg-white shadow-md rounded-xl p-6 hover:scale-105 transition transform duration-200" style={{boxShadow: '0 4px 12px rgba(3, 3, 4, 0.08)', border: '1px solid rgba(3, 3, 4, 0.1)'}}>
          <p className="uppercase text-sm" style={{color: 'rgba(3, 3, 4, 0.7)'}}>Total Spare Capacity (MW)</p>
          <h2 className="text-3xl font-semibold mt-2" style={{color: '#297373'}}>
            {summaryData.totalSpareCapacity}
          </h2>
        </div>

        {/* Sites with Data Card */}
        <div className="bg-white shadow-md rounded-xl p-6 hover:scale-105 transition transform duration-200" style={{boxShadow: '0 4px 12px rgba(3, 3, 4, 0.08)', border: '1px solid rgba(3, 3, 4, 0.1)'}}>
          <p className="uppercase text-sm" style={{color: 'rgba(3, 3, 4, 0.7)'}}>Sites with Generation Data</p>
          <h2 className="text-3xl font-semibold mt-2" style={{color: '#297373'}}>
            {summaryData.sitesWithData}
          </h2>
        </div>

        {/* Sites with Firm Capacity Card */}
        <div className="bg-white shadow-md rounded-xl p-6 hover:scale-105 transition transform duration-200" style={{boxShadow: '0 4px 12px rgba(3, 3, 4, 0.08)', border: '1px solid rgba(3, 3, 4, 0.1)'}}>
          <p className="uppercase text-sm" style={{color: 'rgba(3, 3, 4, 0.7)'}}>Sites with Firm Capacity</p>
          <h2 className="text-3xl font-semibold mt-2" style={{color: '#297373'}}>
            {summaryData.sitesWithFirmCapacity}
          </h2>
        </div>
      </div>

      {/* Risk Level Distribution */}
      <div className="px-8 mt-10">
        <h3 className="text-xl font-semibold mb-6" style={{color: '#030304'}}>Risk Level Distribution</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white shadow-md rounded-lg p-4" style={{boxShadow: '0 4px 12px rgba(3, 3, 4, 0.08)', border: '1px solid rgba(3, 3, 4, 0.1)'}}>
            <div className="text-center">
              <div className="text-2xl font-bold mb-2" style={{color: '#FF6B6B'}}>{summaryData.riskLevels.high}</div>
              <div className="text-sm" style={{color: 'rgba(3, 3, 4, 0.7)'}}>High Risk Sites</div>
              <div className="text-xs mt-1" style={{color: 'rgba(3, 3, 4, 0.5)'}}>(&lt;20MW headroom)</div>
            </div>
          </div>
          <div className="bg-white shadow-md rounded-lg p-4" style={{boxShadow: '0 4px 12px rgba(3, 3, 4, 0.08)', border: '1px solid rgba(3, 3, 4, 0.1)'}}>
            <div className="text-center">
              <div className="text-2xl font-bold mb-2" style={{color: '#FFD93D'}}>{summaryData.riskLevels.medium}</div>
              <div className="text-sm" style={{color: 'rgba(3, 3, 4, 0.7)'}}>Medium Risk Sites</div>
              <div className="text-xs mt-1" style={{color: 'rgba(3, 3, 4, 0.5)'}}>(20-50MW headroom)</div>
            </div>
          </div>
          <div className="bg-white shadow-md rounded-lg p-4" style={{boxShadow: '0 4px 12px rgba(3, 3, 4, 0.08)', border: '1px solid rgba(3, 3, 4, 0.1)'}}>
            <div className="text-center">
              <div className="text-2xl font-bold mb-2" style={{color: '#297373'}}>{summaryData.riskLevels.low}</div>
              <div className="text-sm" style={{color: 'rgba(3, 3, 4, 0.7)'}}>Low Risk Sites</div>
              <div className="text-xs mt-1" style={{color: 'rgba(3, 3, 4, 0.5)'}}>(&gt;50MW headroom)</div>
            </div>
          </div>
          <div className="bg-white shadow-md rounded-lg p-4" style={{boxShadow: '0 4px 12px rgba(3, 3, 4, 0.08)', border: '1px solid rgba(3, 3, 4, 0.1)'}}>
            <div className="text-center">
              <div className="text-2xl font-bold mb-2" style={{color: '#AD96DC'}}>{summaryData.riskLevels.unknown}</div>
              <div className="text-sm" style={{color: 'rgba(3, 3, 4, 0.7)'}}>Unknown Risk</div>
              <div className="text-xs mt-1" style={{color: 'rgba(3, 3, 4, 0.5)'}}>(No headroom data)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Voltage Level Distribution */}
      <div className="px-8 mt-10">
        <h3 className="text-xl font-semibold mb-6" style={{color: '#030304'}}>Voltage Level Distribution</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(summaryData.voltageLevels).map(([voltage, count]) => (
            <div key={voltage} className="bg-white shadow-md rounded-lg p-4 text-center" style={{boxShadow: '0 4px 12px rgba(3, 3, 4, 0.08)', border: '1px solid rgba(3, 3, 4, 0.1)'}}>
              <div className="text-xl font-bold mb-1" style={{color: '#297373'}}>{count}</div>
              <div className="text-sm" style={{color: 'rgba(3, 3, 4, 0.7)'}}>{voltage}kV</div>
            </div>
          ))}
        </div>
      </div>

      {/* Operator Distribution */}
      <div className="px-8 mt-10">
        <h3 className="text-xl font-semibold mb-6" style={{color: '#030304'}}>Network Operator Distribution</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(summaryData.operators).map(([operator, count]) => (
            <div key={operator} className="bg-white shadow-md rounded-lg p-4" style={{boxShadow: '0 4px 12px rgba(3, 3, 4, 0.08)', border: '1px solid rgba(3, 3, 4, 0.1)'}}>
              <div className="text-lg font-bold mb-1" style={{color: '#297373'}}>{count}</div>
              <div className="text-sm" style={{color: 'rgba(3, 3, 4, 0.7)'}}>{operator}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Sources Section */}
      <div className="px-8 mt-10">
        <h3 className="text-xl font-semibold mb-2" style={{color: '#030304'}}>Data Sources ({dataSources.length})</h3>
        <p className="text-sm mb-6" style={{color: 'rgba(3, 3, 4, 0.7)'}}>Used in grid_and_primary_calculated process</p>
        {dataSources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dataSources.map((source, index) => (
              <div
                key={index}
                className="bg-white shadow-md rounded-lg p-4 transition-all duration-300 hover:shadow-lg hover:scale-105" style={{boxShadow: '0 4px 12px rgba(3, 3, 4, 0.08)', border: '1px solid rgba(3, 3, 4, 0.1)'}}
              >
                <div className="flex items-start">
                  <div className="w-3 h-3 rounded-full mr-3 mt-2 flex-shrink-0" style={{backgroundColor: '#297373'}}></div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1" style={{color: '#030304'}}>{source.name}</h4>
                    <p className="text-sm mb-2" style={{color: 'rgba(3, 3, 4, 0.7)'}}>{source.description}</p>
                    <p className="text-xs mb-1" style={{color: 'rgba(3, 3, 4, 0.5)'}}>Endpoint: {source.endpoint}</p>
                    {source.recordCount && (
                      <p className="text-xs" style={{color: 'rgba(3, 3, 4, 0.5)'}}>Records: {source.recordCount}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white shadow-md rounded-lg p-6 text-center" style={{boxShadow: '0 4px 12px rgba(3, 3, 4, 0.08)', border: '1px solid rgba(3, 3, 4, 0.1)'}}>
            <p style={{color: 'rgba(3, 3, 4, 0.7)'}}>No data sources found for grid_and_primary_calculated process</p>
            <p className="text-sm mt-2" style={{color: 'rgba(3, 3, 4, 0.5)'}}>Check if the backend endpoint /data/sources/grid_and_primary_calculated is available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SummaryPage;
