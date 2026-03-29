import React from 'react';

export const Loader = ({ className }: { className?: string }) => {
  return (
    <div className={`three-body ${className || ''}`}>
      <div className="three-body__dot" />
      <div className="three-body__dot" />
      <div className="three-body__dot" />
    </div>
  );
};
