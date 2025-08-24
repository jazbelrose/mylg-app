import React, { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import "./style.css";
import { Helmet, HelmetProvider } from "react-helmet-async";

import ReactModal from "react-modal";
import { useScrollContext } from "../../../app/contexts/ScrollContext";

import works from '../works.json';
import BlogPostButton from "../../../components/blogpostbutton/BlogPostButton.js";
import { InfoSection } from "../../../components/infosection/index.js";
import SingleTicker from "../../../components/singleticker";
import { useData } from "../../../app/contexts/DataProvider";
import InlineSvg from "../../../components/inlinesvg";



const KeysArtBasel = () => {

    const pageTitle = "Keys @ Strawberry Moon Art Basel Booth | Creative by Mokibaby | MYLG!";
    const pageDescription =
        "Discover our immersive booth for Keys at Strawberry Moon during Art Basel Miami, featuring 3D renders, event production, and creative direction by Mokibaby.";
    const canonicalUrl = "https://mylg.studio/works/Keys-Art-Basel";
    const ogImage = "https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/15.jpg";

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "Event",
        "name": "Keys Art Basel Booth at Strawberry Moon Miami",
        "description": "We produced and rendered a stunning booth for Keys at Strawberry Moon during Art Basel Miami, in collaboration with creative director Mokibaby.",
        "image": ogImage,
        "location": {
            "@type": "Place",
            "name": "Strawberry Moon",
            "address": {
                "@type": "PostalAddress",
                "streetAddress": "601 Washington Ave",
                "addressLocality": "Miami Beach",
                "addressRegion": "FL",
                "postalCode": "33139",
                "addressCountry": "USA"
            }
        },
        "organizer": {
            "@type": "Organization",
            "name": "*MYLG!*",
            "url": "https://mylg.studio"
        },
        "eventStatus": "https://schema.org/EventScheduled",
        "startDate": "2022-12-05",
        "endDate": "2022-12-10"
    };

  

    const images = [
        "https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/01.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/02.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/03.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/04.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/05.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/06.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/07.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/08.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/09.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/10.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/11.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/12.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/13.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/14.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/15.jpg",
    ];

// Works Gallery
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
// Shuffle all works and select the first 16
useEffect(() => {
    
    const shuffledWorks = shuffleArray(works).slice(0, 16);
    setDisplayedWorks(shuffledWorks);
}, []);





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
            <meta name="twitter:image:alt" content="Keys Art Basel Booth" />
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
                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/keysartbasel/keysartbaselheader.svg" onReady={() => setSvgReady(true)} />
            </div>
            <div className="rendering-layout">






                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/keysartbasel/row0.svg" className="rendering-row" />
                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/keysartbasel/row1.svg" className="rendering-row" />
                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/keysartbasel/row2.svg" className="rendering-row" />


                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/01.jpg" loading="lazy" alt="Keys Art Basel image" width="100%" height="100%" onClick={() => openModal(0)} style={{ cursor: "pointer" }} />
                    </div>
                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/02.jpg" loading="lazy" alt="Keys Art Basel image" width="100%" height="100%" onClick={() => openModal(1)} style={{ cursor: "pointer" }} />
                    </div>
                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/03.jpg" loading="lazy" alt="Keys Art Basel image" width="100%" height="100%" onClick={() => openModal(2)} style={{ cursor: "pointer" }} />
                    </div>



                </div>
                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/04.jpg" loading="lazy" alt="Keys Art Basel image" width="100%" height="100%" onClick={() => openModal(3)} style={{ cursor: "pointer" }} />
                    </div>
                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/05.jpg" loading="lazy" alt="Keys Art Basel image" width="100%" height="100%" onClick={() => openModal(4)} style={{ cursor: "pointer" }} />
                    </div>




                </div>
                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/06.jpg" loading="lazy" alt="Keys Art Basel image" width="100%" height="100%" onClick={() => openModal(5)} style={{ cursor: "pointer" }} />
                    </div>
                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/07.jpg" loading="lazy" alt="Keys Art Basel image" width="100%" height="100%" onClick={() => openModal(6)} style={{ cursor: "pointer" }} />
                    </div>




                </div>

                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/keysartbasel/row3.svg" className="rendering-row" />





                <div className="rendering-row-video">

                    <div className="bb-video-container">
                        <video

                            width="100%"
                            height="100%"
                            loop
                            autoPlay
                            muted
                            playsInline
                        >
                            <source src="https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/00.mp4" type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>

                    </div>

                </div>

                <div className="grid-container-gca second-grid-gca" style={{ gridTemplateColumns: '0.4fr 0.6fr', padding: '0.25vw' }}>

                    <div className="full-height-column-gca content-item">
                        <img src="https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/08.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" width="100%" height="100%" onClick={() => openModal(7)} style={{ cursor: "pointer" }} />
                    </div>

                    <div className="column-gca">
                        <div className="top-row-gca content-item"> <img src="https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/09.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" width="100%" onClick={() => openModal(8)} style={{ cursor: "pointer" }} /></div>
                        <div className="bottom-row-gca content-item"> <img src="https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/10.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" width="100%" onClick={() => openModal(9)} style={{ cursor: "pointer" }} /></div>
                    </div>



                </div>





                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/11.jpg" loading="lazy" alt="Keys Art Basel image" width="100%" height="100%" onClick={() => openModal(10)} style={{ cursor: "pointer" }} />
                    </div>




                </div>


                <div className="grid-container-gca second-grid-gca" style={{ gridTemplateColumns: '0.6fr 0.4fr', padding: '0.25vw' }}>


                    <div className="column-gca">
                        <div className="top-row-gca content-item"> <img src="https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/12.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" width="100%" onClick={() => openModal(11)} style={{ cursor: "pointer" }} /></div>
                        <div className="bottom-row-gca content-item"> <img src="https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/13.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" width="100%" onClick={() => openModal(12)} style={{ cursor: "pointer" }} /></div>
                    </div>


                    <div className="full-height-column-gca content-item">
                        <img src="https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/14.jpg" loading="lazy" alt="Ghost-Circus-Apparel Image" width="100%" height="100%" onClick={() => openModal(13)} style={{ cursor: "pointer" }} />


                    </div>


                </div>




                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/20-Keys+Art+Basel/15.jpg" loading="lazy" alt="Keys Art Basel image" width="100%" height="100%" onClick={() => openModal(14)} style={{ cursor: "pointer" }} />
                    </div>




                </div>






            </div>





            <div className="rendering-layout">






            </div>




            <div className="rendering-layout">

                <div className="works-titles">

                    {displayedWorks.map((work, index) => (
                        <div className="blog-title-container" key={index} ref={(el) => {
                            if (el && !worksRefs.current.includes(el)) { // Only add if it's a new element
                                worksRefs.current[index] = el;
                            }
                        }}
                        >



                            <BlogPostButton post={work} />
                        </div>

                    ))}

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
                        alt={`Image ${currentIndex}`}
                        className="modal-image"
                    />
                </div>
            </ReactModal>



        </div >

        </>


    );
};

export default KeysArtBasel;
