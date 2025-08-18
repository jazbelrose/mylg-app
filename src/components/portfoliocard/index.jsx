import React from 'react';
import { Link } from 'react-router-dom';
import './style.css';
import { ReactComponent as CustomIcon } from "../../assets/svg/angled-arrow.svg";

function PortfolioCard(props) {
  return (
    <Link to={props.linkUrl} className={`portfolio-card ${props.className}`}>
      <img src={props.imageSrc} alt={props.imageAlt} className="card-image"/>
      <div className="top-left title">
        <h3 className="title">{props.title}</h3>
        <h3 className="subtitle">{props.subtitle}</h3>
      </div>
      <div className="bottom-left description">
        <span className="portfolio-description">{props.description}</span>
      </div>
      <div className="custom-icon-container">
      {/* <CustomIcon style={{ width: '50px', height: '50px' }} /> */}

      </div>
    </Link>
  );
}

export default PortfolioCard;
