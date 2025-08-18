import React from 'react';
import SVGThumbnail from '../pages/dashboard/components/AllProjects/SVGThumbnail';

const ProjectAvatar = ({ thumb, name = '', initial = '', className = '' }) => (
  thumb ? (
    <img src={thumb} alt={name} className={className} />
  ) : (
    <SVGThumbnail
      initial={initial || name.charAt(0).toUpperCase()}
      className={className}
    />
  )
);

export default ProjectAvatar;