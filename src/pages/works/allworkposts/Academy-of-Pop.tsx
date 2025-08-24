import React, { useRef, useEffect, useState } from "react";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { gsap } from "gsap";
import "./style.css";
import ReactModal from "react-modal";

import { useScrollContext } from "../../../app/contexts/ScrollContext";

import Ticker from "../../../components/ticker";
import { InfoSection } from "../../../components/infosection";
import SingleTicker from "../../../components/singleticker";
import { useData } from "../../../app/contexts/DataProvider";


import ScrollToTopButton from "../../../components/scrolltotopbutton";
import InlineSvg from "../../../components/inlinesvg";


const AcademyOfPop = () => {

    const pageTitle = "Academy of Pop - Interior Design and Branding Showcase";
    const pageDescription =
        "Explore the Academy of Pop, a groundbreaking project featuring bespoke interior design, branding, and logo creation by *MYLG!*.";
    const canonicalUrl = "https://mylg.studio/works/Academy-of-Pop";
    const ogImage = "https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/04.png";

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        "name": "Academy of Pop",
        "description":
            "Explore the Academy of Pop, a groundbreaking project featuring bespoke interior design, branding, and logo creation by *MYLG!*.",
        "image": "https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/04.png",
        "url": "https://mylg.studio/works/Academy-of-Pop",
        "creator": {
            "@type": "Organization",
            "name": "*MYLG!*",
        },
        "locationCreated": {
            "@type": "Place",
            "name": "9000 Sunset Blvd, Los Angeles",
            "address": {
                "@type": "PostalAddress",
                "streetAddress": "9000 Sunset Blvd",
                "addressLocality": "Los Angeles",
                "addressRegion": "CA",
                "postalCode": "90069",
                "addressCountry": "US",
            },
        },
        "hasPart": [
            {
                "@type": "CreativeWork",
                "name": "Academy of Pop Studio Interior Design",
                "description":
                    "Bespoke interior design of the Academy of Pop studio, showcasing innovative layouts and concepts by *MYLG!*.",
                "creator": {
                    "@type": "Organization",
                    "name": "*MYLG!*",
                },
            },
            {
                "@type": "CreativeWork",
                "name": "Academy of Pop Branding and Logo",
                "description":
                    "Development of a striking brand identity and the iconic Academy of Pop logo by *MYLG!*.",
                "creator": {
                    "@type": "Organization",
                    "name": "*MYLG!*",
                },
            },
            {
                "@type": "CreativeWork",
                "name": "Academy of Pop Penthouse Design",
                "description":
                    "Bespoke interior design for the Academy of Pop penthouse, delivering a refined and creative living space by *MYLG!*.",
                "creator": {
                    "@type": "Organization",
                    "name": "*MYLG!*",
                },
            },
        ],
    };
    


    const images = [
        "https://d2qb21tb4meex0.cloudfront.net/02-Academy+of+Pop/04.png",
        "https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/05.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/07.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/08.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/09.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/10.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/11.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/12.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/13.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/14.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/15.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/16.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/17.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/18.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/19.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/20.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/21.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/22.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/23.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/24.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/25.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/26.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/27.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/28.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/row0.png",
        "https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/row11.png",
    ];


    const tickerLines = [
        "PROJECT DESIGNED BY MOKIBABY ",
        "ACADEMY OF POP ",
        "DIGITAL ART BY *MYLG!*"
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
        if (isTransitioning) return; // Prevent multiple triggers
        isTransitioning = true;

        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);

        setTimeout(() => {
            isTransitioning = false;
        }, 300); // Delay matches the animation duration
    };

    const prevImage = () => {
        if (isTransitioning) return; // Prevent multiple triggers
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
        } else {
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
        if (touchStart === 0 || touchEnd === 0) return;
        const delta = touchStart - touchEnd;
        const swipeThreshold = 50; // Minimum swipe distance in px

        if (Math.abs(delta) > swipeThreshold) {
            if (delta > 0) {
                nextImage();
            } else {
                prevImage();
            }
        }

        setTouchStart(0);
        setTouchEnd(0);
    };

    // Arrow navigation.
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "ArrowRight") {
                nextImage();
            } else if (e.key === "ArrowLeft") {
                prevImage();
            } else if (e.key === "Escape") {
                closeModal();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []); // Empty dependency array ensures the listener is added once





    // Prevents scrolling when the modal is open by adding a class and disabling touchmove events.
    useEffect(() => {
        const preventDefault = (e) => e.preventDefault();

        if (isModalOpen) {
            document.body.classList.add('no-scroll');
            document.addEventListener('touchmove', preventDefault, { passive: false });
        } else {
            document.body.classList.remove('no-scroll');
            document.removeEventListener('touchmove', preventDefault);
        }

        return () => {
            document.body.classList.remove('no-scroll');
            document.removeEventListener('touchmove', preventDefault);
        };
    }, [isModalOpen]);

    // Toggles header visibility based on scroll direction.
    // Cleans up by removing the scroll event listener when `prevScrollPos` changes or component unmounts.
    useEffect(() => {
        window.addEventListener("scroll", handleWindowScroll);
        return () => window.removeEventListener("scroll", handleWindowScroll);
    }, [prevScrollPos]);

    // Disables body scroll when the modal is open and restores it when closed.
    // Ensures cleanup on unmount or when `isModalOpen` changes.
    useEffect(() => {
        document.body.style.overflow = isModalOpen ? "hidden" : "";
        return () => (document.body.style.overflow = "");
    }, [isModalOpen]);



    // GSAP animations for SVG and staggered elements
    useEffect(() => {
        if (!svgReady) return;
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

    // Intersection observer
    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const video = entry.target;
                if (entry.isIntersecting) {
                    video.play();
                } else {
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



    return (
        <>

            <Helmet>
                <title>{pageTitle}</title>
                <meta name="description" content={pageDescription} />
                <link rel="canonical" href={canonicalUrl} />
                <meta property="og:title" content={pageTitle} />
                <meta property="og:description" content={pageDescription} />
                <meta property="og:image" content={ogImage} />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />
                <meta property="og:url" content={canonicalUrl} />
                <meta property="og:type" content="website" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={pageTitle} />
                <meta name="twitter:description" content={pageDescription} />
                <meta name="twitter:image" content={ogImage} />
                <meta name="twitter:image:alt" content="Academy of Pop cover image" />
                <link rel="preconnect" href="https://d1cazymewvlm0k.cloudfront.net" />
                <link rel="dns-prefetch" href="https://d1cazymewvlm0k.cloudfront.net" />
                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            </Helmet>

            <div className={`${opacityClass} ${isModalOpen ? 'no-scroll' : ''}`}>


                <div className="svg-overlay">
                    <svg viewBox="0 0 1000 1000" width="100%" height="100%" preserveAspectRatio="none">

                        <path id="revealPath" d="M0,1005S175,995,500,995s500,5,500,5V0H0Z"></path>
                    </svg>
                </div>


                <div className="workpage-heading">
                    <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/Academy-of-Pop/aopheader.svg" onReady={() => setSvgReady(true)} />
                </div>
                <div className="rendering-layout">
                    <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/Academy-of-Pop/aoptitle.svg" />



                    <div className="rendering-heading">
                        <div className="rendering-top-row">
                            <div className="rendering-header">
                                <h2>Branding</h2>
                            </div>
                            {/* <span className="arrow-down works-arrow">↓</span> */}
                        </div>
                        <div className="rendering-subheader">
                            <h3><br />
                            </h3>
                        </div>
                    </div>







                    <div className="rendering-row-img" style={{ paddingBottom: "10px", }}>

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/row0.png" loading="lazy" alt="Academy of Pop" width="100%" height="100%" onClick={() => openModal(24)} style={{
                                cursor: "pointer"
                            }} />
                        </div>
                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/row11.png" loading="lazy" alt="Academy of Pop" width="100%" height="100%" onClick={() => openModal(25)} style={{
                                cursor: "pointer"
                            }} />
                        </div>

                    </div>


                    <div className="rendering-row-img">

                        <div className="img-container ">
                            <img src="https://d2qb21tb4meex0.cloudfront.net/02-Academy+of+Pop/04.png" loading="lazy" alt="Academy of Pop" width="100%" height="100%" onClick={() => openModal(0)} style={{
                                cursor: "pointer"
                            }} />

                        </div>
                    </div>


                    <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/Academy-of-Pop/row3.svg" className="rendering-row" />

                    <div className="rendering-row-video">

                        <div className="animation-container asvg-container">

                            <video width="100%" height="100%" loop autoPlay muted playsInline>
                                <source src="https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/00.mp4" type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>

                        </div>


                        <div className="right-content">
                            <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/Academy-of-Pop/asvg.svg" className="asvg" />
                        </div>
                    </div>






                </div>


                <div className="rendering-ticker-section">

                    <Ticker lines={tickerLines} />
                </div>

                <div className="rendering-layout">
                    <div className="rendering-top-row">
                        <div className="rendering-header">
                            <h2>Interior  <br />
                                Design</h2>
                        </div>
                        {/* <span className="arrow-down works-arrow">↓</span> */}
                    </div>
                    <div className="rendering-subheader">
                        <h3>Ph Level<br />
                        </h3>
                    </div>



                    <div className="rendering-row-img">

                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/05.jpg" loading="lazy" alt="Academy of Pop" width="100%" height="100%" onClick={() => openModal(1)} style={{
                                    cursor: "pointer"
                                }} />

                        </div>
                    </div>



                    <div className="rendering-row-video">

                        <div className="aop-video-container">
                            <video width="100%" height="100%" loop autoPlay muted playsInline>
                                <source src="https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/01.mp4" type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>

                        </div>


                        <div className="aop-video-container">
                            <video width="100%" height="100%" loop autoPlay muted playsInline>
                                <source src="https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/02.mp4" type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                        </div>

                    </div>

                    <div className="rendering-row-video">

                        <div className="aop-video-container 169">
                            <video width="100%" height="100%" loop autoPlay muted playsInline>
                                <source src="https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/03.mp4" type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>

                        </div>
                    </div>





                    <div className="rendering-row-img">

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/07.jpg" loading="lazy" alt="Academy of Pop" width="100%" height="100%" onClick={() => openModal(2)} style={{
                                cursor: "pointer"
                            }} />
                        </div>
                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/08.jpg" loading="lazy" alt="Academy of Pop" width="100%" height="100%" onClick={() => openModal(3)} style={{
                                cursor: "pointer"
                            }} />
                        </div>

                    </div>

                    <div className="rendering-row-img">

                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/09.jpg" loading="lazy" alt="Academy of Pop" width="100%" height="100%" onClick={() => openModal(4)} style={{
                                cursor: "pointer"
                            }} />

                        </div>
                    </div>

                    <div className="rendering-row-img">

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/10.jpg" loading="lazy" alt="Academy of Pop" width="100%" height="100%" onClick={() => openModal(5)} style={{
                                cursor: "pointer"
                            }} />
                        </div>
                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/11.jpg" loading="lazy" alt="Academy of Pop" width="100%" height="100%" onClick={() => openModal(6)} style={{
                                cursor: "pointer"
                            }} />
                        </div>

                    </div>

                    <div className="rendering-row-img">

                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/12.jpg" loading="lazy" alt="Academy of Pop" width="100%" height="100%" onClick={() => openModal(7)} style={{
                                cursor: "pointer"
                            }} />

                        </div>
                    </div>

                    <div className="rendering-row-img">

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/13.jpg" loading="lazy" alt="Academy of Pop" width="100%" height="100%" onClick={() => openModal(8)} style={{
                                cursor: "pointer"
                            }} />
                        </div>
                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/14.jpg" loading="lazy" alt="Academy of Pop" width="100%" height="100%" onClick={() => openModal(9)} style={{
                                cursor: "pointer"
                            }} />
                        </div>

                    </div>

                    <div className="rendering-row-img">

                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/15.jpg" loading="lazy" alt="Academy of Pop" width="100%" height="100%" onClick={() => openModal(10)} style={{
                                cursor: "pointer"
                            }} />

                        </div>
                    </div>

                    <div className="rendering-row-img">

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/16.jpg" loading="lazy" alt="Academy of Pop" width="100%" height="100%" onClick={() => openModal(11)} style={{
                                cursor: "pointer"
                            }} />
                        </div>
                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/17.jpg" loading="lazy" alt="Academy of Pop" width="100%" height="100%" onClick={() => openModal(12)} style={{
                                cursor: "pointer"
                            }} />
                        </div>

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/18.jpg" loading="lazy" alt="Academy of Pop" width="100%" height="100%" onClick={() => openModal(13)} style={{
                                cursor: "pointer"
                            }} />
                        </div>


                    </div>

                    <div className="rendering-row-img">

                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/19.jpg" loading="lazy" alt="Academy of Pop" width="100%" height="100%" onClick={() => openModal(14)} style={{
                                cursor: "pointer"
                            }} />

                        </div>
                    </div>







                    <div className="rendering-top-row">
                        <div className="rendering-header ll-studios">
                            <h2>Interior  <br />
                                Design</h2>
                        </div>
                        {/* <span className="arrow-down works-arrow">↓</span> */}
                    </div>
                    <div className="rendering-subheader ">
                        <h3>LL Studios<br />
                        </h3>
                    </div>

                    <div className="rendering-row-img">

                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/20.jpg" loading="lazy" alt="Academy of Pop" width="100%" height="100%" onClick={() => openModal(15)} style={{
                                cursor: "pointer"
                            }} />

                        </div>
                    </div>

                    <div className="rendering-row-video">

                        <div className="aop-video-container">
                            <video width="100%" height="100%" loop autoPlay muted playsInline>
                                <source src="https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/04.mp4" type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>

                        </div>


                        <div className="aop-video-container">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/21.jpg" loading="lazy" alt="Academy of Pop" width="100%" height="100%" onClick={() => openModal(16)} style={{
                                cursor: "pointer"
                            }} />
                        </div>


                    </div>

                    <div className="rendering-layout">

                        <div className="rendering-row-img">

                            <div className="img-container ">
                                <img src="https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/22.jpg" loading="lazy" alt="Academy of Pop" width="100%" height="100%" onClick={() => openModal(17)} style={{
                                    cursor: "pointer"
                                }} />

                            </div>
                        </div>

                        <div className="rendering-row-img">

                            <div className="img-container ">


                                <img src="https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/23.jpg" loading="lazy" alt="Academy of Pop" width="100%" height="100%" onClick={() => openModal(18)} style={{
                                    cursor: "pointer"
                                }} />
                            </div>
                            <div className="img-container ">


                                <img src="https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/24.jpg" loading="lazy" alt="Academy of Pop" width="100%" height="100%" onClick={() => openModal(19)} style={{
                                    cursor: "pointer"
                                }} />
                            </div>

                        </div>

                        <div className="rendering-row-img">

                            <div className="img-container ">


                                <img src="https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/25.jpg" loading="lazy" alt="Academy of Pop" width="100%" height="100%" onClick={() => openModal(20)} style={{
                                    cursor: "pointer"
                                }} />
                            </div>
                            <div className="img-container ">


                                <img src="https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/26.jpg" loading="lazy" alt="Academy of Pop" width="100%" height="100%" onClick={() => openModal(21)} style={{
                                    cursor: "pointer"
                                }} />
                            </div>

                            <div className="img-container ">


                                <img src="https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/27.jpg" loading="lazy" alt="Academy of Pop" width="100%" height="100%" onClick={() => openModal(22)} style={{
                                    cursor: "pointer"
                                }} />
                            </div>


                        </div>

                        <div className="rendering-row-img">

                            <div className="img-container ">
                                <img src="https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/28.jpg" loading="lazy" alt="Academy of Pop" width="100%" height="100%" onClick={() => openModal(23)} style={{
                                    cursor: "pointer"
                                }} />

                            </div>
                        </div>





                    </div>

                    <div className="img-container yt-container">
                        <a
                            href="https://www.youtube.com/watch?v=qC-z4xPSOIA"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="overlay-container"
                        >
                            <img
                                src="https://d1cazymewvlm0k.cloudfront.net/02-Academy+of+Pop/yt-video-cover-1.png"
                                alt="Academy of Pop Video Cover"
                                loading="lazy"
                            />
                            <div className="overlay-text">Watch the Video</div>
                        </a>
                    </div>


                </div>

                <div className="rendering-infosection">



                    <InfoSection />
                    <hr style={{ opacity: "1", color: "fff", height: "2px", backgroundColor: "#fff", margin: "0.5rem", }} />

                    <div className="single-ticker-section">

                        <SingleTicker />
                    </div>
                </div>

                <ReactModal
                    isOpen={isModalOpen}
                    onRequestClose={closeModal}
                    className="modal-content"
                    overlayClassName="modal"
                    ariaHideApp={false} // Disable for development purposes
                >
                    <div
                        className="modal-content"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >

                        <img
                            src={images[currentIndex]}
                            alt={`Academy of Pop ${currentIndex}`}
                            className="modal-image"
                        />
                    </div>
                </ReactModal>



            </div>

        </>
    );
};


export default AcademyOfPop;
