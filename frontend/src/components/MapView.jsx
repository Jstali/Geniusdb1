import React from "react";
import GoogleMapComponent from "./GoogleMapComponent";

const MapView = () => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Map View</h2>
      <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Map Overview
        </h3>
        <p className="text-gray-600">
          This map displays the locations of all electrical grid substations.
          Each marker represents a substation with its spatial coordinates.
        </p>
      </div>
      <div className="mt-4">
        <div className="w-full h-[600px]">
          <GoogleMapComponent />
        </div>
      </div>
    </div>
  );
};

export default MapView;
