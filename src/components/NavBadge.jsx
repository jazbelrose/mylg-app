import React from 'react';

const NavBadge = ({ count, label, className = "nav-badge" }) => {
  if (count === 0) return null;
  const display = count > 99 ? "99+" : count;
  const ariaLabel = `${count} unread ${label}${count === 1 ? "" : "s"}`;

  return (
    <span className={className} aria-label={ariaLabel} data-count={display}>
      {display}
    </span>
  );
};

export default NavBadge;