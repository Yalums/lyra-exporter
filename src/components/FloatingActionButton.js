// components/FloatingActionButton.js
import React from 'react';

const FloatingActionButton = ({ onClick, title = "导出" }) => {
  return (
    <button 
      className="floating-action-button"
      onClick={onClick}
      title={title}
    >
      📤
    </button>
  );
};

export default FloatingActionButton;
