import React, { useState, useEffect, useRef } from 'react';

const MapPerformanceMonitor = ({ markers, isVisible = false }) => {
  const [performance, setPerformance] = useState({
    memoryUsage: 0
  });
  
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const animationId = useRef(null);

  useEffect(() => {
    if (!isVisible) return;

    const measurePerformance = () => {
      const now = performance.now();
      frameCount.current++;
      
      if (now - lastTime.current >= 1000) {
        const fps = Math.round((frameCount.current * 1000) / (now - lastTime.current));
        const memoryUsage = performance.memory ? 
          Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 0;
        
        setPerformance(prev => ({
          ...prev,
          fps,
          memoryUsage,
          markerCount: markers.length
        }));
        
        frameCount.current = 0;
        lastTime.current = now;
      }
      
      animationId.current = requestAnimationFrame(measurePerformance);
    };

    animationId.current = requestAnimationFrame(measurePerformance);

    return () => {
      if (animationId.current) {
        cancelAnimationFrame(animationId.current);
      }
    };
  }, [isVisible, markers.length]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-4 bg-black bg-opacity-75 text-white p-3 rounded-lg text-xs z-50 max-w-xs">
      <div className="font-bold mb-2">Map Performance</div>
      <div>Markers: {performance.markerCount}</div>
      <div>FPS: {performance.fps}</div>
      <div>Memory: {performance.memoryUsage}MB</div>
      <div className="mt-2">
  <div className={`text-xs ${performance.fps >= 30 ? 'text-geniusAquamarine' : performance.fps >= 20 ? 'text-yellow-400' : 'text-red-400'}`}>
          {performance.fps >= 30 ? '✅ Smooth' : performance.fps >= 20 ? '⚠️ Moderate' : '❌ Laggy'}
        </div>
      </div>
    </div>
};

export default MapPerformanceMonitor;
