import React, { useEffect, useRef, useState, useLayoutEffect } from "react";
import { gsap } from "gsap";
import { CSSPlugin } from "gsap/CSSPlugin";
import { Helmet } from "react-helmet-async";
import worksDataJson from "./works.json"; // typed below
import "./style.css";
import { useData } from "../../app/contexts/DataProvider";
import { InfoSection } from "../../components/infosection";
import { BlogEntry } from "../../components/blogentry";
import allBlogPosts from "../blog/allblogposts/allBlogPosts.json";
import SingleTicker from "../../components/singleticker";
import BlogCard from "../../components/blogcard";
import { useScrollContext } from "../../app/contexts/ScrollContext";

gsap.registerPlugin(CSSPlugin);

// ---- Types ----
type WorkItem = {
  // adjust to your JSON shape; included common fields used by BlogCard spread
  title?: string;
  subtitle?: string;
  description?: string;
  imageSrc?: string;
  imageAlt?: string;
  linkUrl?: string;
  [key: string]: unknown;
};

type WorksProps = {
  maxPosts?: number;
};

// If your bundler needs it, add a module decl for JSON in a global.d.ts:
// declare module "*.json" { const v: any; export default v; }

export const Works: React.FC<WorksProps> = ({ maxPosts = 45 }) => {
  // Refs for animating rendered cards
  const blogPostRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Data / state
  const allWorks = (worksDataJson as WorkItem[]) ?? [];
  const [displayedWorks, setDisplayedWorks] = useState<WorkItem[]>(
    allWorks.slice(0, maxPosts)
  );

  // Opacity class from context
  const { opacity } = useData() as { opacity: number };
  const opacityClass = opacity === 1 ? "opacity-high" : "opacity-low";

  // Header hide/show on scroll
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const { updateHeaderVisibility } = useScrollContext();

  const handleWindowScroll = () => {
    const currentScrollPos =
      typeof window !== "undefined" ? window.scrollY : 0;
    if (currentScrollPos <= 5) {
      updateHeaderVisibility(true);
    } else {
      const isScrollingUp = prevScrollPos > currentScrollPos;
      updateHeaderVisibility(isScrollingUp);
    }
    setPrevScrollPos(currentScrollPos);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.addEventListener("scroll", handleWindowScroll);
    return () => window.removeEventListener("scroll", handleWindowScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevScrollPos]);

  // Log (optional)
  useEffect(() => {
    // helps ensure refs are set
    // console.log("Current blogPostRefs:", blogPostRefs.current);
  }, [displayedWorks]);

  // GSAP + IntersectionObserver entrance animations
  useLayoutEffect(() => {
    // Initial states
    setTimeout(() => {
      blogPostRefs.current.forEach((el, index) => {
        if (!el) return;
        if (index < 2) {
          gsap.set(el, { autoAlpha: 1, y: 0, scale: 1 });
        } else {
          gsap.set(el, { autoAlpha: 0, y: 50, scale: 0.8 });
        }
      });

      // Animate the first item in quickly (defensive)
      if (blogPostRefs.current[0]) {
        gsap.to(blogPostRefs.current[0], {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          ease: "power3.out",
          overwrite: "auto",
        });
      }

      const observerOptions: IntersectionObserverInit = {
        root: null,
        rootMargin: "-50px 50px",
        threshold: 0.1,
      };

      const handleIntersection: IntersectionObserverCallback = (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const tl = gsap.timeline();
            tl.to(entry.target, {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              ease: "power3.out",
              overwrite: "auto",
            });
          }
        });
      };

      const observer = new IntersectionObserver(
        handleIntersection,
        observerOptions
      );

      blogPostRefs.current.forEach((el) => {
        if (el) observer.observe(el);
      });

      return () => {
        blogPostRefs.current.forEach((el) => {
          if (el) observer.unobserve(el);
        });
        observer.disconnect();
      };
    }, 100);
  }, []);

  useEffect(() => {
    setDisplayedWorks(allWorks.slice(0, maxPosts));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxPosts]);

  // Lay out works in your 7-position pattern (with a double card at 3/4)
  const renderWorks = (works: WorkItem[]) => {
    const rendered: React.ReactNode[] = [];
    let i = 0;

    while (i < works.length) {
      const position = i % 7;
      switch (position) {
        case 0:
          rendered.push(
            <BlogCard
              key={i}
              type="works"
              className="works-row1-card"
              {...works[i]}
              layout="row1"
            />
          );
          i++;
          break;
        case 1:
          rendered.push(
            <BlogCard
              key={i}
              type="works"
              className="works-row3-card"
              {...works[i]}
              layout="row3"
            />
          );
          i++;
          break;
        case 2:
          rendered.push(
            <BlogCard key={i} type="works" {...works[i]} layout="row4" />
          );
          i++;
          break;
        case 3: // double card (3 & 4)
        case 4:
          rendered.push(
            <div className="blog-row double-card-row" key={`double-${i}`}>
              <BlogCard type="works" {...works[i]} layout="row2" />
              {works[i + 1] && (
                <BlogCard type="works" {...works[i + 1]} layout="row2" />
              )}
            </div>
          );
          i += 2;
          break;
        case 5:
          rendered.push(
            <BlogCard key={i} type="works" {...works[i]} layout="row4" />
          );
          i++;
          break;
        case 6:
          rendered.push(
            <BlogCard
              key={i}
              type="works"
              className="works-row3-card"
              {...works[i]}
              layout="row3"
            />
          );
          i++;
          break;
        default:
          i++;
          break;
      }
    }

    // wrap each rendered node with a ref holder div for animations
    return rendered.map((node, idx) => (
      <div
        key={idx}
        ref={(el) => {
          blogPostRefs.current[idx] = el;
        }}
      >
        {node}
      </div>
    ));
  };

  return (
    <>
      <Helmet>
        <meta charSet="utf-8" />
        <title>Our Work - MYLG</title>
        <meta
          name="description"
          content="Explore our portfolio of purposeful branding and immersive digital designs. See how we bring visions to life with precision and creativity."
        />
        <meta name="keywords" content="branding, digital design, portfolio, creative agency, MYLG" />
        <meta property="og:title" content="Our Work - *MYLG!*" />
        <meta
          property="og:description"
          content="Purposeful branding and immersive digital designs by MYLG. Check out our creative solutions for various clients."
        />
        <meta
          property="og:image"
          content="https://d2qb21tb4meex0.cloudfront.net/Iphone+14+mockup+sign+up.png"
        />
        <meta property="og:url" content="https://mylg.studio/works" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Our Work - MYLG" />
        <meta
          name="twitter:description"
          content="Explore our portfolio of purposeful branding and immersive digital designs."
        />
        <meta
          name="twitter:image"
          content="https://d2qb21tb4meex0.cloudfront.net/Iphone+14+mockup+sign+up.png"
        />
        <link rel="icon" href="/path-to-favicon.png" type="image/png" />
      </Helmet>

      <div className={`workspage-container ${opacityClass}`}>
        <div className="works-heading">
          <div className="works-top-row">
            <div className="works-header">
              <h2>Our Work</h2>
            </div>
            <span className="arrow-down works-arrow">↓</span>
          </div>
          <div className="works-subheader">
            <h3>
              Purposeful branding & <br />
              immersive digital
            </h3>
          </div>
        </div>

        <div className="works-container">
          <div className="blog-section">{renderWorks(displayedWorks)}</div>
        </div>
      </div>

      <div className="footer-blog-section">
        <div className="blog-header">
          <h2>Blog</h2>
          <span className="arrow-down blog-arrow">↓</span>
        </div>
        <div className="blog-grid">
          {(allBlogPosts as any[]).slice(5, 10).map((post, index) => (
            <BlogEntry post={post} key={index} />
          ))}
        </div>
      </div>

      <hr style={{ opacity: 1, color: "fff", height: "2px", backgroundColor: "#fff" }} />
      <InfoSection />
      <hr style={{ opacity: 1, color: "fff", height: "2px", backgroundColor: "#fff" }} />
      <div className="single-ticker-section">
        <SingleTicker />
      </div>
    </>
  );
};

export default Works;
