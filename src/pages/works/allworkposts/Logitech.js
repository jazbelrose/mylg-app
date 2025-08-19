import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useRef, useEffect, useState } from "react";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { gsap } from "gsap";
import "./style.css";
import works from '../works.json';
import BlogPostButton from "../../../components/blogpostbutton/BlogPostButton.js";
import Ticker from "../../../components/ticker/index.jsx";
import { InfoSection } from "../../../components/infosection/index.js";
import SingleTicker from "../../../components/singleticker/index";
import InlineSvg from "../../../components/inlinesvg/index.jsx";
const Logitech = () => {
    const pageTitle = "Logitech Event Booth & Chair Renders | Digital Art by *MYLG!*";
    const pageDescription = "Explore our 3D renders of Logitech event booths and chairs, showcasing innovative designs and stunning visuals for a brand activation project.";
    const canonicalUrl = "https://mylg.studio/works/Logitech";
    const ogImage = "https://d1cazymewvlm0k.cloudfront.net/21-Logitech/07.jpg";
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        "name": "Logitech Event Booth & Chair Renders",
        "description": "High-quality 3D renders of Logitech's event booth and chairs, emphasizing creative direction and immersive brand activation.",
        "image": ogImage,
        "url": canonicalUrl,
        "creator": {
            "@type": "Organization",
            "name": "*MYLG!*",
            "url": "https://mylg.studio"
        }
    };
    let worksRefs = useRef([]);
    const maxPosts = 16;
    const [displayedWorks, setDisplayedWorks] = useState([]);
    const [svgReady, setSvgReady] = useState(false);
    useEffect(() => {
        console.log("Current worksRefs:", worksRefs.current);
    }, [displayedWorks]);
    useEffect(() => {
        setDisplayedWorks(works.slice(0, maxPosts)); // Adjust 'maxPosts' as needed
    }, [maxPosts]);
    // GSAP animations for SVG and staggered elements
    useEffect(() => {
        if (!svgReady)
            return;
        const masterTimeline = gsap.timeline();
        // SVG Path Animation
        masterTimeline
            .to("#revealPath", {
            attr: { d: "M0,502S175,272,500,272s500,230,500,230V0H0Z" },
            duration: 0.75,
            ease: "Power1.easeIn"
        })
            .to("#revealPath", {
            attr: { d: "M0,2S175,1,500,1s500,1,500,1V0H0Z" },
            duration: 0.5,
            ease: "power1.easeOut"
        });
        // ScrollTrigger animations
        ['.st1', '.st2'].forEach(selector => {
            gsap.fromTo(selector, { scale: 0 }, {
                scale: 1,
                duration: 1,
                stagger: 0.1,
                ease: 'elastic.out(1, 0.3)',
                scrollTrigger: {
                    trigger: selector,
                    start: "top bottom", // start the animation when "top" of the element hits "bottom" of the viewport
                    end: "bottom top",
                    toggleActions: "restart none none none"
                }
            });
        });
        // Regular GSAP Animations for .st3 and .st4
        masterTimeline.fromTo('.st3', { opacity: 0, y: -50 }, { opacity: 1, y: 0, duration: 0.1, stagger: 0.1 }, "-=0.25");
        masterTimeline.fromTo('.st4', { scale: 0 }, { scale: 1, duration: 1, stagger: 0.1, ease: 'elastic.out(1, 0.3)' }, "-=0.5");
        // ...rest of your code
    }, []);
    return (_jsxs(_Fragment, { children: [_jsxs(Helmet, { children: [_jsx("title", { children: pageTitle }), _jsx("meta", { name: "description", content: pageDescription }), _jsx("link", { rel: "canonical", href: canonicalUrl }), _jsx("meta", { property: "og:title", content: pageTitle }), _jsx("meta", { property: "og:description", content: pageDescription }), _jsx("meta", { property: "og:image", content: ogImage }), _jsx("meta", { property: "og:image:width", content: "1200" }), _jsx("meta", { property: "og:image:height", content: "630" }), _jsx("meta", { property: "og:url", content: canonicalUrl }), _jsx("meta", { property: "og:type", content: "website" }), _jsx("meta", { name: "twitter:card", content: "summary_large_image" }), _jsx("meta", { name: "twitter:title", content: pageTitle }), _jsx("meta", { name: "twitter:description", content: pageDescription }), _jsx("meta", { name: "twitter:image", content: ogImage }), _jsx("meta", { name: "twitter:image:alt", content: "Logitech Event Booth & Chair Renders" }), _jsx("link", { rel: "preconnect", href: "https://d1cazymewvlm0k.cloudfront.net" }), _jsx("link", { rel: "dns-prefetch", href: "https://d1cazymewvlm0k.cloudfront.net" }), _jsx("script", { type: "application/ld+json", children: JSON.stringify(structuredData) })] }), _jsx("div", { className: "svg-overlay", children: _jsx("svg", { viewBox: "0 0 1000 1000", preserveAspectRatio: "none", children: _jsx("path", { id: "revealPath", d: "M0,1005S175,995,500,995s500,5,500,5V0H0Z" }) }) }), _jsxs("div", { className: "works", children: [_jsx("div", { className: "workpage-heading", children: _jsx(InlineSvg, { src: "https://d2qb21tb4meex0.cloudfront.net/svg/logitech/logitechheader.svg", onReady: () => setSvgReady(true) }) }), _jsxs("div", { className: "rendering-layout", children: [_jsx(InlineSvg, { src: "https://d2qb21tb4meex0.cloudfront.net/svg/logitech/row0.svg", className: "rendering-row", onReady: () => setSvgReady(true) }), _jsx(InlineSvg, { src: "https://d2qb21tb4meex0.cloudfront.net/svg/logitech/row1.svg", className: "rendering-row" }), _jsx("div", { className: "rendering-row-img", children: _jsx("div", { className: "img-container", style: { overflow: 'hidden', borderRadius: '20px' }, children: _jsxs("video", { style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px' }, loop: true, autoPlay: true, muted: true, playsInline: true, children: [_jsx("source", { src: "https://d1cazymewvlm0k.cloudfront.net/21-Logitech/00.mp4", type: "video/mp4" }), "Your browser does not support the video tag."] }) }) }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d1cazymewvlm0k.cloudfront.net/21-Logitech/00.jpg", loading: "lazy", alt: "Logitech image", style: { width: '100%', height: '100%', objectFit: 'cover', } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d1cazymewvlm0k.cloudfront.net/21-Logitech/01.jpg", loading: "lazy", alt: "Logitech image", style: { width: '100%', height: '100%', objectFit: 'cover', } }) })] }), _jsxs("div", { className: "grid-container-gca", style: { gridTemplateColumns: '0.6fr 0.4fr', padding: '0.25vw' }, children: [_jsxs("div", { className: "column-gca", children: [_jsxs("div", { className: "top-row content-item", children: [" ", _jsx("img", { src: "https://d1cazymewvlm0k.cloudfront.net/21-Logitech/02.jpg", loading: "lazy", alt: "Ghost-Circus-Apparel Image", width: "100%", height: "100%" })] }), _jsxs("div", { className: "bottom-row-gca content-item", children: [" ", _jsx("img", { src: "https://d1cazymewvlm0k.cloudfront.net/21-Logitech/03.jpg", loading: "lazy", alt: "Ghost-Circus-Apparel Image", width: "100%", height: "100%" })] })] }), _jsx("div", { className: "full-height-column-gca content-item", children: _jsx("img", { src: "https://d1cazymewvlm0k.cloudfront.net/21-Logitech/04.jpg", loading: "lazy", alt: "Ghost-Circus-Apparel Image", width: "100%", height: "100%" }) })] }), _jsxs("div", { className: "grid-container-gca second-grid-gca", style: { gridTemplateColumns: '0.4fr 0.6fr', padding: '0.25vw' }, children: [_jsx("div", { className: "full-height-column-gca content-item", children: _jsx("img", { src: "https://d1cazymewvlm0k.cloudfront.net/21-Logitech/05.jpg", loading: "lazy", alt: "Ghost-Circus-Apparel Image", width: "100%", height: "100%" }) }), _jsxs("div", { className: "column-gca", children: [_jsxs("div", { className: "top-row-gca content-item", children: [" ", _jsx("img", { src: "https://d1cazymewvlm0k.cloudfront.net/21-Logitech/06.jpg", loading: "lazy", alt: "Ghost-Circus-Apparel Image", width: "100%", height: "100%" })] }), _jsxs("div", { className: "bottom-row-gca content-item", children: [" ", _jsx("img", { src: "https://d1cazymewvlm0k.cloudfront.net/21-Logitech/07.jpg", loading: "lazy", alt: "Ghost-Circus-Apparel Image", width: "100%", height: "100%" })] })] })] }), _jsx(InlineSvg, { src: "https://d2qb21tb4meex0.cloudfront.net/svg/logitech/row2.svg", className: "rendering-row" }), _jsx("div", { className: "rendering-row-img", children: _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d1cazymewvlm0k.cloudfront.net/21-Logitech/08.jpg", loading: "lazy", alt: "Logitech image", style: { width: '100%', height: '100%', objectFit: 'cover', } }) }) }), _jsx(InlineSvg, { src: "https://d2qb21tb4meex0.cloudfront.net/svg/logitech/row3.svg", className: "rendering-row" }), _jsx("div", { className: "rendering-row-img", children: _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d1cazymewvlm0k.cloudfront.net/21-Logitech/09.jpg", loading: "lazy", alt: "Logitech image", style: { width: '100%', height: '100%', objectFit: 'cover', } }) }) }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d1cazymewvlm0k.cloudfront.net/21-Logitech/10.jpg", loading: "lazy", alt: "Logitech image", style: { width: '100%', height: '100%', objectFit: 'cover', } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d1cazymewvlm0k.cloudfront.net/21-Logitech/11.jpg", loading: "lazy", alt: "Logitech image", style: { width: '100%', height: '100%', objectFit: 'cover', } }) })] }), _jsx("div", { className: "rendering-row-img", children: _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d1cazymewvlm0k.cloudfront.net/21-Logitech/12.jpg", loading: "lazy", alt: "Logitech image", style: { width: '100%', height: '100%', objectFit: 'cover', } }) }) }), _jsx("div", { className: "rendering-row-img", children: _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d1cazymewvlm0k.cloudfront.net/21-Logitech/13.jpg", loading: "lazy", alt: "Logitech image", style: { width: '100%', height: '100%', objectFit: 'cover', } }) }) }), _jsx(InlineSvg, { src: "https://d2qb21tb4meex0.cloudfront.net/svg/logitech/row4.svg", className: "rendering-row" })] }), _jsx("div", { className: "rendering-layout" }), _jsx("div", { className: "rendering-layout", children: _jsx("div", { className: "works-titles", children: displayedWorks.map((work, index) => (_jsx("div", { className: "blog-title-container", ref: (el) => {
                                    if (el && !worksRefs.current.includes(el)) { // Only add if it's a new element
                                        worksRefs.current[index] = el;
                                    }
                                }, children: _jsx(BlogPostButton, { post: work }) }, index))) }) }), _jsxs("div", { className: "rendering-infosection", children: [_jsx(InfoSection, {}), _jsx("hr", { style: { opacity: "1", color: "fff", height: "2px", backgroundColor: "#fff", margin: "0.5rem", } }), _jsx("div", { className: "single-ticker-section", children: _jsx(SingleTicker, {}) })] })] })] }));
};
export default Logitech;
