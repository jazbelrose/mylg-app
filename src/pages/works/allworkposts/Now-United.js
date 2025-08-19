import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import "./style.css";
import ReactModal from "react-modal";
import { useScrollContext } from "../../../app/contexts/ScrollContext";
import { Helmet, HelmetProvider } from "react-helmet-async";
import works from '../works.json';
import BlogPostButton from "../../../components/blogpostbutton/BlogPostButton.js";
import { useData } from "../../../app/contexts/DataProvider";
import Ticker from "../../../components/ticker/index.js";
import { InfoSection } from "../../../components/infosection/index.js";
import SingleTicker from "../../../components/singleticker/index.js";
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import InlineSvg from "../../../components/inlinesvg/index.js";
const Barebells = () => {
    const pageTitle = "Complete Logo Rebrand for Now United | Creative by Mokibaby, Artwork by MYLG!";
    const pageDescription = "Discover the complete logo rebrand for Now United, designed by Mokibaby and crafted by MYLG!. A stunning transformation with creative visuals and digital artwork.";
    const canonicalUrl = "https://mylg.studio/works/Now-United";
    const ogImage = "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/033.png";
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        "name": "Now United Logo Rebrand",
        "description": "A comprehensive logo rebrand project for Now United, featuring custom creative designs by Mokibaby and digital artwork by MYLG!.",
        "image": ogImage,
        "creator": {
            "@type": "Organization",
            "name": "*MYLG!*",
            "url": "https://mylg.studio"
        },
        "about": "Logo Rebrand, Creative Design, Digital Artwork"
    };
    let worksRefs = useRef([]);
    const maxPosts = 16;
    const [displayedWorks, setDisplayedWorks] = useState([]);
    useEffect(() => {
        console.log("Current worksRefs:", worksRefs.current);
    }, [displayedWorks]);
    // Function to shuffle an array
    const shuffleArray = (array) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };
    useEffect(() => {
        // Shuffle all works and select the first 16
        const shuffledWorks = shuffleArray(works).slice(0, 16);
        setDisplayedWorks(shuffledWorks);
    }, []);
    const images = [
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/001.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/007.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/008.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/006_01.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/009.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/010.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/011.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/012.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/013.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/014.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/015.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/016.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/016_1.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/020_01.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/020_02.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/020_03.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/020_04.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/020_05.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/020_06.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/020_07.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/020_08.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/020_09.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/020_10.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/020_11.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/020_12.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/022_01.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/022_02.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/022_03.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/022_04.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/022_05.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/022_06.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/022_07.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/022_08.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/022_09.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/024.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/026_1.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/027.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/030.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/031.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/032.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/033.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/034_01.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/035.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/036.png",
        "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/037.png",
    ];
    const { opacity } = useData();
    const opacityClass = opacity === 1 ? 'opacity-high' : 'opacity-low';
    const { isHeaderVisible, updateHeaderVisibility } = useScrollContext();
    const [isModalOpen, setModalOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [touchStart, setTouchStart] = useState(0);
    const [touchEnd, setTouchEnd] = useState(0);
    const [prevScrollPos, setPrevScrollPos] = useState(0);
    const [svgReady, setSvgReady] = useState(false);
    let isTransitioning = false;
    const nextImage = () => {
        if (isTransitioning)
            return; // Prevent multiple triggers
        isTransitioning = true;
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
        setTimeout(() => {
            isTransitioning = false;
        }, 300); // Delay matches the animation duration
    };
    const prevImage = () => {
        if (isTransitioning)
            return; // Prevent multiple triggers
        isTransitioning = true;
        setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
        setTimeout(() => {
            isTransitioning = false;
        }, 300); // Delay matches the animation duration
    };
    const openModal = (index) => {
        setCurrentIndex(index);
        setModalOpen(true);
    };
    const closeModal = () => {
        setModalOpen(false);
    };
    const handleWindowScroll = () => {
        const currentScrollPos = window.scrollY;
        if (currentScrollPos <= 5) {
            updateHeaderVisibility(true);
        }
        else {
            const isScrollingUp = prevScrollPos > currentScrollPos;
            updateHeaderVisibility(isScrollingUp);
        }
        setPrevScrollPos(currentScrollPos);
    };
    const handleTouchStart = e => {
        setTouchStart(e.touches[0].clientX);
    };
    const handleTouchMove = (e) => {
        setTouchEnd(e.touches[0].clientX);
    };
    const handleTouchEnd = () => {
        if (touchStart === 0 || touchEnd === 0)
            return;
        const delta = touchStart - touchEnd;
        const swipeThreshold = 50; // Minimum swipe distance in px
        if (Math.abs(delta) > swipeThreshold) {
            if (delta > 0) {
                nextImage();
            }
            else {
                prevImage();
            }
        }
        setTouchStart(0);
        setTouchEnd(0);
    };
    // Arrow navigation for modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "ArrowRight") {
                nextImage();
            }
            else if (e.key === "ArrowLeft") {
                prevImage();
            }
            else if (e.key === "Escape") {
                closeModal();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);
    // Prevent scrolling when modal is open
    useEffect(() => {
        const preventDefault = (e) => e.preventDefault();
        if (isModalOpen) {
            document.body.classList.add('no-scroll');
            document.addEventListener('touchmove', preventDefault, { passive: false });
        }
        else {
            document.body.classList.remove('no-scroll');
            document.removeEventListener('touchmove', preventDefault);
        }
        return () => {
            document.body.classList.remove('no-scroll');
            document.removeEventListener('touchmove', preventDefault);
        };
    }, [isModalOpen]);
    // Toggle header visibility based on scroll direction
    useEffect(() => {
        window.addEventListener("scroll", handleWindowScroll);
        return () => window.removeEventListener("scroll", handleWindowScroll);
    }, [prevScrollPos]);
    // Disable body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = isModalOpen ? "hidden" : "";
        return () => (document.body.style.overflow = "");
    }, [isModalOpen]);
    // GSAP animations for SVG and staggered elements
    useEffect(() => {
        if (!svgReady)
            return;
        const ctx = gsap.context(() => {
            const masterTimeline = gsap.timeline();
            // SVG Path Animation
            masterTimeline.to("#revealPath", {
                attr: {
                    d: "M0,502S175,272,500,272s500,230,500,230V0H0Z"
                },
                duration: 0.75,
                ease: "Power1.easeIn"
            }).to("#revealPath", {
                attr: {
                    d: "M0,2S175,1,500,1s500,1,500,1V0H0Z"
                },
                duration: 0.5,
                ease: "power1.easeOut"
            });
            // Staggered Animations for SVG Elements
            masterTimeline.fromTo('.st1', {
                opacity: 0,
                y: -50
            }, {
                opacity: 1,
                y: 0,
                duration: 0.1,
                stagger: 0.1
            }, "-=0.25");
            masterTimeline.fromTo('.st2', {
                scale: 0
            }, {
                scale: 1,
                duration: 1,
                stagger: 0.1,
                ease: 'elastic.out(1, 0.3)'
            }, "-=0.5");
        });
        return () => ctx.revert(); // Cleanup on component unmount
    }, [svgReady]);
    // Play/pause videos based on visibility using Intersection Observer
    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const video = entry.target;
                if (entry.isIntersecting) {
                    video.play();
                }
                else {
                    video.pause();
                }
            });
        });
        const videos = document.querySelectorAll('video');
        videos.forEach(video => observer.observe(video));
        return () => {
            observer.disconnect(); // Clean up observer
        };
    }, []);
    return (_jsxs(_Fragment, { children: [_jsxs(Helmet, { children: [_jsx("title", { children: pageTitle }), _jsx("meta", { name: "description", content: pageDescription }), _jsx("link", { rel: "canonical", href: canonicalUrl }), _jsx("meta", { property: "og:title", content: pageTitle }), _jsx("meta", { property: "og:description", content: pageDescription }), _jsx("meta", { property: "og:image", content: ogImage }), _jsx("meta", { property: "og:image:width", content: "1200" }), _jsx("meta", { property: "og:image:height", content: "630" }), _jsx("meta", { property: "og:url", content: canonicalUrl }), _jsx("meta", { property: "og:type", content: "website" }), _jsx("meta", { name: "twitter:card", content: "summary_large_image" }), _jsx("meta", { name: "twitter:title", content: pageTitle }), _jsx("meta", { name: "twitter:description", content: pageDescription }), _jsx("meta", { name: "twitter:image", content: ogImage }), _jsx("meta", { name: "twitter:image:alt", content: "Now United Logo Rebrand" }), _jsx("link", { rel: "preconnect", href: "https://d2qb21tb4meex0.cloudfront.net" }), _jsx("link", { rel: "dns-prefetch", href: "https://d2qb21tb4meex0.cloudfront.net" }), _jsx("script", { type: "application/ld+json", children: JSON.stringify(structuredData) })] }), _jsxs("div", { className: `${opacityClass} ${isModalOpen ? 'no-scroll' : ''}`, children: [_jsx("div", { className: "svg-overlay", children: _jsx("svg", { viewBox: "0 0 1000 1000", width: "100%", height: "100%", preserveAspectRatio: "none", children: _jsx("path", { id: "revealPath", d: "M0,1005S175,995,500,995s500,5,500,5V0H0Z" }) }) }), _jsx("div", { className: "workpage-heading", children: _jsx(InlineSvg, { src: "https://d2qb21tb4meex0.cloudfront.net/svg/Now-United/Now-united-header.svg", onReady: () => setSvgReady(true) }) }), _jsxs("div", { className: "rendering-layout", style: { overflow: 'visible' }, children: [_jsx("div", { className: "rendering-row-img", children: _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/001.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(0) }) }) }), _jsx(InlineSvg, { src: "https://d2qb21tb4meex0.cloudfront.net/svg/Now-United/row1.svg", className: "rendering-row" }), _jsx(InlineSvg, { src: "https://d2qb21tb4meex0.cloudfront.net/svg/Now-United/row2.svg", className: "rendering-row" }), _jsx(InlineSvg, { src: "https://d2qb21tb4meex0.cloudfront.net/svg/Now-United/row3.svg", className: "rendering-row", style: { paddingTop: '20px', paddingLeft: '5px' } }), _jsx("div", { className: "masonry-wrapper", children: _jsxs("div", { className: "masonry-nu", children: [_jsxs("div", { className: "masonry-column", children: [_jsxs("video", { loop: true, autoPlay: true, muted: true, playsInline: true, children: [_jsx("source", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/003_03.mp4", type: "video/mp4" }), "Your browser does not support the video tag."] }), _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/007.png", loading: "lazy", alt: "Now-United Image", onClick: () => openModal(1), style: { cursor: 'pointer' } })] }), _jsxs("div", { className: "masonry-column", children: [_jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/006_04.png", loading: "lazy", alt: "Now-United Image", onClick: () => openModal(3), style: {
                                                        boxSizing: 'border-box',
                                                        width: '100%',
                                                        height: 'auto',
                                                        cursor: 'pointer',
                                                    } }), _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/008_03.png", loading: "lazy", alt: "Now-United Image", onClick: () => openModal(2), style: { cursor: 'pointer' } })] })] }) }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/009.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(4) }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/010.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(5) }) })] }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/011.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(6) }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/012.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(7) }) })] }), _jsxs("div", { className: "masonry", children: [_jsxs("div", { className: "masonry-column", children: [_jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/013.png", loading: "lazy", alt: "Now-United Image", onClick: () => openModal(8), style: { cursor: "pointer" } }), _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/015.png", loading: "lazy", alt: "Now-United Image", onClick: () => openModal(10), style: { cursor: "pointer" } })] }), _jsxs("div", { className: "masonry-column", children: [_jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/014.png", loading: "lazy", alt: "Now-United Image", onClick: () => openModal(9), style: { cursor: "pointer" } }), _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/016.png", loading: "lazy", alt: "Now-United Image", onClick: () => openModal(11), style: { cursor: "pointer" } })] })] }), _jsx(InlineSvg, { src: "https://d2qb21tb4meex0.cloudfront.net/svg/Now-United/row4.svg", className: "rendering-row", style: { paddingTop: '20px', paddingLeft: '5px' } }), _jsx("div", { className: "rendering-row-img", children: _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/016_1.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(12) }) }) }), _jsx(InlineSvg, { src: "https://d2qb21tb4meex0.cloudfront.net/svg/Now-United/row5.svg", className: "rendering-row", style: { paddingTop: '20px', paddingLeft: '5px' } }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/020_01.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(13) }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/020_02.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(14) }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/020_03.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(15) }) })] }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/020_04.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(16) }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/020_05.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(17) }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/020_06.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(18) }) })] }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/020_07.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(19) }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/020_08.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(20) }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/020_09.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(21) }) })] }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/020_10.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(22) }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/020_11.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(23) }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/020_12.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(24) }) })] }), _jsx(InlineSvg, { src: "https://d2qb21tb4meex0.cloudfront.net/svg/Now-United/row6.svg", className: "rendering-row", style: { paddingTop: '20px', paddingLeft: '5px' } }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/022_01.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(25) }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/022_03.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(26) }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/022_02.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(27) }) })] }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/022_04.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(28) }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/022_05.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(29) }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/022_06.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(30) }) })] }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/022_07.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(31) }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/022_08.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(32) }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/022_09.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(33) }) })] }), _jsx(InlineSvg, { src: "https://d2qb21tb4meex0.cloudfront.net/svg/Now-United/row7.svg", className: "rendering-row", style: { paddingTop: '20px', paddingLeft: '5px' } }), _jsx("div", { className: "rendering-row-img", children: _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/024.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(34) }) }) }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container", children: _jsx("video", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/004.mp4", loop: true, autoPlay: true, muted: true, playsInline: true, style: {
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                borderRadius: '20px',
                                                cursor: 'pointer',
                                            } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/026_1.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(35) }) })] }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/027.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(36) }) }), _jsx("div", { className: "img-container", children: _jsx("video", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/001.mp4", loop: true, autoPlay: true, muted: true, playsInline: true, style: {
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                borderRadius: '20px',
                                                cursor: 'pointer',
                                            } }) })] }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container", children: _jsx("video", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/002.mp4", loop: true, autoPlay: true, muted: true, playsInline: true, style: {
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                borderRadius: '20px',
                                                cursor: 'pointer',
                                            } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/030.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(37) }) })] }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/031.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(38) }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/032.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(39) }) })] }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/033.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(40) }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/034_01.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(41) }) })] }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/035.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(42) }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/036.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(43) }) })] }), _jsx("div", { className: "rendering-row-img", children: _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/50-Now-United/037.png", alt: "Now-United Image", style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }, onClick: () => openModal(44) }) }) })] }), _jsx("div", { className: "rendering-layout" }), _jsx("div", { className: "rendering-layout", children: _jsx("div", { className: "works-titles", children: displayedWorks.map((work, index) => (_jsx("div", { className: "blog-title-container", ref: (el) => {
                                    if (el && !worksRefs.current.includes(el)) { // Only add if it's a new element
                                        worksRefs.current[index] = el;
                                    }
                                }, children: _jsx(BlogPostButton, { post: work }) }, index))) }) }), _jsxs("div", { className: "rendering-infosection", children: [_jsx(InfoSection, {}), _jsx("hr", { style: { opacity: "1", color: "fff", height: "2px", backgroundColor: "#fff", margin: "0.5rem", } }), _jsx("div", { className: "single-ticker-section", children: _jsx(SingleTicker, {}) })] }), _jsx(ReactModal, { isOpen: isModalOpen, onRequestClose: closeModal, className: "modal-content", overlayClassName: "modal", ariaHideApp: false, children: _jsx("div", { className: "modal-content", onTouchStart: handleTouchStart, onTouchMove: handleTouchMove, onTouchEnd: handleTouchEnd, children: _jsx("img", { src: images[currentIndex], alt: `Image ${currentIndex}`, className: "modal-image" }) }) })] })] }));
};
export default Barebells;
