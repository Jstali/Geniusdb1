import React from "react";

const Footer = ({ className = "", showButtons = true }) => {
  return (
    <footer
      className={`backdrop-blur-xl bg-white/5 border-t border-violet-500/20 py-4 px-6 ${className}`}
    >
      {showButtons && (
        <div className="flex flex-wrap justify-end items-center gap-3">
          <button className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg shadow-glow hover:shadow-glow-lg transition-all duration-300 hover:scale-105 font-medium whitespace-nowrap">
            Save
          </button>
          <button className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg shadow-glow hover:shadow-glow-lg transition-all duration-300 hover:scale-105 font-medium whitespace-nowrap">
            Load
          </button>
          <button className="px-5 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg shadow-glow hover:shadow-glow-lg transition-all duration-300 hover:scale-105 font-medium whitespace-nowrap">
            Reset
          </button>
        </div>
      )}
    </footer>
  );
};

export default Footer;
