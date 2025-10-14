import { useState, useEffect } from "react";

export const useTransformerData = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [columns, setColumns] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const API_BASE = (window._env_ && window._env_.API_BASE) || "";
        const response = await fetch(`${API_BASE}/data/transformers`);
        if (!response.ok)
          throw new Error(
            `Failed to fetch transformer data: ${response.status}`
          );
        const json = await response.json();
        setData(json);
      } catch (err) {
        console.error(err);
        setError(
          err.message ||
            "Failed to fetch transformer data. Please check backend."
        );
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error, columns };
};

export default useTransformerData;
