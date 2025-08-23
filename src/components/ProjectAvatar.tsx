import React from 'react';
import SVGThumbnail from '../pages/dashboard/components/AllProjects/SVGThumbnail';

interface ProjectAvatarProps {
  thumb?: string;
  name?: string;
  initial?: string;
  className?: string;
}

const ProjectAvatar: React.FC<ProjectAvatarProps> = ({
  thumb,
  name = '',
  initial = '',
  className = '',
}) =>
  thumb ? (
    <img src={thumb} alt={name} className={className} />
  ) : (
    <SVGThumbnail
      initial={(initial || name.charAt(0)).toUpperCase()}
      className={className}
    />
  );

export default ProjectAvatar;

