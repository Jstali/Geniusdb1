import React from "react";

const Footer = ({ className = "", showButtons = true }) => {
  return (
    <footer
      className={`bg-white border-t border-gray-200 py-3 px-6 ${className}`}
    >
      {showButtons && (
        <div className="flex justify-end space-x-3">
          <button 
            className="px-4 py-2 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-sm font-medium transform hover:scale-105"
                    style={{
                      backgroundColor: '#8DE971',
                      boxShadow: '0 4px 12px rgba(141, 233, 113, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#7AC75E';
                      e.target.style.boxShadow = '0 6px 20px rgba(141, 233, 113, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#8DE971';
                      e.target.style.boxShadow = '0 4px 12px rgba(141, 233, 113, 0.3)';
                    }}
          >
            Save
          </button>
          <button 
            className="px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-sm font-medium transform hover:scale-105"
                    style={{
                      backgroundColor: '#FFD93D',
                      color: '#030304',
                      border: '1px solid rgba(3, 3, 4, 0.1)',
                      boxShadow: '0 4px 12px rgba(255, 217, 61, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#AD96DC';
                      e.target.style.color = 'white';
                      e.target.style.boxShadow = '0 6px 20px rgba(173, 150, 220, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#FFD93D';
                      e.target.style.color = '#030304';
                      e.target.style.boxShadow = '0 4px 12px rgba(255, 217, 61, 0.3)';
                    }}
          >
            Load
          </button>
          <button 
            className="px-4 py-2 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-sm font-medium transform hover:scale-105"
            style={{
              backgroundColor: '#030304',
              boxShadow: '0 4px 12px rgba(3, 3, 4, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#FF6B6B';
              e.target.style.boxShadow = '0 6px 20px rgba(255, 107, 107, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#030304';
              e.target.style.boxShadow = '0 4px 12px rgba(3, 3, 4, 0.3)';
            }}
          >
            Reset
          </button>
        </div>
      )}
    </footer>
  );
};

export default Footer;
