import React, { useState, useEffect, useRef } from "react";

const SidebarFilters = ({
  onSiteNameSearch,
  onVoltageFilter,
  onPowerRangeChange,
  onOperatorFilter,
  voltageLevels = [20, 22, 33, 66, 132],
  operators = [
    "Eastern Power Networks (EPN)",
    "London Power Networks (LPN)",
    "South Eastern Power Networks (SPN)",
  ],
  currentFilters = {
    siteName: "",
    voltage: "",
    powerRange: { min: 0, max: 200 },
    operators: "",
  },
  siteNames = [], // Add site names prop for autocomplete
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Filter suggestions based on input
  useEffect(() => {
    const inputValue = currentFilters.siteName || "";
    if (inputValue.length >= 2) {
      const filtered = siteNames
        .filter(name => 
          name.toLowerCase().includes(inputValue.toLowerCase())
        )
        .slice(0, 10); // Limit to 10 suggestions
      
      // Debug logging
      console.log("SidebarFilters - Input value:", inputValue);
      console.log("SidebarFilters - Available site names:", siteNames.length);
      console.log("SidebarFilters - Filtered suggestions before deduplication:", filtered);
      
      // Remove duplicates and ensure uniqueness
      const uniqueFiltered = [...new Set(filtered)];
      
      console.log("SidebarFilters - Unique filtered suggestions:", uniqueFiltered);
      
      setFilteredSuggestions(uniqueFiltered);
      setShowSuggestions(uniqueFiltered.length > 0);
      setHighlightedIndex(-1);
    } else {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  }, [currentFilters.siteName, siteNames]);

  // Handle input change
  const handleSiteNameChange = (e) => {
    const value = e.target.value;
    onSiteNameSearch(value);
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion) => {
    onSiteNameSearch(suggestion);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
          handleSuggestionClick(filteredSuggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleVoltageChange = (e) => {
    onVoltageFilter(e.target.value);
  };

  const handlePowerRangeChange = (min) => {
    onPowerRangeChange({ min: parseFloat(min) });
  };

  const handleOperatorChange = (e) => {
    onOperatorFilter(e.target.value);
  };

  return (
            <div className="map-container p-6 h-full overflow-y-auto transition-all duration-300 hover:shadow-xl" style={{backgroundColor: 'white', boxShadow: '0 4px 12px rgba(3, 3, 4, 0.08)', borderRadius: '12px', border: '1px solid rgba(3, 3, 4, 0.1)'}}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold" style={{color: '#030304', fontWeight: 'bold'}}>Filters</h3>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-gray-500 hover:text-gray-700 transition-colors duration-200 md:hidden"
        >
          {isCollapsed ? ">>" : "<<"}
        </button>
      </div>

      {!isCollapsed && (
        <div className="space-y-6">
          {/* Search by Site Name */}
          <div className="relative">
            <label className="block text-sm font-medium mb-2" style={{color: '#030304'}}>
              Search by Site Name
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                placeholder="Enter site name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none transition-all duration-300 hover:shadow-md"
                style={{
                  backgroundColor: 'white',
                  color: '#030304',
                  border: '1px solid #E8E4E6',
                  boxShadow: '0 1px 3px rgba(3, 3, 4, 0.1)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#8DE971';
                  e.target.style.boxShadow = '0 0 0 3px rgba(141, 233, 113, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E8E4E6';
                  e.target.style.boxShadow = '0 1px 3px rgba(3, 3, 4, 0.1)';
                }}
                onChange={handleSiteNameChange}
                onKeyDown={handleKeyDown}
                value={currentFilters.siteName || ""}
              />
              
              {/* Autocomplete Dropdown */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                  style={{
                    boxShadow: '0 4px 12px rgba(3, 3, 4, 0.15)',
                    border: '1px solid #E8E4E6'
                  }}
                >
                  {filteredSuggestions.map((suggestion, index) => {
                    // Additional safety check to prevent duplicates in rendering
                    const isDuplicate = filteredSuggestions.indexOf(suggestion) !== index;
                    if (isDuplicate) {
                      console.warn("Duplicate suggestion found:", suggestion, "at index", index);
                      return null;
                    }
                    
                    return (
                      <div
                        key={`${suggestion}-${index}`}
                        className={`px-3 py-2 cursor-pointer transition-colors duration-150 ${
                          index === highlightedIndex
                            ? 'bg-blue-100 text-blue-900'
                            : 'hover:bg-gray-100 text-gray-900'
                        }`}
                        onClick={() => handleSuggestionClick(suggestion)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        style={{
                          color: index === highlightedIndex ? '#1e40af' : '#030304',
                          backgroundColor: index === highlightedIndex ? '#dbeafe' : 'transparent'
                        }}
                      >
                        {suggestion}
                      </div>
                    );
                  }).filter(Boolean)}
                </div>
              )}
            </div>
          </div>

          {/* Voltage Level Filter */}
          <div>
                    <label className="block text-sm font-medium mb-2" style={{color: '#030304'}}>
                      Voltage Level
                    </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none transition-all duration-300 hover:shadow-md"
              style={{
                backgroundColor: 'white',
                color: '#030304',
                border: '1px solid #E8E4E6',
                boxShadow: '0 1px 3px rgba(3, 3, 4, 0.1)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#8DE971';
                e.target.style.boxShadow = '0 0 0 3px rgba(141, 233, 113, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#E8E4E6';
                e.target.style.boxShadow = '0 1px 3px rgba(3, 3, 4, 0.1)';
              }}
              value={currentFilters.voltage || ""}
              onChange={handleVoltageChange}
            >
              <option value="">All Voltage Levels</option>
              {voltageLevels.map((voltage) => (
                <option key={voltage} value={voltage}>
                  {voltage} kV
                </option>
              ))}
            </select>
          </div>

          {/* Generation Capacity Range Input */}
          <div>
                    <label className="block text-sm font-medium mb-2" style={{color: '#030304'}}>
                      Generation Capacity (MW)
                    </label>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none transition-all duration-300 hover:shadow-md"
              style={{
                backgroundColor: 'white',
                color: '#030304',
                border: '1px solid #E8E4E6',
                boxShadow: '0 1px 3px rgba(3, 3, 4, 0.1)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#8DE971';
                e.target.style.boxShadow = '0 0 0 3px rgba(141, 233, 113, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#E8E4E6';
                e.target.style.boxShadow = '0 1px 3px rgba(3, 3, 4, 0.1)';
              }}
              value={currentFilters.powerRange?.min ?? 0}
              onChange={(e) => handlePowerRangeChange(e.target.value)}
            />
            <p className="text-xs mt-1" style={{color: 'rgba(3, 3, 4, 0.5)'}}>Show sites with capacity ≥ this value</p>
          </div>

          {/* Network Operators Filter */}
          <div>
                    <label className="block text-sm font-medium mb-2" style={{color: '#030304'}}>
                      Network Operator
                    </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none transition-all duration-300 hover:shadow-md"
              style={{
                backgroundColor: 'white',
                color: '#030304',
                border: '1px solid #E8E4E6',
                boxShadow: '0 1px 3px rgba(3, 3, 4, 0.1)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#8DE971';
                e.target.style.boxShadow = '0 0 0 3px rgba(141, 233, 113, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#E8E4E6';
                e.target.style.boxShadow = '0 1px 3px rgba(3, 3, 4, 0.1)';
              }}
              value={currentFilters.operators || ""}
              onChange={handleOperatorChange}
            >
              <option value="">All Operators</option>
              {operators.map((operator) => (
                <option key={operator} value={operator}>
                  {operator}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default SidebarFilters;
