import React from "react";

const Footer = ({ className = "" }) => {
  return (
    <footer
      className={`bg-white border-t border-gray-200 py-3 px-6 ${className}`}
    >
      {/* Footer container kept intentionally empty — buttons removed per request */}
    </footer>
  );
};

export default Footer;
