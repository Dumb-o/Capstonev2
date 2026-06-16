import React from 'react';

export default function Loading({ text = 'Loading...' }) {
  return (
    <div className="loading-container">
      <div className="loading-spinner" />
      <p>{text}</p>
    </div>
  );
}
