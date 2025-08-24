import React, { useRef, useEffect, useLayoutEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { gsap } from "gsap";
import "./style.css";

import aFLowerBathData from "./A-Flower-Bath.json";
import { InfoSection } from "../../../components/infosection";
import SingleTicker from "../../../components/singleticker";
import { useData } from "../../../app/contexts/DataProvider";
import ReactModal from "react-modal";
import { useScrollContext } from "../../../app/contexts/ScrollContext";

/** Inline remote SVG so GSAP can target its inner nodes */
function InlineSvg({ src, className, onReady }) {
  const hostRef = useRef(null);
  const [markup, setMarkup] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(src, { cache: "force-cache" });
        const text = await res.text();
        const safe = text.replace(/<script[\s\S]*?<\/script>/gi, "");
        if (!alive) return;
        setMarkup(safe);
        // Wait a microtask so the DOM parses the <svg/> we just injected
        queueMicrotask(() => {
          const svgEl = hostRef.current?.querySelector("svg");
          onReady?.(svgEl || null);
        });
      } catch (e) {
        // optional: console.error(e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [src, onReady]);

  return (
    <span
      ref={hostRef}
      className={className}
      style={{ display: "block", lineHeight: 0 }}
      dangerouslySetInnerHTML={{ __html: markup }}
      aria-hidden="true"
    />
  );
}

const AFLowerBath = () => {
  const imageUrls = aFLowerBathData;

  const { isLoading, setIsLoading, opacity } = useData();
  const opacityClass = opacity === 1 ? "opacity-high" : "opacity-low";
  const { updateHeaderVisibility } = useScrollContext();

  const [isModalOpen, setModalOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [prevScrollPos, setPrevScrollPos] = useState(0);

  const [svgReady, setSvgReady] = useState(false);
  const headerSvgRef = useRef(null); // <svg> element once inlined
  const pageScopeRef = useRef(null);  // root node for gsap.context
  const galleryRefs = useRef([]);     // fade-in items

  let isTransitioning = false;
  const nextImage = () => {
    if (isTransitioning) return;
    isTransitioning = true;
    setCurrentIndex((i) => (i + 1) % imageUrls.length);
    setTimeout(() => (isTransitioning = false), 300);
  };
  const prevImage = () => {
    if (isTransitioning) return;
    isTransitioning = true;
    setCurrentIndex((i) => (i - 1 + imageUrls.length) % imageUrls.length);
    setTimeout(() => (isTransitioning = false), 300);
  };

  const openModal = (i) => {
    setCurrentIndex(i);
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  // Header hide/show on scroll
  const handleWindowScroll = () => {
    const y = window.scrollY;
    if (y <= 5) {
      updateHeaderVisibility(true);
    } else {
      const up = prevScrollPos > y;
      updateHeaderVisibility(up);
    }
    setPrevScrollPos(y);
  };

  // Keyboard arrows for modal
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") nextImage();
      else if (e.key === "ArrowLeft") prevImage();
      else if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Touch swipe for modal
  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX);
  const handleTouchMove = (e) => setTouchEnd(e.touches[0].clientX);
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const delta = touchStart - touchEnd;
    const threshold = 50;
    if (Math.abs(delta) > threshold) delta > 0 ? nextImage() : prevImage();
    setTouchStart(0);
    setTouchEnd(0);
  };

  // Prevent page scroll when modal is open (+ iOS touchmove)
  useEffect(() => {
    const preventDefault = (e) => e.preventDefault();
    if (isModalOpen) {
      document.body.classList.add("no-scroll");
      document.body.style.overflow = "hidden";
      document.addEventListener("touchmove", preventDefault, { passive: false });
    } else {
      document.body.classList.remove("no-scroll");
      document.body.style.overflow = "";
      document.removeEventListener("touchmove", preventDefault);
    }
    return () => {
      document.body.classList.remove("no-scroll");
      document.body.style.overflow = "";
      document.removeEventListener("touchmove", preventDefault);
    };
  }, [isModalOpen]);

  // Scroll handler attach/detach
  useEffect(() => {
    window.addEventListener("scroll", handleWindowScroll);
    return () => window.removeEventListener("scroll", handleWindowScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevScrollPos]);

  // Preload images → setIsLoading(false) when done
  useEffect(() => {
    let done = 0;
    const total = imageUrls.length || 0;
    if (total === 0) {
      setIsLoading(false);
      return;
    }
    const onOne = () => {
      done += 1;
      if (done === total) setIsLoading(false);
    };
    const imgs = imageUrls.map((url) => {
      const img = new Image();
      img.onload = onOne;
      img.onerror = onOne;
      img.src = url;
      return img;
    });
    return () => {
      // allow GC
      imgs.forEach((img) => (img.onload = img.onerror = null));
    };
  }, [imageUrls, setIsLoading]);

  // (A) Overlay reveal runs when images are ready (independent of header SVG)
  useLayoutEffect(() => {
    if (isLoading) return;
    const tl = gsap.timeline();
    tl.to("#revealPath", {
      attr: { d: "M0,502S175,272,500,272s500,230,500,230V0H0Z" },
      duration: 0.75,
      ease: "power1.in",
    }).to("#revealPath", {
      attr: { d: "M0,2S175,1,500,1s500,1,500,1V0H0Z" },
      duration: 0.5,
      ease: "power1.out",
    });
    return () => tl.kill();
  }, [isLoading]);

  // (B) Header SVG animates once the inline SVG is present
  useLayoutEffect(() => {
    if (!svgReady) return;
    const tl = gsap.timeline();
    if (headerSvgRef.current) {
      const svg = headerSvgRef.current;
      const st1 = svg.querySelectorAll(".st1");
      const st2 = svg.querySelectorAll(".st2");
      tl.fromTo(
        st1,
        { opacity: 0, y: -50 },
        { opacity: 1, y: 0, duration: 0.1, stagger: 0.1 }
      ).fromTo(
        st2,
        { scale: 0 },
        { scale: 1, duration: 1, stagger: 0.1, ease: "elastic.out(1, 0.3)" },
        "-=0.4"
      );
    }
    return () => tl.kill();
  }, [svgReady]);

  // (C) Gallery reveal on scroll (restore IntersectionObserver)
  useEffect(() => {
    if (isLoading) return;
    // Set initial hidden state
    galleryRefs.current.forEach((el) => el && gsap.set(el, { autoAlpha: 0, y: 50 }));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            gsap.to(entry.target, {
              autoAlpha: 1,
              y: 0,
              duration: 0.5,
              ease: "power3.out",
              overwrite: "auto",
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: "-100px 0px", threshold: 0 }
    );
    galleryRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [isLoading]);

  if (isLoading) {
    return <div />; // your loader if any
  }

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>A Flower Bath - *MYLG!*</title>
      </Helmet>

      <div
        ref={pageScopeRef}
        className={`${opacityClass} ${isModalOpen ? "no-scroll" : ""}`}
      >
        {/* Overlay reveal mask */}
        <div className="svg-overlay">
          <svg viewBox="0 0 1000 1000" preserveAspectRatio="none">
            <path
              id="revealPath"
              d="M0,1005S175,995,500,995s500,5,500,5V0H0Z"
            />
          </svg>
        </div>

        {/* Remote SVG header (animated) */}
        <div className="workpage-heading">
          <InlineSvg
            src="https://d2qb21tb4meex0.cloudfront.net/svg/aflowerbathheader.svg"
            onReady={(el) => {
              headerSvgRef.current = el;
              setSvgReady(Boolean(el));
            }}
          />
        </div>

        {/* Gallery */}
        <div className="container-restricted">
          <div className="mb-5 po_items_ho">
            {imageUrls.map((url, i) => (
              <div
                key={i}
                className="po_item"
                ref={(el) => (galleryRefs.current[i] = el)}
              >
                <div className="img-wrapper">
                  <img
                    src={url}
                    alt={`Image ${i + 1}`}
                    className="d-block w-100"
                    style={{
                      objectFit: "cover",
                      width: "100%",
                      height: "100%",
                      cursor: "pointer",
                    }}
                    onClick={() => openModal(i)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info + ticker */}
        <div className="rendering-infosection">
          <hr
            style={{
              opacity: "1",
              color: "fff",
              height: "2px",
              backgroundColor: "#fff",
              margin: "0.5rem",
            }}
          />
          <div className="rendering-infosection">
            <InfoSection />
            <hr
              style={{
                opacity: "1",
                color: "fff",
                height: "2px",
                backgroundColor: "#fff",
                margin: "0.5rem",
              }}
            />
            <div className="single-ticker-section">
              <SingleTicker />
            </div>
          </div>
        </div>

        {/* Modal */}
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

export default AFLowerBath;
