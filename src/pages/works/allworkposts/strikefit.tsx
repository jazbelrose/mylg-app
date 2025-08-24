import React, { useRef, useEffect, useState } from "react";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { gsap } from "gsap";
import "./style.css";

import ReactModal from "react-modal";
import { useScrollContext } from "../../../app/contexts/ScrollContext";

import InlineSvg from "../../../components/inlinesvg";
import { InfoSection } from "../../../components/infosection/index.js";
import SingleTicker from "../../../components/singleticker";
import { useData } from "../../../app/contexts/DataProvider";


const StrikeFit = () => {

    const pageTitle = "StrikeFit - Elevating Performance & Design with Premium Photography";
    const pageDescription =
        "Dive into StrikeFit, Paris' premier athletic hand dust redefining weightlifting performance. Crafted with French precision and engineered for elite athletes, StrikeFit exemplifies the intersection of innovative product design and striking brand photography.";
    const canonicalUrl = "https://mylg.studio/works/strikefit";
    const ogImage = "https://d1cazymewvlm0k.cloudfront.net/17-Jack+Masai/01.jpg";

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        "name": "StrikeFit Portfolio",
        "description": pageDescription,
        "image": ogImage,
        "url": canonicalUrl,
        "creator": {
            "@type": "Organization",
            "name": "*MYLG!*",
        },
        "workFeatured": [
            {
                "@type": "CreativeWork",
                "name": "StrikeFit Brand Photography",
                "description": "Explore high-impact brand visuals for StrikeFit, highlighting the dust and energy of elite performance. The photography blends power, motion, and precision, embodying StrikeFit's essence.",
                "image": [
                    "https://d1cazymewvlm0k.cloudfront.net/17-Jack+Masai/07.jpg",
                    "https://d1cazymewvlm0k.cloudfront.net/17-Jack+Masai/06.jpg",
                ],
            },
            {
                "@type": "CreativeWork",
                "name": "StrikeFit Product Design",
                "description": "Showcasing StrikeFit's innovative product design, engineered for performance and aesthetic appeal. Features include sleek packaging and French-inspired branding visuals.",
                "image": [
                    "https://d1cazymewvlm0k.cloudfront.net/17-Jack+Masai/08.jpg",
                    "https://d1cazymewvlm0k.cloudfront.net/17-Jack+Masai/04.jpg",
                ],
            },
        ],
        "about": {
            "@type": "Brand",
            "name": "StrikeFit",
            "description":
                "StrikeFit is Paris' premier athletic hand dust, engineered to optimize weightlifting performance with unparalleled precision and style.",
            "logo": "https://d1cazymewvlm0k.cloudfront.net/17-Jack+Masai/02.png",
            "slogan": "Break the Dust. Mark the Days.",
        },
    };
    const images = [

        "https://d1cazymewvlm0k.cloudfront.net/17-Jack+Masai/05.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/17-Jack+Masai/06.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/17-Jack+Masai/07.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/17-Jack+Masai/08.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/17-Jack+Masai/03.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/17-Jack+Masai/09.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/17-Jack+Masai/10.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/17-Jack+Masai/11.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/17-Jack+Masai/13.png",
        "https://d2qb21tb4meex0.cloudfront.net/17-Jack+Masai/01.png",
        "https://d1cazymewvlm0k.cloudfront.net/17-Jack+Masai/02.png",
        "https://d1cazymewvlm0k.cloudfront.net/17-Jack+Masai/15.png",
        "https://d2qb21tb4meex0.cloudfront.net/17-Jack+Masai/04.png",

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

    // Arrow navigation for modal
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
    }, []);





    // Prevent scrolling when modal is open
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



    // Play/pause videos based on visibility using Intersection Observer
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
                <meta name="twitter:image:alt" content="StrikeFit Brand Photography and Product Design" />
                <link rel="preconnect" href="https://d1cazymewvlm0k.cloudfront.net" />
                <link rel="dns-prefetch" href="https://d1cazymewvlm0k.cloudfront.net" />
                <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
            </Helmet>

        <div className={`${opacityClass} ${isModalOpen ? 'no-scroll' : ''}`}>
            <div className="svg-overlay">
                <svg viewBox="0 0 1000 1000" preserveAspectRatio="none">
                    <path id="revealPath" d="M0,1005S175,995,500,995s500,5,500,5V0H0Z"></path>
                </svg>
            </div>


            <div className="workpage-heading">
                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/strikefit/strikefit-header.svg" onReady={() => setSvgReady(true)} />
            </div>
            <div className="rendering-layout">





                <InlineSvg
                    src="https://d2qb21tb4meex0.cloudfront.net/svg/strikefit/row1.svg"
                    className="rendering-row"
                    onClick={() => openModal(9)}
                    style={{ cursor: "pointer" }}
                />



                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/17-Jack+Masai/14.png" alt="Strike Fit Image" width="100%" height="100%" onClick={() => openModal(10)} style={{ cursor: "pointer" }} />
                    </div>
                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/17-Jack+Masai/15.png" loading="lazy" alt="Strike Fit Image" width="100%" height="100%" onClick={() => openModal(11)} style={{
                            cursor: "pointer"
                        }} />
                    </div>



                </div>


                <InlineSvg
                    src="https://d2qb21tb4meex0.cloudfront.net/svg/strikefit/row3.svg"
                    className="rendering-row"
                />



                <InlineSvg
                    src="https://d2qb21tb4meex0.cloudfront.net/svg/strikefit/row4.svg"
                    className="rendering-row"
                    onClick={() => openModal(12)}
                    style={{ cursor: "pointer" }}
                />



                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/17-Jack+Masai/05.jpg" loading="lazy" alt="Strike Fit Image" width="100%" height="100%" onClick={() => openModal(0)} style={{
                            cursor: "pointer"
                        }} />
                    </div>
                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/17-Jack+Masai/06.jpg" loading="lazy" alt="Strike Fit Image" width="100%" height="100%" onClick={() => openModal(1)} style={{
                            cursor: "pointer"
                        }} />
                    </div>



                </div>

                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/strikefit/row5.svg" className="rendering-row" />
                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/strikefit/row6.svg" className="rendering-row" />
                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/strikefit/row7.svg" className="rendering-row" />


                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/17-Jack+Masai/07.jpg" loading="lazy" alt="Strike Fit Image" width="100%" height="100%" onClick={() => openModal(2)} style={{
                            cursor: "pointer"
                        }} />
                    </div>




                </div>



                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/17-Jack+Masai/08.jpg" loading="lazy" alt="Strike Fit Image" width="100%" height="100%" onClick={() => openModal(3)} style={{
                            cursor: "pointer"
                        }} />
                    </div>
                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/17-Jack+Masai/03.jpg" loading="lazy" alt="Strike Fit Image" width="100%" height="100%" onClick={() => openModal(4)} style={{
                            cursor: "pointer"
                        }} />
                    </div>



                </div>

                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/strikefit/row9.svg" className="rendering-row" />



                <div className="rendering-row-img">


                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/17-Jack+Masai/09.jpg" loading="lazy" alt="Strike Fit Image" width="100%" height="100%" onClick={() => openModal(5)} style={{
                            cursor: "pointer"
                        }} />
                    </div>
                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/17-Jack+Masai/10.jpg" loading="lazy" alt="Strike Fit Image" width="100%" height="100%" onClick={() => openModal(6)} style={{
                            cursor: "pointer"
                        }} />
                    </div>



                </div>

                <div className="rendering-row-img">


                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/17-Jack+Masai/11.jpg" loading="lazy" alt="Strike Fit Image" width="100%" height="100%" onClick={() => openModal(7)} style={{
                            cursor: "pointer"
                        }} />
                    </div>
                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/17-Jack+Masai/13.png" loading="lazy" alt="Strike Fit Image" width="100%" height="100%" onClick={() => openModal(8)} style={{
                            cursor: "pointer"
                        }} />
                    </div>



                </div>

                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/strikefit/row10.svg" className="rendering-row" />



            </div>


<hr style={{ opacity: "1", color: "fff", height: "2px", backgroundColor: "#fff", margin: "0.5rem", }} />
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
                        alt={`Image ${currentIndex}`}
                        className="modal-image"
                    />
                </div>
            </ReactModal>


        </div >

        </>
    );
};

export default StrikeFit;
