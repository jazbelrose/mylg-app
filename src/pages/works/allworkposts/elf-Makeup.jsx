import React, { useRef, useEffect, useState } from "react";
import { Helmet, HelmetProvider } from "react-helmet-async";

import { gsap } from "gsap";
import "./style.css";
import ReactModal from "react-modal";


import { useScrollContext } from "../../../app/contexts/ScrollContext";
// import { usePreventScroll } from "@react-aria/overlays";

import works from '../works.json';
import BlogPostButton from "../../../components/blogpostbutton/BlogPostButton.js";



import { InfoSection } from "../../../components/infosection/index.js";
import SingleTicker from "../../../components/singleticker/index.jsx";
import { useData } from "../../../app/contexts/DataProvider";
import InlineSvg from "../../../components/inlinesvg/index.jsx";




const ElfMakeup = () => {

    const pageTitle = "Elf Makeup Booth Design at NYLON House - Miami";
    const pageDescription =
        "Explore the exclusive e.l.f. Makeup Lounge at NYLON House Strawberry Moon in Miami, featuring a Mokibaby infinity mirror photo booth, touch-up sessions with top e.l.f. artists, and a skincare room showcasing the latest innovations. Conceptualized and executed by *MYLG!*.";
    const canonicalUrl = "https://mylg.studio/works/elf-Makeup";
    const ogImage = "https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/05.jpg";

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        "name": "Elf Makeup Booth Design at NYLON House",
        "description": pageDescription,
        "image": ogImage,
        "url": canonicalUrl,
        "creator": {
            "@type": "Organization",
            "name": "*MYLG!*",
        },
        "locationCreated": {
            "@type": "Place",
            "name": "Nylon House Strawberry Moon, Miami",
            "address": {
                "@type": "PostalAddress",
                "streetAddress": "2341 Collins Ave",
                "addressLocality": "Miami Beach",
                "addressRegion": "FL",
                "postalCode": "33139",
                "addressCountry": "US",
            },
        },
        "hasPart": [
            {
                "@type": "CreativeWork",
                "name": "Infinity Mirror Photo Booth",
                "description":
                    "An interactive photo booth featuring a Mokibaby infinity mirror, designed for the e.l.f. Makeup Lounge at NYLON House.",
            },
            {
                "@type": "CreativeWork",
                "name": "Touch-Up Sessions",
                "description":
                    "Personalized makeup touch-up sessions with top e.l.f. artists at the NYLON House event.",
            },
            {
                "@type": "CreativeWork",
                "name": "Skincare Innovations",
                "description":
                    "Showcasing the latest skincare innovations by e.l.f. Cosmetics in a specially designed space.",
            },
        ],
    };

    const { opacity } = useData();
    const opacityClass = opacity === 1 ? 'opacity-high' : 'opacity-low';
    const { isHeaderVisible, updateHeaderVisibility } = useScrollContext();
    const [isModalOpen, setModalOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [svgReady, setSvgReady] = useState(false);


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




    // const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    // if (isMobile) {
    //   usePreventScroll({ isDisabled: !isModalOpen });
    // }



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


    useEffect(() => {
        window.addEventListener("scroll", handleWindowScroll);
        return () => {
            window.removeEventListener("scroll", handleWindowScroll);
        };
    }, [prevScrollPos]);

    useEffect(() => {
        if (isModalOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = ""; // Cleanup on unmount
        };
    }, [isModalOpen]);







    const [touchStart, setTouchStart] = useState(0);
    const [touchEnd, setTouchEnd] = useState(0);


    const images = [
        "https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/05.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/06.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/07.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/08.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/09.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/10.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/11.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/12.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/13.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/19.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/28.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/22.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/24.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/26.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/23.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/20.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/27.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/25.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/30.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/21.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/29.jpg"
    ];



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
        }, 300);
    };

    let isTransitioning = false;



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






    useEffect(() => {
        if (isModalOpen) {
            gsap.fromTo(".modal", {
                opacity: 0
            }, {
                opacity: 1,
                duration: 0.3
            });
        }
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
                <meta name="twitter:image:alt" content="Elf Makeup Booth at NYLON House Miami" />
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
                    <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/elf-makeup/elfmakeupheader.svg" onReady={() => setSvgReady(true)} />
                </div>
                <div className="rendering-layout">





                    <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/elf-makeup/row0.svg" className="rendering-row" />


                    <div className="rendering-row-img">

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/05.jpg" loading="lazy" alt="Academy of Pop Image" width="100%" height="100%" onClick={() => openModal(0)} style={{ cursor: "pointer" }} />
                        </div>


                    </div>

                    <div className="rendering-row-img">

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/06.jpg" loading="lazy" alt="Academy of Pop Image" width="100%" height="100%" onClick={() => openModal(1)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/07.jpg" loading="lazy" alt="Academy of Pop Image" width="100%" height="100%" onClick={() => openModal(2)} style={{ cursor: "pointer" }} />
                        </div>



                    </div>


                    <div className="rendering-row-img">

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/08.jpg" loading="lazy" alt="Academy of Pop Image" width="100%" height="100%" onClick={() => openModal(3)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/09.jpg" loading="lazy" alt="Academy of Pop Image" width="100%" height="100%" onClick={() => openModal(4)} style={{ cursor: "pointer" }} />
                        </div>



                    </div>

                    <div className="rendering-row-img">


                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/10.jpg" loading="lazy" alt="Academy of Pop Image" width="100%" height="100%" onClick={() => openModal(5)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/11.jpg" loading="lazy" alt="Academy of Pop Image" width="100%" height="100%" onClick={() => openModal(6)} style={{ cursor: "pointer" }} />
                        </div>



                    </div>
                    <div className="rendering-row-img">


                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/12.jpg" loading="lazy" alt="Academy of Pop Image" width="100%" height="100%" onClick={() => openModal(7)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/13.jpg" loading="lazy" alt="Academy of Pop Image" width="100%" height="100%" onClick={() => openModal(8)} style={{ cursor: "pointer" }} />
                        </div>



                    </div>

                    <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/elf-makeup/row1.svg" className="rendering-row" />

                    <div className="rendering-row-img">


                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/19.jpg" loading="lazy" alt="Academy of Pop Image" width="100%" height="100%" onClick={() => openModal(9)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/28.jpg" loading="lazy" alt="Academy of Pop Image" width="100%" height="100%" onClick={() => openModal(10)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/22.jpg" loading="lazy" alt="Academy of Pop Image" width="100%" height="100%" onClick={() => openModal(11)} style={{ cursor: "pointer" }} />
                        </div>


                    </div>

                    <div className="rendering-row-img">


                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/24.jpg" loading="lazy" alt="Academy of Pop Image" width="100%" height="100%" onClick={() => openModal(12)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/26.jpg" loading="lazy" alt="Academy of Pop Image" width="100%" height="100%" onClick={() => openModal(13)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/23.jpg" loading="lazy" alt="Academy of Pop Image" width="100%" height="100%" onClick={() => openModal(14)} style={{ cursor: "pointer" }} />
                        </div>


                    </div>

                    <div className="rendering-row-img">


                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/20.jpg" loading="lazy" alt="Academy of Pop Image" width="100%" height="100%" onClick={() => openModal(15)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/27.jpg" loading="lazy" alt="Academy of Pop Image" width="100%" height="100%" onClick={() => openModal(16)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/25.jpg" loading="lazy" alt="Academy of Pop Image" width="100%" height="100%" onClick={() => openModal(17)} style={{ cursor: "pointer" }} />
                        </div>


                    </div>

                    <div className="rendering-row-img">


                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/30.jpg" loading="lazy" alt="Academy of Pop Image" width="100%" height="100%" onClick={() => openModal(18)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/21.jpg" loading="lazy" alt="Academy of Pop Image" width="100%" height="100%" onClick={() => openModal(19)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/08-elf+Makeup/29.jpg" loading="lazy" alt="Academy of Pop Image" width="100%" height="100%" onClick={() => openModal(20)} style={{ cursor: "pointer" }} />
                        </div>


                    </div>











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


export default ElfMakeup;
