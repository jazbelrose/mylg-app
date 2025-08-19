import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useRef, useEffect, useState } from "react";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { gsap } from "gsap";
import "./style.css";
import ReactModal from "react-modal";
import { useScrollContext } from "../../../app/contexts/ScrollContext";
import InlineSvg from "../../../components/inlinesvg/index.jsx";
import { InfoSection } from "../../../components/infosection/index.js";
import SingleTicker from "../../../components/singleticker/index.jsx";
import { useData } from "../../../app/contexts/DataProvider";
const MZ = () => {
    const images = [
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/00.png",
        null,
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/02.png",
        null,
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/04.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/05.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/06.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/07.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/08.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/09.png",
        null,
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/11.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/12.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/13.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/14.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/15.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/16.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/17.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/18.png",
        null,
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/20.png",
        null,
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/22.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/23.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/24.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/25_1.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/25_2.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/26.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/27.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/28.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/29.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/30.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/31.png",
        null,
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/33.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/34.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/35.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/36.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/37.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/38.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/39.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/40.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/41.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/42.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/43.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/44.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/45.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/46.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/47.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/48.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/49.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/50.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/51.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/52.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/53.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/54.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/55.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/56.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/57.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/58.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/59.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/60.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/61.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/62.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/63.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/64.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/65.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/66.png",
        "https://d2qb21tb4meex0.cloudfront.net/49-MZ/67.png"
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
        setCurrentIndex((prevIndex) => {
            let newIndex = (prevIndex + 1) % images.length;
            // Skip null values
            while (images[newIndex] === null) {
                newIndex = (newIndex + 1) % images.length;
            }
            return newIndex;
        });
        setTimeout(() => {
            isTransitioning = false;
        }, 300); // Delay matches the animation duration
    };
    const prevImage = () => {
        if (isTransitioning)
            return; // Prevent multiple triggers
        isTransitioning = true;
        setCurrentIndex((prevIndex) => {
            let newIndex = (prevIndex - 1 + images.length) % images.length;
            // Skip null values
            while (images[newIndex] === null) {
                newIndex = (newIndex - 1 + images.length) % images.length;
            }
            return newIndex;
        });
        setTimeout(() => {
            isTransitioning = false;
        }, 300); // Delay matches the animation duration
    };
    const openModal = (index) => {
        if (images[index] === null) {
            // Find the next valid index
            let newIndex = (index + 1) % images.length;
            while (images[newIndex] === null) {
                newIndex = (newIndex + 1) % images.length;
            }
            setCurrentIndex(newIndex);
        }
        else {
            setCurrentIndex(index);
        }
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
    useEffect(() => {
        const ctx = gsap.context(() => {
            const masterTimeline = gsap.timeline();
            // SVG Path Animation
            masterTimeline
                .to("#revealPath", {
                attr: {
                    d: "M0,502S175,272,500,272s500,230,500,230V0H0Z",
                },
                duration: 0.75,
                ease: "Power1.easeIn",
            })
                .to("#revealPath", {
                attr: {
                    d: "M0,2S175,1,500,1s500,1,500,1V0H0Z",
                },
                duration: 0.5,
                ease: "power1.easeOut",
            });
            // Staggered Animations for `.st2`
            masterTimeline.fromTo(".st2", {
                opacity: 0,
                y: -50,
            }, {
                opacity: 1,
                y: 0,
                duration: 0.1,
                stagger: 0.1,
            }, "-=0.25" // Slight overlap with the path animation
            );
            masterTimeline.fromTo(".st2", {
                scale: 0,
            }, {
                scale: 1,
                duration: 1,
                stagger: 0.1,
                ease: "elastic.out(1, 0.3)",
            }, "-=0.5" // Slight overlap with the path animation
            );
            // Animate each `st6` with stagger
            masterTimeline.fromTo("#vector-detail-group--left- .st6", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out", stagger: 0.1 }, "+=0.2" // Start after `.st2` animations
            );
            // Animate each `st5` with stagger
            masterTimeline.fromTo("#vector-detail-group-right-section-1-right .st5", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out", stagger: 0.1 }, "<" // Start at the same time as the left group
            );
            // Subtle scaling for all `st5` and `st6` elements
            masterTimeline.fromTo("g .st6, g .st5", { scale: 0.95 }, { scale: 1, duration: 0.5, ease: "power1.out" }, "-=0.3" // Slight overlap for smoother integration
            );
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
    return (_jsxs(_Fragment, { children: [_jsxs(Helmet, { children: [_jsx("meta", { name: "robots", content: "noindex, nofollow" }), _jsx("title", { children: "Machine Zone - *MYLG!*" })] }), _jsxs("div", { className: `${opacityClass} ${isModalOpen ? 'no-scroll' : ''}`, children: [_jsx("div", { className: "svg-overlay", children: _jsx("svg", { viewBox: "0 0 1000 1000", preserveAspectRatio: "none", children: _jsx("path", { id: "revealPath", d: "M0,1005S175,995,500,995s500,5,500,5V0H0Z" }) }) }), _jsx("div", { className: "workpage-heading", children: _jsx(InlineSvg, { src: "https://d2qb21tb4meex0.cloudfront.net/svg/MZ/mz-header.svg", onReady: () => setSvgReady(true) }) }), _jsxs("div", { className: "rendering-layout", children: [_jsx("div", { className: "rendering-row-img", children: _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/00.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(0), style: {
                                            cursor: "pointer"
                                        } }) }) }), _jsx("div", { className: "rendering-row-img", children: _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/01_01.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%" }) }) }), _jsx(InlineSvg, { src: "https://d2qb21tb4meex0.cloudfront.net/svg/MZ/02.svg", className: "rendering-row", onClick: () => openModal(2), style: { cursor: "pointer" } }), _jsx("div", { className: "rendering-row-img", style: { paddingBottom: "15px" }, children: _jsx("div", { className: "img-container", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/03.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%" }) }) }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/04.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(4), style: {
                                                cursor: "pointer"
                                            } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/05.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(5), style: {
                                                cursor: "pointer"
                                            } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/06.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(6), style: {
                                                cursor: "pointer"
                                            } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/07.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(7), style: {
                                                cursor: "pointer"
                                            } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/08.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(8), style: {
                                                cursor: "pointer"
                                            } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/09.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(9), style: {
                                                cursor: "pointer"
                                            } }) })] }), _jsx("div", { className: "rendering-row-img", style: { paddingBottom: "15px" }, children: _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/10.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%" }) }) }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/11.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(11), style: {
                                                cursor: "pointer"
                                            } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/12.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(12), style: {
                                                cursor: "pointer"
                                            } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/13.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(13), style: {
                                                cursor: "pointer"
                                            } }) })] }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/14.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(14), style: {
                                                cursor: "pointer"
                                            } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/15.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(15), style: {
                                                cursor: "pointer"
                                            } }) })] }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/16.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(16), style: {
                                                cursor: "pointer"
                                            } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/17.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(17), style: {
                                                cursor: "pointer"
                                            } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/18.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(18), style: {
                                                cursor: "pointer"
                                            } }) })] }), _jsx("div", { className: "rendering-row-img", children: _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/19_01.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%" }) }) }), _jsx("div", { className: "rendering-row-img", children: _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/20_01.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(20), style: {
                                            cursor: "pointer"
                                        } }) }) }), _jsx("div", { className: "rendering-row-img", children: _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/21_01.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%" }) }) }), _jsx("div", { className: "rendering-row-img", children: _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/22.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(22), style: {
                                            cursor: "pointer"
                                        } }) }) }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/23.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(23), style: {
                                                cursor: "pointer"
                                            } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/24.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(24), style: {
                                                cursor: "pointer"
                                            } }) })] }), _jsx("div", { className: "rendering-row-img", children: _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/25_1.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(25), style: {
                                            cursor: "pointer"
                                        } }) }) }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/25_2.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(26), style: {
                                                cursor: "pointer"
                                            } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/26.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(27), style: {
                                                cursor: "pointer"
                                            } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/27.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(28), style: {
                                                cursor: "pointer"
                                            } }) })] }), _jsx("div", { className: "rendering-row-img", children: _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/28.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(29), style: {
                                            cursor: "pointer"
                                        } }) }) }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/29.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(30), style: {
                                                cursor: "pointer"
                                            } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/30.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(31), style: {
                                                cursor: "pointer"
                                            } }) })] }), _jsx("div", { className: "rendering-row-img", children: _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/31.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(32), style: {
                                            cursor: "pointer"
                                        } }) }) }), _jsx("div", { className: "rendering-row-img", style: { paddingBottom: "15px" }, children: _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/32_01.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%" }) }) }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/33.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(34), style: {
                                                cursor: "pointer"
                                            } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/34.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(35), style: {
                                                cursor: "pointer"
                                            } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/35.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(36), style: {
                                                cursor: "pointer"
                                            } }) })] }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/36.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(37), style: {
                                                cursor: "pointer"
                                            } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/37.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(38), style: {
                                                cursor: "pointer"
                                            } }) })] }), _jsx("div", { className: "rendering-row-img", children: _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/38.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(39), style: {
                                            cursor: "pointer"
                                        } }) }) }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/39.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(40), style: {
                                                cursor: "pointer"
                                            } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/40.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(41), style: {
                                                cursor: "pointer"
                                            } }) })] }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/41.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(42), style: {
                                                cursor: "pointer"
                                            } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/42.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(43), style: {
                                                cursor: "pointer"
                                            } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/43.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(44), style: {
                                                cursor: "pointer"
                                            } }) })] }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/44.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(45), style: {
                                                cursor: "pointer"
                                            } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/45.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(46), style: {
                                                cursor: "pointer"
                                            } }) })] }), _jsx("div", { className: "rendering-row-img", children: _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/46.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(47), style: {
                                            cursor: "pointer"
                                        } }) }) }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/47.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(48), style: {
                                                cursor: "pointer"
                                            } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/48.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(49), style: {
                                                cursor: "pointer"
                                            } }) })] }), _jsx("div", { className: "rendering-row-img", children: _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/49.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(50), style: {
                                            cursor: "pointer"
                                        } }) }) }), _jsx("div", { className: "rendering-row-img", children: _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/50.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(51), style: {
                                            cursor: "pointer"
                                        } }) }) }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/51.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(52), style: {
                                                cursor: "pointer"
                                            } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/52.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(53), style: {
                                                cursor: "pointer"
                                            } }) })] }), _jsx("div", { className: "rendering-row-img", children: _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/53.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(54), style: {
                                            cursor: "pointer"
                                        } }) }) }), _jsx("div", { className: "rendering-row-img", children: _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/54.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(55), style: {
                                            cursor: "pointer"
                                        } }) }) }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/55.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(56), style: {
                                                cursor: "pointer"
                                            } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/56.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(57), style: {
                                                cursor: "pointer"
                                            } }) })] }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/57.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(58), style: {
                                                cursor: "pointer"
                                            } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/58.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(59), style: {
                                                cursor: "pointer"
                                            } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/59.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(60), style: {
                                                cursor: "pointer"
                                            } }) })] }), _jsx("div", { className: "rendering-row-img", children: _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/60.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(61), style: {
                                            cursor: "pointer"
                                        } }) }) }), _jsx("div", { className: "rendering-row-img", children: _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/61.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(62), style: {
                                            cursor: "pointer"
                                        } }) }) }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/62.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(63), style: {
                                                cursor: "pointer"
                                            } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/63.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(64), style: {
                                                cursor: "pointer"
                                            } }) })] }), _jsx("div", { className: "rendering-row-img", children: _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/64.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(65), style: {
                                            cursor: "pointer"
                                        } }) }) }), _jsxs("div", { className: "rendering-row-img", children: [_jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/65.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(66), style: {
                                                cursor: "pointer"
                                            } }) }), _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/66.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(67), style: {
                                                cursor: "pointer"
                                            } }) })] }), _jsx("div", { className: "rendering-row-img", children: _jsx("div", { className: "img-container ", children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/49-MZ/67.png", loading: "lazy", alt: "MZ Image", width: "100%", height: "100%", onClick: () => openModal(68), style: {
                                            cursor: "pointer"
                                        } }) }) })] }), _jsx("hr", { style: { opacity: "1", color: "fff", height: "2px", backgroundColor: "#fff", margin: "0.5rem", } }), _jsxs("div", { className: "rendering-infosection", children: [_jsx(InfoSection, {}), _jsx("hr", { style: { opacity: "1", color: "fff", height: "2px", backgroundColor: "#fff", margin: "0.5rem", } }), _jsx("div", { className: "single-ticker-section", children: _jsx(SingleTicker, {}) })] }), _jsx(ReactModal, { isOpen: isModalOpen, onRequestClose: closeModal, className: "modal-content", overlayClassName: "modal", ariaHideApp: false, children: _jsx("div", { className: "modal-content", onTouchStart: handleTouchStart, onTouchMove: handleTouchMove, onTouchEnd: handleTouchEnd, children: _jsx("img", { src: images[currentIndex], alt: `Image ${currentIndex}`, className: "modal-image" }) }) })] })] }));
};
export default MZ;
