import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import "./style.css";
import { Helmet, HelmetProvider } from "react-helmet-async";
import ReactModal from "react-modal";
import { useScrollContext } from "../../../app/contexts/ScrollContext";
import Ticker from "../../../components/ticker/index.js";
import { InfoSection } from "../../../components/infosection/index.js";
import SingleTicker from "../../../components/singleticker/index.js";
import { useData } from "../../../app/contexts/DataProvider";
import InlineSvg from "../../../components/inlinesvg/index.js";
const ElfMakeUpHollywoodBowl = () => {
    const pageTitle = "Elf Makeup at Hollywood Bowl - We Can Survive Event";
    const pageDescription = "Discover e.l.f. Cosmetics' memorable activation at the We Can Survive concert, hosted at the Hollywood Bowl, with remarkable performances by Alanis Morissette, Halsey, Weezer, and more. A captivating evening supporting mental health awareness.";
    const canonicalUrl = "https://mylg.studio/works/elf-Makeup-Hollywood-Bowl";
    const ogImage = "https://d1cazymewvlm0k.cloudfront.net/10-elf+Makeup+hollywood+bowl/og-image.jpg";
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "Event",
        "name": "Elf Makeup at Hollywood Bowl - We Can Survive Event",
        "description": pageDescription,
        "startDate": "2022-10-22",
        "location": {
            "@type": "Place",
            "name": "Hollywood Bowl",
            "address": {
                "@type": "PostalAddress",
                "streetAddress": "2301 N Highland Ave",
                "addressLocality": "Los Angeles",
                "addressRegion": "CA",
                "postalCode": "90068",
                "addressCountry": "US",
            },
        },
        "organizer": {
            "@type": "Organization",
            "name": "Audacy",
        },
        "performer": [
            { "@type": "MusicGroup", "name": "Alanis Morissette" },
            { "@type": "MusicGroup", "name": "Halsey" },
            { "@type": "MusicGroup", "name": "Weezer" },
            { "@type": "MusicGroup", "name": "OneRepublic" },
            { "@type": "MusicGroup", "name": "Garbage" },
            { "@type": "MusicGroup", "name": "Tate McRae" },
        ],
        "image": ogImage,
        "url": canonicalUrl,
        "about": {
            "@type": "Thing",
            "name": "Mental Health Awareness",
            "description": "The event supports mental health awareness in partnership with the American Foundation for Suicide Prevention.",
        },
    };
    const tickerLines = [
        "DESIGN BY MOKIBABY ",
        "e.l.f MAKEUP HOLLYWOOD BOWL ",
        "DIGITAL ART BY *MYLG!* "
    ];
    const images = [
        "https://d1cazymewvlm0k.cloudfront.net/10-elf+Makeup+hollywood+bowl/02.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/10-elf+Makeup+hollywood+bowl/03.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/10-elf+Makeup+hollywood+bowl/04.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/10-elf+Makeup+hollywood+bowl/05.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/10-elf+Makeup+hollywood+bowl/06.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/10-elf+Makeup+hollywood+bowl/07.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/10-elf+Makeup+hollywood+bowl/08.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/10-elf+Makeup+hollywood+bowl/09.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/10-elf+Makeup+hollywood+bowl/10.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/10-elf+Makeup+hollywood+bowl/11.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/10-elf+Makeup+hollywood+bowl/12.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/10-elf+Makeup+hollywood+bowl/13.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/10-elf+Makeup+hollywood+bowl/14.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/10-elf+Makeup+hollywood+bowl/15.jpg"
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
    return (_jsxs(_Fragment, { children: [_jsxs(Helmet, { children: [_jsx("title", { children: pageTitle }), _jsx("meta", { name: "description", content: pageDescription }), _jsx("link", { rel: "canonical", href: canonicalUrl }), _jsx("meta", { property: "og:title", content: pageTitle }), _jsx("meta", { property: "og:description", content: pageDescription }), _jsx("meta", { property: "og:image", content: ogImage }), _jsx("meta", { property: "og:image:width", content: "1200" }), _jsx("meta", { property: "og:image:height", content: "630" }), _jsx("meta", { property: "og:url", content: canonicalUrl }), _jsx("meta", { property: "og:type", content: "event" }), _jsx("meta", { name: "twitter:card", content: "summary_large_image" }), _jsx("meta", { name: "twitter:title", content: pageTitle }), _jsx("meta", { name: "twitter:description", content: pageDescription }), _jsx("meta", { name: "twitter:image", content: ogImage }), _jsx("meta", { name: "twitter:image:alt", content: "Elf Makeup activation at We Can Survive event" }), _jsx("link", { rel: "preconnect", href: "https://d1cazymewvlm0k.cloudfront.net" }), _jsx("link", { rel: "dns-prefetch", href: "https://d1cazymewvlm0k.cloudfront.net" }), _jsx("script", { type: "application/ld+json", children: JSON.stringify(structuredData) })] }), _jsxs("div", { className: `${opacityClass} ${isModalOpen ? 'no-scroll' : ''}`, children: [_jsx("div", { className: "svg-overlay", children: _jsx("svg", { viewBox: "0 0 1000 1000", preserveAspectRatio: "none", children: _jsx("path", { id: "revealPath", d: "M0,1005S175,995,500,995s500,5,500,5V0H0Z" }) }) }), _jsx("div", { className: "workpage-heading", children: _jsx(InlineSvg, { src: "https://d2qb21tb4meex0.cloudfront.net/svg/elf-makeup-hollywood-bowl/elfmakeuphollywoodbowlheader.svg", onReady: () => setSvgReady(true) }) }), _jsxs("div", { className: "rendering-layout", children: [_jsx(InlineSvg, { src: "https://d2qb21tb4meex0.cloudfront.net/svg/elf-makeup-hollywood-bowl/row0.svg", className: "rendering-row" }), _jsx(InlineSvg, { src: "https://d2qb21tb4meex0.cloudfront.net/svg/elf-makeup-hollywood-bowl/row1.svg", className: "rendering-row" }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d1cazymewvlm0k.cloudfront.net/10-elf+Makeup+hollywood+bowl/02.jpg", loading: "lazy", alt: "Elf Make Up Hollywood Bowl Image", width: "100%", height: "100%", onClick: () => openModal(0), style: { cursor: "pointer" } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d1cazymewvlm0k.cloudfront.net/10-elf+Makeup+hollywood+bowl/03.jpg", loading: "lazy", alt: "Elf Make Up Hollywood Bowl Image", width: "100%", height: "100%", onClick: () => openModal(1), style: { cursor: "pointer" } }) })] }), _jsx("div", { className: "rendering-row-img", children: _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d1cazymewvlm0k.cloudfront.net/10-elf+Makeup+hollywood+bowl/04.jpg", loading: "lazy", alt: "Elf Make Up Hollywood Bowl Image", width: "100%", height: "100%", onClick: () => openModal(2), style: { cursor: "pointer" } }) }) }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d1cazymewvlm0k.cloudfront.net/10-elf+Makeup+hollywood+bowl/05.jpg", loading: "lazy", alt: "Elf Make Up Hollywood Bowl Image", width: "100%", height: "100%", onClick: () => openModal(3), style: { cursor: "pointer" } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d1cazymewvlm0k.cloudfront.net/10-elf+Makeup+hollywood+bowl/06.jpg", loading: "lazy", alt: "Elf Make Up Hollywood Bowl Image", width: "100%", height: "100%", onClick: () => openModal(4), style: { cursor: "pointer" } }) })] }), _jsxs("div", { className: "grid-container-gca second-grid-gca", style: { gridTemplateColumns: '0.7fr 0.3fr', padding: '0.25vw' }, children: [_jsx("div", { className: "full-height-column-gca content-item", children: _jsx("img", { src: "https://d1cazymewvlm0k.cloudfront.net/10-elf+Makeup+hollywood+bowl/07.jpg", loading: "lazy", alt: "Elf Make Up Hollywood Bowl Image", width: "100%", height: "100%", onClick: () => openModal(5), style: { cursor: "pointer" } }) }), _jsxs("div", { className: "column-gca", children: [_jsxs("div", { className: "top-row-gca content-item", children: [" ", _jsx("img", { src: "https://d1cazymewvlm0k.cloudfront.net/10-elf+Makeup+hollywood+bowl/08.jpg", loading: "lazy", alt: "Elf Make Up Hollywood Bowl Image", width: "100%", onClick: () => openModal(6), style: { cursor: "pointer" } })] }), _jsxs("div", { className: "bottom-row-gca content-item", children: [" ", _jsx("img", { src: "https://d1cazymewvlm0k.cloudfront.net/10-elf+Makeup+hollywood+bowl/09.jpg", loading: "lazy", alt: "Elf Make Up Hollywood Bowl Image", width: "100%", onClick: () => openModal(7), style: { cursor: "pointer" } })] })] })] }), _jsx(InlineSvg, { src: "https://d2qb21tb4meex0.cloudfront.net/svg/elf-makeup-hollywood-bowl/row2.svg", className: "rendering-row" }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d1cazymewvlm0k.cloudfront.net/10-elf+Makeup+hollywood+bowl/10.jpg", loading: "lazy", alt: "Elf Make Up Hollywood Bowl Image", width: "100%", height: "100%", onClick: () => openModal(8), style: { cursor: "pointer" } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d1cazymewvlm0k.cloudfront.net/10-elf+Makeup+hollywood+bowl/11.jpg", loading: "lazy", alt: "Elf Make Up Hollywood Bowl Image", width: "100%", height: "100%", onClick: () => openModal(9), style: { cursor: "pointer" } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d1cazymewvlm0k.cloudfront.net/10-elf+Makeup+hollywood+bowl/12.jpg", loading: "lazy", alt: "Elf Make Up Hollywood Bowl Image", width: "100%", height: "100%", onClick: () => openModal(10), style: { cursor: "pointer" } }) })] }), _jsxs("div", { className: "rendering-row-img", style: { paddingBottom: '5vh' }, children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d1cazymewvlm0k.cloudfront.net/10-elf+Makeup+hollywood+bowl/13.jpg", loading: "lazy", alt: "Elf Make Up Hollywood Bowl Image", width: "100%", height: "100%", onClick: () => openModal(11), style: { cursor: "pointer" } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d1cazymewvlm0k.cloudfront.net/10-elf+Makeup+hollywood+bowl/14.jpg", loading: "lazy", alt: "Elf Make Up Hollywood Bowl Image", width: "100%", height: "100%", onClick: () => openModal(12), style: { cursor: "pointer" } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d1cazymewvlm0k.cloudfront.net/10-elf+Makeup+hollywood+bowl/15.jpg", loading: "lazy", alt: "Elf Make Up Hollywood Bowl Image", width: "100%", height: "100%", onClick: () => openModal(13), style: { cursor: "pointer" } }) })] })] }), _jsx("hr", { style: { opacity: "1", color: "fff", height: "2px", backgroundColor: "#fff", margin: "0.5rem", } }), _jsx("div", { className: "rendering-ticker-section", children: _jsx(Ticker, { lines: tickerLines }) }), _jsx("hr", { style: { opacity: "1", color: "fff", height: "2px", backgroundColor: "#fff", margin: "0.5rem", } }), _jsx("div", { className: "rendering-layout" }), _jsxs("div", { className: "rendering-infosection", children: [_jsx(InfoSection, {}), _jsx("hr", { style: { opacity: "1", color: "fff", height: "2px", backgroundColor: "#fff", margin: "0.5rem", } }), _jsx("div", { className: "single-ticker-section", children: _jsx(SingleTicker, {}) })] }), _jsx(ReactModal, { isOpen: isModalOpen, onRequestClose: closeModal, className: "modal-content", overlayClassName: "modal", ariaHideApp: false, children: _jsx("div", { className: "modal-content", onTouchStart: handleTouchStart, onTouchMove: handleTouchMove, onTouchEnd: handleTouchEnd, children: _jsx("img", { src: images[currentIndex], alt: `Image ${currentIndex}`, className: "modal-image" }) }) })] })] }));
};
export default ElfMakeUpHollywoodBowl;
