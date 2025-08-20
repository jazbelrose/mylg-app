import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Mousewheel } from "swiper/modules"; // Correct import for modules
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "./style.css";
const Slideshow = ({ slides }) => {
    return (_jsx("div", { className: "slideshow-container", children: _jsx(Swiper, { modules: [Navigation, Pagination, Mousewheel], navigation: true, pagination: { clickable: true }, mousewheel: true, spaceBetween: 30, slidesPerView: 1, children: slides.map((slide, index) => (_jsx(SwiperSlide, { children: _jsx("div", { className: "slide-content", children: _jsxs("a", { href: slide.url, target: "_blank", rel: "noopener noreferrer", children: [_jsx("img", { src: slide.imageUrl, alt: slide.title }), _jsx("h2", { children: slide.title }), _jsx("p", { children: slide.content })] }) }) }, index))) }) }));
};
export default Slideshow;
