import React from 'react';

interface NavBadgeProps {
  count: number;
  label: string;
  className?: string;
}

const NavBadge: React.FC<NavBadgeProps> = ({ count, label, className = 'nav-badge' }) => {
  if (count === 0) return null;

  const display = count > 99 ? '99+' : count;
  const ariaLabel = `${count} unread ${label}${count === 1 ? '' : 's'}`;

  return (
    <span className={className} aria-label={ariaLabel} data-count={display}>
      {display}
    </span>
  );
};

export default NavBadge;