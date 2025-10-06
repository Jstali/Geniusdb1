import { useState, useEffect } from "react";

export const useSubstationData = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const columns = [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "siteName", header: "Site Name" },
    { accessorKey: "siteVoltage", header: "Voltage (kV)" },
    { accessorKey: "generationHeadroom", header: "Generation Headroom (MW)" },
    { accessorKey: "county", header: "County" },
    { accessorKey: "licenceArea", header: "Licence Area" },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/data/map");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        console.error("Error fetching substation data:", err);
        setError(err.message);
        // Set empty array as fallback
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error, columns };
};
