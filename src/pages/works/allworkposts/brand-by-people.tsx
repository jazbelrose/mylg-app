import React, { useRef, useEffect, useState } from "react";

import { Helmet } from "react-helmet-async";

import { gsap } from "gsap";
import "./style.css";
import worksData from '../works.json';  
import brandByPeopleData from './brand-by-people.json';

import { InfoSection } from "../../../components/infosection/index.js";
import SingleTicker from "../../../components/singleticker";
import { useData } from "../../../app/contexts/DataProvider";
import ReactModal from "react-modal"; // Import ReactModal
import { useScrollContext } from "../../../app/contexts/ScrollContext";
import InlineSvg from "../../../components/inlinesvg";



const BrandByPeople = () => {

  const imageUrls = brandByPeopleData; 
  
  const galleryRefs = useRef([]);
  const { isLoading, setIsLoading, opacity } = useData();
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

    setCurrentIndex((prevIndex) => (prevIndex + 1) % imageUrls.length);

    setTimeout(() => {
      isTransitioning = false;
    }, 300); // Delay matches the animation duration
  };

  const prevImage = () => {
    if (isTransitioning) return; // Prevent multiple triggers
    isTransitioning = true;

    setCurrentIndex((prevIndex) => (prevIndex - 1 + imageUrls.length) % imageUrls.length);

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

  // Preload images
  useEffect(() => {
    let loadedImages = 0;
    const totalImages = imageUrls.length;

    const imageLoaded = () => {
      loadedImages++;
      if (loadedImages === totalImages) {
        setIsLoading(false);
      }
    };

    imageUrls.forEach(url => {
      const img = new Image();
      img.src = url;
      img.onload = imageLoaded;
      img.onerror = imageLoaded;
    });
  }, [imageUrls]);

  // GSAP animation after images have loaded

  useEffect(() => {
    if (!isLoading && svgReady) {
      const masterTimeline = gsap.timeline();

      // SVG Path Animation
      masterTimeline
        .to("#revealPath", {
          attr: { d: "M0,502S175,272,500,272s500,230,500,230V0H0Z" }, // Intermediate state
          duration: 0.75,
          ease: "Power1.easeIn"
        })
        .to("#revealPath", {
          attr: { d: "M0,2S175,1,500,1s500,1,500,1V0H0Z" }, // Final state
          duration: 0.5,
          ease: "power1.easeOut"
        });

      // Staggered Animations for SVG Elements
      masterTimeline.fromTo('.st1', { opacity: 0, y: -50 }, { opacity: 1, y: 0, duration: 0.1, stagger: 0.1 }, "-=0.25");
      masterTimeline.fromTo('.st2', { scale: 0 }, { scale: 1, duration: 1, stagger: 0.1, ease: 'elastic.out(1, 0.3)' }, "-=0.5");

      // Setting initial state for gallery items
      galleryRefs.current.forEach((galleryItem) => {
        gsap.set(galleryItem, { autoAlpha: 0, y: 50 });
      });

      // Intersection Observer for gallery items
      const observerOptions = {
        root: null,
        rootMargin: "-100px 0px",
        threshold: 0
      };

      const handleIntersection = (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            gsap.to(entry.target, {
              autoAlpha: 1,
              y: 0,
              ease: "power3.out",
              overwrite: "auto"
            });
          }
        });
      };

      const observer = new IntersectionObserver(handleIntersection, observerOptions);

      galleryRefs.current.forEach((galleryItem) => {
        if (galleryItem) {
          observer.observe(galleryItem);
        }
      });



      return () => {
        galleryRefs.current.forEach((galleryItem) => {
          if (galleryItem) {
            observer.unobserve(galleryItem);
          }
        });
        return () => masterTimeline.kill();
      }
    }
  }, [isLoading, svgReady]); // Dependency on isLoading

  if (isLoading) {
    return <div>

    </div>;

  }



  return (
    <>

    <Helmet>
                    <meta name="robots" content="noindex, nofollow" />
                    <title>Brand by People - *MYLG!*</title>
                  </Helmet>
            
      <div className={`${opacityClass} ${isModalOpen ? 'no-scroll' : ''}`}>
        <div className="svg-overlay">
          <svg viewBox="0 0 1000 1000" preserveAspectRatio="none">
            <path id="revealPath" d="M0,1005S175,995,500,995s500,5,500,5V0H0Z"></path>
          </svg>
        </div>


        <div className="workpage-heading">
          <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/brandbypeople/brandbypeopleheader.svg" onReady={() => setSvgReady(true)} />
        </div>

        <div className="container-restricted">

          <div className="mb-5 po_items_ho">
            {imageUrls.map((imageUrl, i) => (
              <div
                key={i}
                className="po_item"
                ref={(el) => (galleryRefs.current[i] = el)}
              >
                <div className="img-wrapper">
                  <img
                    src={imageUrl}
                    alt={`Image ${i + 1}`}
                    className="d-block w-100"
                    style={{ objectFit: "cover", width: "100%", height: "100%", cursor: "pointer" }}
                    onClick={() => openModal(i)} // Open modal on click
                  />
                </div>
              </div>
            ))}
          </div>

        </div>





        <div className="rendering-infosection">

          <hr style={{ opacity: "1", color: "fff", height: "2px", backgroundColor: "#fff", margin: "0.5rem", }} />
          <div className="rendering-infosection">



            <InfoSection />
            <hr style={{ opacity: "1", color: "fff", height: "2px", backgroundColor: "#fff", margin: "0.5rem", }} />

            <div className="single-ticker-section">

              <SingleTicker />
            </div>
          </div>

        </div>

        <ReactModal
          isOpen={isModalOpen}
          onRequestClose={closeModal}
          className="modal-content"
          overlayClassName="modal"
          ariaHideApp={false}
        >
          <div
            className="modal-content"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={imageUrls[currentIndex]}
              alt={`Modal Image ${currentIndex}`}
              className="modal-image"
            />
          </div>
        </ReactModal>

      </div>
    </>
  );
};

export default BrandByPeople;
