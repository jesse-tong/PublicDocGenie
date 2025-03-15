import React, { useState, useRef } from 'react';
import anime from 'animejs';
import './../assets/text-list.css';

const TextList = ({ data, maxHeight = 300 }) => {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef(null);

  const handleExpand = () => {
    setExpanded(!expanded);
    anime({
      targets: containerRef.current,
      height: expanded ? `${maxHeight}px` : 'auto',
      duration: 500,
      easing: 'easeInOutQuad',
    });
  };

  const handleClose = () => {
    anime({
        targets: containerRef.current,
        height: expanded ? 'auto' : `${maxHeight}px`,
        duration: 500,
        easing: 'easeInOutQuad',
        complete: () => setExpanded(!expanded)
    })
  }

  return (
    <div
      ref={containerRef}
      className={`text-container ${expanded ? 'expanded' : ''}`}
      style={{ maxHeight: expanded ? 'none' : `${maxHeight}px` }}
    >
      {data.map((item, index) => (
        <div key={index} className="text-item">
          {item}
        </div>
      ))}
      <div className="expand-button" onClick={expanded ? handleClose : handleExpand}>
        <div className={`expand-icon ${expanded ? 'expanded' : ''}`} />
      </div>
    </div>
  );
};

export default TextList;
