import React, { useMemo, useCallback } from 'react';
import { Marker } from '@react-google-maps/api';

// Improved clustering algorithm to prevent blinking
const clusterMarkers = (markers, zoom, clusterRadius = 50) => {
  // Show individual markers at higher zoom levels
  if (zoom > 11) {
    return markers.map(marker => ({ ...marker, isCluster: false, clusterSize: 1 }));
  }

  // For very low zoom levels, use larger cluster radius
  const adjustedRadius = zoom < 8 ? clusterRadius * 2 : clusterRadius;
  
  const clusters = [];
  const processed = new Set();

  markers.forEach((marker, index) => {
    if (processed.has(index)) return;

    const cluster = {
      ...marker
    };

    // Find nearby markers to cluster
    markers.forEach((otherMarker, otherIndex) => {
      if (otherIndex === index || processed.has(otherIndex)) return;

      const distance = getDistance(marker.position, otherMarker.position);
      if (distance < adjustedRadius) {
        cluster.markers.push(otherMarker);
        cluster.clusterSize++;
        processed.add(otherIndex);
      }
    });

    processed.add(index);
    
    // Set cluster color based on contained markers
    cluster.color = getClusterColor(cluster.markers);
    
    clusters.push(cluster);
  });

  return clusters;
};

// Calculate distance between two points (simplified)
const getDistance = (pos1, pos2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (pos2.lat - pos1.lat) * Math.PI / 180;
  const dLng = (pos2.lng - pos1.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(pos1.lat * Math.PI / 180) * Math.cos(pos2.lat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000; // Distance in meters
};

// Determine cluster color based on the markers it contains
const getClusterColor = (markers) => {
  if (markers.length === 0) return '#4285F4';
  
  // Count markers by color
  const colorCounts = {};
  markers.forEach(marker => {
    const color = marker.color || '#808080';
    colorCounts[color] = (colorCounts[color] || 0) + 1;
  });
  
  // Return the most common color, or blue as default
  const mostCommonColor = Object.keys(colorCounts).reduce((a, b) => 
    colorCounts[a] > colorCounts[b] ? a : b
  
  return mostCommonColor;
};

// Create cluster icon with better size and color
const createClusterIcon = (size, color = '#4285F4') => {
  const radius = Math.max(15, Math.min(25, 15 + size * 1.5)); // Smaller, more appropriate size
  
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg width="${radius * 2}" height="${radius * 2}" viewBox="0 0 ${radius * 2} ${radius * 2}">
        <circle cx="${radius}" cy="${radius}" r="${radius - 2}" 
                fill="${color}" stroke="white" stroke-width="2" opacity="0.9"/>
        <text x="${radius}" y="${radius + 4}" text-anchor="middle" 
              fill="white" font-family="Arial" font-size="10" font-weight="bold">
          ${size}
        </text>
      </svg>
    `)}`,
    scaledSize: new google.maps.Size(radius * 2, radius * 2),
    anchor: new google.maps.Point(radius, radius)
  };
};

const MarkerClusterer = ({ 
  markers = [], 
  zoom = 8, 
  onMarkerClick, 
  onClusterClick,
  clusterRadius = 50 
}) => {
  // Memoize clustering to avoid recalculation on every render
  const clusteredMarkers = useMemo(() => {
    if (!markers.length) return [];
    return clusterMarkers(markers, zoom, clusterRadius);
  }, [markers, zoom, clusterRadius]);

  const handleMarkerClick = useCallback((marker) => {
    if (marker.isCluster && marker.clusterSize > 1) {
      // Handle cluster click
      if (onClusterClick) {
        onClusterClick(marker);
      }
    } else {
      // Handle individual marker click
      if (onMarkerClick) {
        onMarkerClick(marker);
      }
    }
  }, [onMarkerClick, onClusterClick]);

  return (
    <>
      {clusteredMarkers.map((marker) => {
        if (!marker.position || isNaN(marker.position.lat) || isNaN(marker.position.lng)) {
          return null;
        }

        const icon = marker.isCluster && marker.clusterSize > 1
          ? createClusterIcon(marker.clusterSize, marker.color)
          : marker.icon;

        return (
          <Marker
            key={marker.id}
            position={marker.position}
            icon={icon}
            onClick={() => handleMarkerClick(marker)}
            title={marker.isCluster 
              ? `${marker.clusterSize} transformers in this area`
              : marker.siteName || 'Transformer Site'
            }
          />
      })}
    </>
};

export default MarkerClusterer;
