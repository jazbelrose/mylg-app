import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import summaryStyles from "./BudgetHeaderSummary.module.css";

interface SummaryCardProps {
  icon: any;
  color: string;
  title: string;
  tag: string;
  value: string;
  description: string;
  className?: string;
  onClick?: () => void;
  active?: boolean;
  children?: React.ReactNode;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  icon,
  color,
  title,
  tag,
  value,
  description,
  className = "",
  onClick,
  active = false,
  children,
}) => {
  const isClickable = Boolean(onClick);
  const style = { borderColor: active ? color : undefined };
  const classes = [
    summaryStyles.summaryCard,
    className,
    isClickable ? summaryStyles.clickable : "",
    active ? summaryStyles.active : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      style={style}
      onClick={onClick}
      onKeyDown={
        isClickable
          ? (e) => {
              if ((e.key === "Enter" || e.key === " ") && onClick) {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div className={summaryStyles.cardHeader}>
        <div className={summaryStyles.iconContainer} style={{ backgroundColor: color }}>
          <FontAwesomeIcon icon={icon} className={summaryStyles.cardIcon} />
        </div>
        <span className={summaryStyles.tag}>{tag}</span>
      </div>
      <div className={summaryStyles.cardBody}>
        <div className={summaryStyles.titleRow}>
          <h3 className={summaryStyles.title}>{title}</h3>
          {children}
        </div>
        <div className={summaryStyles.value}>{value}</div>
        <div className={summaryStyles.description}>{description}</div>
      </div>
    </div>
  );
};

export default SummaryCard;