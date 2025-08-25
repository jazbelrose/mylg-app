import React from 'react';

interface SVGThumbnailProps {
  initial: string;
  className?: string;
}

const SVGThumbnail: React.FC<SVGThumbnailProps> = ({ initial, className }) => {
  const centerX = 125; // Half of 250
  const centerY = 142; // Half of 250

  return (
    <svg
      className={className}
      width="250"
      height="250"
      viewBox="0 0 250 250"
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x={centerX}
        y={centerY}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fill: '#fff',
          fontFamily: "HelveticaNeueLT-Roman, 'HelveticaNeue LT 55 Roman', 'Helvetica'",
          fontSize: '180px',
        }}
      >
        {initial}
      </text>
      <rect
        x="7"
        y="7"
        width="236"
        height="236"
        rx="35"
        ry="35"
        style={{
          fill: 'none',
          stroke: '#fff',
          strokeMiterlimit: 10,
          strokeWidth: '7px',
        }}
      />
    </svg>
  );
};

export default SVGThumbnail;
