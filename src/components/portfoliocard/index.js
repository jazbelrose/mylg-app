import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Link } from 'react-router-dom';
import './style.css';
import CustomIcon from "../../assets/svg/angled-arrow.svg?react";
function PortfolioCard(props) {
    return (_jsxs(Link, { to: props.linkUrl, className: `portfolio-card ${props.className}`, children: [_jsx("img", { src: props.imageSrc, alt: props.imageAlt, className: "card-image" }), _jsxs("div", { className: "top-left title", children: [_jsx("h3", { className: "title", children: props.title }), _jsx("h3", { className: "subtitle", children: props.subtitle })] }), _jsx("div", { className: "bottom-left description", children: _jsx("span", { className: "portfolio-description", children: props.description }) }), _jsx("div", { className: "custom-icon-container" })] }));
}
export default PortfolioCard;
