// components/FloatingActionButton.js
import React, { useState } from 'react';

const FloatingActionButton = ({ onClick, title = "导出" }) => {
  const [isHovered, setIsHovered] = useState(false);

  // 导出图标的 base64 编码
  const exportIconSvg = 'data:image/svg+xml;base64,PHN2ZyB0PSIxNzYwMTQ2ODkyMDIyIiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjQ3MTIiIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cGF0aCBkPSJNNzEyLjUzMzMzMyAzNzEuMmwtMTI4IDEyOC01OS43MzMzMzMtNTkuNzMzMzMzIDEyOC0xMjhMNTk3LjMzMzMzMyAyNTZsLTQyLjY2NjY2Ni00Mi42NjY2NjdoMjU2djI1NmwtNDIuNjY2NjY3LTQyLjY2NjY2Ni01NS40NjY2NjctNTUuNDY2NjY3ek02NTcuMDY2NjY3IDI1Nkg3Njh2MTEwLjkzMzMzM1YyNTZoLTExMC45MzMzMzN6TTI5OC42NjY2NjcgMjk4LjY2NjY2N3Y0MjYuNjY2NjY2aDQyNi42NjY2NjZ2LTI1Nmw4NS4zMzMzMzQgODUuMzMzMzM0djI1NkgyMTMuMzMzMzMzVjIxMy4zMzMzMzNoMjU2bDg1LjMzMzMzNCA4NS4zMzMzMzRIMjk4LjY2NjY2N3oiIGZpbGw9IiNmZmZmZmYiIHAtaWQ9IjQ3MTMiPjwvcGF0aD48L3N2Zz4=';

  const buttonStyle = {
    position: 'fixed',
    bottom: '30px',
    right: '30px',
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-primary)',
    color: 'white',
    border: 'none',
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
    WebkitTapHighlightColor: 'transparent',
    padding: '0'
  };

  const iconStyle = {
    width: '28px',
    height: '28px',
    display: 'block'
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
      <img 
        src={exportIconSvg} 
        alt="export icon" 
        style={iconStyle}
      />
    </button>
  );
};

export default FloatingActionButton;
