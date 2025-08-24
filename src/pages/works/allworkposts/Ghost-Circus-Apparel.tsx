import React, { useRef, useEffect, useState } from "react";
import { Helmet, HelmetProvider } from "react-helmet-async";

import { gsap } from "gsap";
import "./style.css";
import ReactModal from "react-modal";
import { useScrollContext } from "../../../app/contexts/ScrollContext";





import Ticker from "../../../components/ticker";
import { InfoSection } from "../../../components/infosection/index.js";
import SingleTicker from "../../../components/singleticker";

import { useData } from "../../../app/contexts/DataProvider";
import InlineSvg from "../../../components/inlinesvg";

const GhostCircusApparel = () => {


    const pageTitle = "Ghost Circus Apparel: Fashion Branding & Design";
  const pageDescription =
    "Ghost Circus Apparel's X by Eli James Collection features futuristic branding with photoshoots, styled fashion, custom gift boxes, and 3D-rendered designs. Handmade in Hollywood, CA.";
  const canonicalUrl = "https://mylg.studio/works/Ghost-Circus-Apparel";
  const ogImage =
    "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/01.jpg";

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "name": "Ghost Circus Apparel Branding",
    "description": pageDescription,
    "image": ogImage,
    "url": canonicalUrl,
    "creator": {
      "@type": "Organization",
      "name": "*MYLG!*",
    },
    "locationCreated": {
      "@type": "Place",
      "name": "Hollywood, CA",
    },
    "hasPart": [
      {
        "@type": "CreativeWork",
        "name": "Fashion Photoshoot",
        "description": "Styled photography for Ghost Circus Apparel's X by Eli James collection.",
        "image": [
                    "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/25.jpg",
                    "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/24.jpg"
                ],
      },
      {
        "@type": "CreativeWork",
        "name": "Custom Gift Boxes",
        "description": "Innovative branded packaging designed for Ghost Circus Apparel.",
        "image": [
                    "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/06.jpg",
                    "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/05.jpg"
                ],
      },
      {
        "@type": "CreativeWork",
        "name": "Clothes Rendering",
        "description": "Detailed 3D renders of apparel for the GCA brand.",
        "image": [
                    "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/13.jpg",
                    "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/12.jpg"
                ],
      },
    ],
  };

    const tickerLines = [
        "GHOST CIRCUS APPAREL ",
        "ELI JAMES & FAMILY LOS ANGELES ALL STARS ",
        "DIGITAL ART BY *MYLG!*"
    ];


    const images = [
        "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/00.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/01.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/02.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/03.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/04.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/05.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/06.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/07.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/08.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/09.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/10.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/11.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/12.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/13.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/14.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/15.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/16.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/17.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/18.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/21.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/22.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/23.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/24.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/25.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/26.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/27.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/28.jpg"
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
        <meta property="og:url" content={canonicalUrl} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={ogImage} />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

        <div className={`${opacityClass} ${isModalOpen ? 'no-scroll' : ''}`}>

            <div className="svg-overlay">
                <svg viewBox="0 0 1000 1000" preserveAspectRatio="none">
                    <path id="revealPath" d="M0,1005S175,995,500,995s500,5,500,5V0H0Z"></path>
                </svg>
            </div>


            <div className="workpage-heading">
                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/ghostcircusapparel/ghostcircusapparelheader.svg" onReady={() => setSvgReady(true)} />
            </div>
            <div className="rendering-layout">



                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/00.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" width="100%" height="100%" onClick={() => openModal(0)} style={{ cursor: "pointer" }} />
                    </div>


                </div>

                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/ghostcircusapparel/row1.svg" className="rendering-row" onReady={() => setSvgReady(true)} />






                <div className="masonry" >
                    <div className="masonry-column">
                        <img src="https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/01.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" onClick={() => openModal(1)} style={{ cursor: "pointer" }} />
                        <img src="https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/02.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" onClick={() => openModal(2)} style={{ cursor: "pointer" }} />

                    </div>
                    <div className="masonry-column">
                        <img src="https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/03.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" onClick={() => openModal(3)} style={{ cursor: "pointer" }} />
                        <img src="https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/04.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" onClick={() => openModal(4)} style={{ cursor: "pointer" }} />

                    </div>
                </div>


                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/05.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" width="100%" height="100%" onClick={() => openModal(5)} style={{ cursor: "pointer" }} />
                    </div>


                </div>

                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/06.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" width="100%" height="100%" onClick={() => openModal(6)} style={{ cursor: "pointer" }} />
                    </div>
                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/07.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" width="100%" height="100%" onClick={() => openModal(7)} style={{ cursor: "pointer" }} />
                    </div>


                </div>


                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/08.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" width="100%" height="100%" onClick={() => openModal(8)} style={{ cursor: "pointer" }} />
                    </div>



                </div>

                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/ghostcircusapparel/row2.svg" className="rendering-row" />

                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/10.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" width="100%" height="100%" onClick={() => openModal(10)} style={{ cursor: "pointer" }} />
                    </div>
                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/09.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" width="100%" height="100%" onClick={() => openModal(9)} style={{ cursor: "pointer" }} />
                    </div>


                </div>
                <div className="rendering-row-img" style={{ paddingBottom: "1vw", paddingTop: "0px" }}>

                    <div className="img-container "  >


                        <img src="https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/11.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" width="100%" height="100%" onClick={() => openModal(11)} style={{ cursor: "pointer" }} />
                    </div>


                </div>






                <div className="grid-container-gca second-grid-gca">

                    <div className="full-height-column-gca content-item">
                        <img src="https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/12.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" width="100%" height="100%" onClick={() => openModal(12)} style={{ cursor: "pointer" }} />
                    </div>
                    <div className="column-gca">
                        <div className="top-row-gca content-item"> <img src="https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/13.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" width="100%" onClick={() => openModal(13)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="bottom-row-gca content-item"> <img src="https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/14.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" width="100%" onClick={() => openModal(14)} style={{ cursor: "pointer" }} />
                        </div>
                    </div>

                </div>




                <div className="grid-container-gca">
                    <div className="column-gca">
                        <div className="top-row content-item"> <img src="https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/15.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" width="100%" height="100%" onClick={() => openModal(15)} style={{ cursor: "pointer" }} /></div>
                        <div className="bottom-row-gca content-item"> <img src="https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/16.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" width="100%" height="100%" onClick={() => openModal(16)} style={{ cursor: "pointer" }} /></div>
                    </div>
                    <div className="full-height-column-gca content-item">
                        <img src="https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/17.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" width="100%" height="100%" onClick={() => openModal(17)} style={{ cursor: "pointer" }} />
                    </div>
                </div>






                <div className="rendering-row-img" style={{ paddingBottom: "1vw", paddingTop: "0px" }}>

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/18.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" width="100%" height="100%" onClick={() => openModal(18)} style={{ cursor: "pointer" }} />
                    </div>


                </div>

                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/ghostcircusapparel/row3.svg" className="rendering-row" />
                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/ghostcircusapparel/row4.svg" className="rendering-row" />

                <div className="rendering-row-img" style={{ paddingTop: "5vw" }}>

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/21.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" width="100%" height="100%" onClick={() => openModal(19)} style={{ cursor: "pointer" }} />
                    </div>


                </div>
                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/ghostcircusapparel/row5.svg" className="rendering-row" />





                <div className="grid-container-gca second-grid-gca">

                    <div className="full-height-column-gca content-item">
                        <img src="https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/23.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" width="100%" height="100%" onClick={() => openModal(21)} style={{ cursor: "pointer" }} />
                    </div>
                    <div className="column-gca">
                        <div className="top-row-gca content-item"> <img src="https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/22.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" width="100%" height="100%" onClick={() => openModal(20)} style={{ cursor: "pointer" }} /></div>
                        <div className="bottom-row-gca content-item"> <img src="https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/24.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" width="100%" height="100%" onClick={() => openModal(22)} style={{ cursor: "pointer" }} /></div>
                    </div>

                </div>








                <div className="rendering-row-img" style={{ paddingBottom: "1vw", paddingTop: "0px" }}>


                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/25.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" width="100%" height="100%" onClick={() => openModal(23)} style={{ cursor: "pointer" }} />
                    </div>


                </div>

                <div className="grid-container-gca">
                    <div className="column-gca">
                        <div className="top-row content-item"> <img src="https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/26.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" width="100%" height="100%" onClick={() => openModal(24)} style={{ cursor: "pointer" }} /></div>
                        <div className="bottom-row-gca content-item"> <img src="https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/27.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" width="100%" height="100%" onClick={() => openModal(25)} style={{ cursor: "pointer" }} /></div>
                    </div>
                    <div className="full-height-column-gca content-item">
                        <img src="https://d1cazymewvlm0k.cloudfront.net/14-Ghost+Circus+Apparel/28.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" width="100%" height="100%" onClick={() => openModal(26)} style={{ cursor: "pointer" }} />
                    </div>
                </div>




                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/ghostcircusapparel/row6.svg" className="rendering-row" />
                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/ghostcircusapparel/row7.svg" className="rendering-row" />



            </div>




            <div className="rendering-ticker-section">

                <Ticker lines={tickerLines} />
            </div>
            <hr style={{ opacity: "1", color: "fff", height: "2px", backgroundColor: "#fff", margin: "0.5rem", }} />



            <div className="rendering-layout">









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
                        alt={`Image ${currentIndex}`}
                        className="modal-image"
                    />
                </div>
            </ReactModal>





        </div >

        </>

    );
};

export default GhostCircusApparel;
