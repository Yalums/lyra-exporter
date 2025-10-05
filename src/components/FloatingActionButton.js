// components/FloatingActionButton.js
import React, { useState } from 'react';

const FloatingActionButton = ({ onClick, title = "导出" }) => {
  const [isHovered, setIsHovered] = useState(false);

  const buttonStyle = {
    position: 'fixed',
    bottom: '30px',
    right: '30px',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-primary)',
    color: 'white',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    boxShadow: isHovered 
      ? 'var(--shadow-lg)' 
      : 'var(--shadow-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all var(--transition-normal)',
    transform: isHovered ? 'scale(1.1) translateY(-2px)' : 'scale(1)',
    zIndex: 1000,
    outline: 'none',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent'
  };

  return (
    <button 
      style={buttonStyle}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={title}
      aria-label={title}
    >
      📝
    </button>
  );
};

export default FloatingActionButton;
