import React from "react";

const SimpleMapFallback = ({ markers = [], onMarkerClick }) => {
  return (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <div className="text-center p-8">
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Map Loading</h3>
        <p className="text-gray-500 mb-4">Loading interactive map...</p>
        <div className="text-sm text-gray-400">
          <p>Total Sites: {markers.length}</p>
          <p>Map will appear shortly</p>
        </div>
      </div>
    </div>
  );
};

export default SimpleMapFallback;
