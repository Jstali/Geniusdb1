import React from 'react';

const MapDebugInfo = ({ markers, loading, error, lastSuccessfulMarkers, dataLoaded, mapLoaded }) => {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-black bg-opacity-75 text-white p-3 rounded-lg text-xs z-50 max-w-xs">
      <div className="font-bold mb-2">Map Debug Info</div>
      <div>Current Markers: {markers?.length || 0}</div>
      <div>Last Successful: {lastSuccessfulMarkers?.length || 0}</div>
      <div>Loading: {loading ? 'Yes' : 'No'}</div>
      <div>Data Loaded: {dataLoaded ? 'Yes' : 'No'}</div>
      <div>Map Loaded: {mapLoaded ? 'Yes' : 'No'}</div>
      <div>Error: {error || 'None'}</div>
      <div className="mt-2 text-yellow-300">
        {markers?.length === 0 && lastSuccessfulMarkers?.length > 0 && !loading && '⚠️ Markers lost!'}
      </div>
    </div>
  );
};

export default MapDebugInfo;
