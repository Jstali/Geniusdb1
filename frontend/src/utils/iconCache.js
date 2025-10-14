// Icon cache to prevent recreating the same icons
const iconCache = new Map();

export const createCachedMarkerIcon = (color) => {
  // Check if icon already exists in cache
  if (iconCache.has(color)) {
    return iconCache.get(color);
  }

  // Create new icon with proper size (smaller, more appropriate)
  const icon = {
    scale: 1.0, // Reduced from 1.2 to 1.0 for smaller size
    anchor: new google.maps.Point(12, 24),
  };

  // Cache the icon
  iconCache.set(color, icon);
  return icon;
};

// Clear cache if needed (for memory management)
export const clearIconCache = () => {
  iconCache.clear();
};

// Get cache size for monitoring
export const getIconCacheSize = () => {
  return iconCache.size;
};
