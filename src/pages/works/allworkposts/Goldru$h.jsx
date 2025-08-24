import React, { useRef, useEffect, useState } from "react";

import { Helmet } from "react-helmet-async";

import { gsap } from "gsap";
import "./style.css";
import ReactModal from "react-modal";
import { useScrollContext } from "../../../app/contexts/ScrollContext";






import Ticker from "../../../components/ticker/index.jsx";
import { InfoSection } from "../../../components/infosection/index.js";
import SingleTicker from "../../../components/singleticker/index.jsx";

import { useData } from "../../../app/contexts/DataProvider";
import InlineSvg from "../../../components/inlinesvg/index.jsx";

const Goldru$h = () => {

 

    const images = [

        "https://d2qb21tb4meex0.cloudfront.net/15-Lipography/001.png",
        null,
        "https://d2qb21tb4meex0.cloudfront.net/15-Lipography/003.png",
        null,
        "https://d2qb21tb4meex0.cloudfront.net/15-Lipography/005.png",
        null,
        "https://d2qb21tb4meex0.cloudfront.net/15-Lipography/007.png",
        "https://d2qb21tb4meex0.cloudfront.net/15-Lipography/008.png",
        "https://d2qb21tb4meex0.cloudfront.net/15-Lipography/009.png",
        "https://d2qb21tb4meex0.cloudfront.net/15-Lipography/010.png",
        "https://d2qb21tb4meex0.cloudfront.net/15-Lipography/011.png",
        "https://d2qb21tb4meex0.cloudfront.net/15-Lipography/012.png",
        "https://d2qb21tb4meex0.cloudfront.net/15-Lipography/013.png",
        null,
        "https://d2qb21tb4meex0.cloudfront.net/15-Lipography/015.png",
        "https://d2qb21tb4meex0.cloudfront.net/15-Lipography/016.png",
        "https://d2qb21tb4meex0.cloudfront.net/15-Lipography/017.png",
        "https://d2qb21tb4meex0.cloudfront.net/15-Lipography/018.png",
        "https://d2qb21tb4meex0.cloudfront.net/15-Lipography/019.png",
        "https://d2qb21tb4meex0.cloudfront.net/15-Lipography/020.png",
        "https://d2qb21tb4meex0.cloudfront.net/15-Lipography/021-01.png",
        "https://d2qb21tb4meex0.cloudfront.net/15-Lipography/022.png"
    ]


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
        if (isTransitioning) return; // Prevent multiple triggers
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
        } else {
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
            masterTimeline.fromTo(
                ".st2",
                {
                    opacity: 0,
                    y: -50,
                },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.1,
                    stagger: 0.1,
                },
                "-=0.25" // Slight overlap with the path animation
            );
    
            masterTimeline.fromTo(
                ".st2",
                {
                    scale: 0,
                },
                {
                    scale: 1,
                    duration: 1,
                    stagger: 0.1,
                    ease: "elastic.out(1, 0.3)",
                },
                "-=0.5" // Slight overlap with the path animation
            );
    
            // Animate each `st6` with stagger
            masterTimeline.fromTo(
                "#vector-detail-group--left- .st6",
                { opacity: 0, y: -20 },
                { opacity: 1, y: 0, duration: 0.4, ease: "power2.out", stagger: 0.1 },
                "+=0.2" // Start after `.st2` animations
            );
    
            // Animate each `st5` with stagger
            masterTimeline.fromTo(
                "#vector-detail-group-right-section-1-right .st5",
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.4, ease: "power2.out", stagger: 0.1 },
                "<" // Start at the same time as the left group
            );
    
            // Subtle scaling for all `st5` and `st6` elements
            masterTimeline.fromTo(
                "g .st6, g .st5",
                { scale: 0.95 },
                { scale: 1, duration: 0.5, ease: "power1.out" },
                "-=0.3" // Slight overlap for smoother integration
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
                <meta name="robots" content="noindex, nofollow" />
                <title>Goldru$h - *MYLG!*</title>
              </Helmet>

        <div className={`${opacityClass} ${isModalOpen ? 'no-scroll' : ''}`}>

            <div className="svg-overlay">
                <svg viewBox="0 0 1000 1000" preserveAspectRatio="none">
                    <path id="revealPath" d="M0,1005S175,995,500,995s500,5,500,5V0H0Z"></path>
                </svg>
            </div>


            <div className="workpage-heading">
                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/goldru$h/goldru$h-header.svg" onReady={() => setSvgReady(true)} />
            </div>
            <div className="rendering-layout">



                <div className="rendering-row-img"  >

                    <div className="img-container ">


                        <img src="https://d2qb21tb4meex0.cloudfront.net/15-Lipography/001.png" loading="lazy" alt="GoldRu$h Image" width="100%" height="100%" onClick={() => openModal(0)} style={{ cursor: "pointer" }} />
                    </div>


                </div>

                <div className="rendering-row-img" style={{ paddingBottom: "15px" }} >

                    <div className="img-container " >


                        <img src="https://d2qb21tb4meex0.cloudfront.net/15-Lipography/002.png" loading="lazy" alt="GoldRu$h Image" width="100%" height="100%"  />
                    </div>


                </div>
                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d2qb21tb4meex0.cloudfront.net/15-Lipography/003.png" loading="lazy" alt="GoldRu$h Image" width="100%" height="100%" onClick={() => openModal(2)} style={{ cursor: "pointer" }} />
                    </div>


                </div>
                <div className="rendering-row-img" style={{ paddingBottom: "15px", paddingTop:"15px" }}>

                    <div className="img-container ">


                        <img src="https://d2qb21tb4meex0.cloudfront.net/15-Lipography/004.png" loading="lazy" alt="GoldRu$h Image" width="100%" height="100%"  />
                    </div>


                </div>
                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d2qb21tb4meex0.cloudfront.net/15-Lipography/005.png" loading="lazy" alt="GoldRu$h Image" width="100%" height="100%" onClick={() => openModal(4)} style={{ cursor: "pointer" }} />
                    </div>


                </div>

                <div className="rendering-row-img" style={{ paddingBottom: "15px" , paddingTop:"15px"  }}>

                    <div className="img-container ">


                        <img src="https://d2qb21tb4meex0.cloudfront.net/15-Lipography/006.png" loading="lazy" alt="GoldRu$h Image" width="100%" height="100%"  />
                    </div>


                </div>

                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d2qb21tb4meex0.cloudfront.net/15-Lipography/007.png" loading="lazy" alt="GoldRu$h Image" width="100%" height="100%" onClick={() => openModal(6)} style={{ cursor: "pointer" }} />
                    </div>

                    <div className="img-container ">


                        <img src="https://d2qb21tb4meex0.cloudfront.net/15-Lipography/008.png" loading="lazy" alt="GoldRu$h Image" width="100%" height="100%" onClick={() => openModal(7)} style={{ cursor: "pointer" }} />
                    </div>


                </div>

                

                    <div className="grid-container-gca second-grid-gca" style={{ gridTemplateColumns: "0.7fr 0.5fr", paddingTop:".6vh", }}>


                        <div className="full-height-column-gca content-item">
                            <img src="https://d2qb21tb4meex0.cloudfront.net/15-Lipography/009.png" loading="lazy" alt="GoldRu$h Image" width="100%" height="100%" onClick={() => openModal(8)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="column-gca">
                            <div className="top-row-gca content-item"> <img src="https://d2qb21tb4meex0.cloudfront.net/15-Lipography/010.png" loading="lazy" alt="GoldRu$h Image" width="100%" onClick={() => openModal(9)} style={{ cursor: "pointer" }} />
                            </div>
                            <div className="bottom-row-gca content-item"> <img src="https://d2qb21tb4meex0.cloudfront.net/15-Lipography/011.png" loading="lazy" alt="GoldRu$h Image" width="100%" onClick={() => openModal(10)} style={{ cursor: "pointer" }} />
                            </div>
                        </div>

                    </div>
               

                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d2qb21tb4meex0.cloudfront.net/15-Lipography/012.png" loading="lazy" alt="GoldRu$h Image" width="100%" height="100%" onClick={() => openModal(11)} style={{ cursor: "pointer" }} />
                    </div>

                    <div className="img-container ">


                        <img src="https://d2qb21tb4meex0.cloudfront.net/15-Lipography/013.png" loading="lazy" alt="GoldRu$h Image" width="100%" height="100%" onClick={() => openModal(12)} style={{ cursor: "pointer" }} />
                    </div>


                </div>

                <div className="rendering-row-img" style={{ paddingBottom: "15px", paddingTop:"15px"  }}>

                    <div className="img-container ">


                        <img src="https://d2qb21tb4meex0.cloudfront.net/15-Lipography/014.png" loading="lazy" alt="GoldRu$h Image" width="100%" height="100%"  />
                    </div>


                </div>

                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d2qb21tb4meex0.cloudfront.net/15-Lipography/015.png" loading="lazy" alt="GoldRu$h Image" width="100%" height="100%" onClick={() => openModal(14)} style={{ cursor: "pointer" }} />
                    </div>

                    <div className="img-container ">


                        <img src="https://d2qb21tb4meex0.cloudfront.net/15-Lipography/016.png" loading="lazy" alt="GoldRu$h Image" width="100%" height="100%" onClick={() => openModal(15)} style={{ cursor: "pointer" }} />
                    </div>


                </div>

               

                    <div className="grid-container-gca second-grid-gca" style={{ gridTemplateColumns: "0.7fr 0.5fr", paddingTop:".6vh" }}>


                        <div className="full-height-column-gca content-item">
                            <img src="https://d2qb21tb4meex0.cloudfront.net/15-Lipography/017.png" loading="lazy" alt="GoldRu$h Image" width="100%" height="100%" onClick={() => openModal(16)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="column-gca">
                            <div className="top-row-gca content-item"> <img src="https://d2qb21tb4meex0.cloudfront.net/15-Lipography/018.png" loading="lazy" alt="GoldRu$h Image" width="100%" onClick={() => openModal(17)} style={{ cursor: "pointer" }} />
                            </div>
                            <div className="bottom-row-gca content-item"> <img src="https://d2qb21tb4meex0.cloudfront.net/15-Lipography/019.png" loading="lazy" alt="GoldRu$h Image" width="100%" onClick={() => openModal(18)} style={{ cursor: "pointer" }} />
                            </div>
                        </div>

                    </div>
             

                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d2qb21tb4meex0.cloudfront.net/15-Lipography/020.png" loading="lazy" alt="GoldRu$h Image" width="100%" height="100%" onClick={() => openModal(19)} style={{ cursor: "pointer" }} />
                    </div>


                </div>

                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d2qb21tb4meex0.cloudfront.net/15-Lipography/021-01.png" loading="lazy" alt="GoldRu$h Image" width="100%" height="100%" onClick={() => openModal(20)} style={{ cursor: "pointer" }} />
                    </div>

                    <div className="img-container ">


                        <img src="https://d2qb21tb4meex0.cloudfront.net/15-Lipography/022.png" loading="lazy" alt="GoldRu$h Image" width="100%" height="100%" onClick={() => openModal(21)} style={{ cursor: "pointer" }} />
                    </div>


                </div>




            </div>

            <div className="rendering-infosection">

            <hr style={{ opacity: "1", color: "fff", height: "2px", backgroundColor: "#fff", margin: "0.5rem", }} />


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

export default Goldru$h;
