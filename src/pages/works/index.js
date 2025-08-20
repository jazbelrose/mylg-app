import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useRef, useState, useLayoutEffect } from "react";
import { gsap } from "gsap";
import { CSSPlugin } from "gsap/CSSPlugin";
import { Helmet, HelmetProvider } from "react-helmet-async";
import worksData from './works.json'; // Adjust the path based on your file structure
import "./style.css";
import { useData } from "../../app/contexts/DataProvider";
import { InfoSection } from "../../components/infosection";
import { BlogEntry } from '../../components/blogentry';
import allBlogPosts from '../blog/allblogposts/allBlogPosts.json';
import SingleTicker from "../../components/singleticker";
import BlogCard from "../../components/blogcard";
import { useScrollContext } from "../../app/contexts/ScrollContext";
gsap.registerPlugin(CSSPlugin);
export const Works = ({ maxPosts = 45 }) => {
    let blogPostRefs = useRef([]);
    let worksRefs = useRef([]);
    const [displayedWorks, setDisplayedWorks] = useState(worksData.slice(0, maxPosts));
    const { opacity } = useData();
    const opacityClass = opacity === 1 ? 'opacity-high' : 'opacity-low';
    const scrollableDivRef = useRef(null);
    const [prevScrollPos, setPrevScrollPos] = useState(0);
    const { isHeaderVisible, updateHeaderVisibility } = useScrollContext();
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
    useEffect(() => {
        window.addEventListener("scroll", handleWindowScroll);
        return () => {
            window.removeEventListener("scroll", handleWindowScroll);
        };
    }, [prevScrollPos]);
    useEffect(() => {
        console.log("Current worksRefs:", worksRefs.current);
    }, [displayedWorks]);
    useLayoutEffect(() => {
        setTimeout(() => {
            blogPostRefs.current.forEach((galleryItem, index) => {
                if (index < 2) {
                    gsap.set(galleryItem, { autoAlpha: 1, y: 0, scale: 1 });
                }
                else {
                    // For the rest, set their initial state to be invisible
                    gsap.set(galleryItem, { autoAlpha: 0, y: 50, scale: 0.8 });
                }
            });
            worksRefs.current.forEach((workItem) => {
                gsap.set(workItem, { autoAlpha: 0, y: 50, scale: 0.8 });
            });
            gsap.to(blogPostRefs.current[0], { autoAlpha: 1, y: 0, scale: 1, ease: "power3.out", overwrite: "auto" });
            const observerOptions = {
                root: null,
                rootMargin: "-50px 50px",
                threshold: 0.1
            };
            const handleIntersection = (entries) => {
                entries.forEach((entry) => {
                    console.log("Observed:", entry.target); // Debugging line
                    if (entry.isIntersecting) {
                        console.log("Animating:", entry.target); // Debugging line
                        const tl = gsap.timeline();
                        tl.to(entry.target, {
                            autoAlpha: 1,
                            y: 0,
                            scale: 1,
                            ease: "power3.out",
                            overwrite: "auto"
                        });
                    }
                });
            };
            const observer = new IntersectionObserver(handleIntersection, observerOptions);
            blogPostRefs.current.forEach((blogItem) => {
                if (blogItem) {
                    observer.observe(blogItem);
                }
            });
            worksRefs.current.forEach((workItem) => {
                if (workItem) {
                    observer.observe(workItem);
                }
            });
            return () => {
                if (blogPostRefs.current) {
                    blogPostRefs.current.forEach((blogItem) => {
                        if (blogItem) {
                            observer.unobserve(blogItem);
                        }
                    });
                }
                if (worksRefs.current) {
                    worksRefs.current.forEach((workItem) => {
                        if (workItem) {
                            observer.unobserve(workItem);
                        }
                    });
                }
                observer.disconnect();
            };
        }, 100);
    }, []);
    useEffect(() => {
        setDisplayedWorks(worksData.slice(0, maxPosts));
    }, []);
    const renderWorks = (works) => {
        let renderedCards = [];
        let currentIndex = 0;
        while (currentIndex < works.length) {
            let position = currentIndex % 7; // Modulo 7 for the desired pattern with double card
            switch (position) {
                case 0:
                    renderedCards.push(_jsx(BlogCard, { type: "works", className: "works-row1-card", ...works[currentIndex], layout: "row1" }, currentIndex));
                    currentIndex++;
                    break;
                case 1:
                    renderedCards.push(_jsx(BlogCard, { type: "works", className: "works-row3-card", ...works[currentIndex], layout: "row3" }, currentIndex));
                    currentIndex++;
                    break;
                case 2:
                    renderedCards.push(_jsx(BlogCard, { type: "works", ...works[currentIndex], layout: "row4" }, currentIndex));
                    currentIndex++;
                    break;
                case 3: // Double card
                case 4:
                    renderedCards.push(_jsxs("div", { className: "blog-row double-card-row", children: [_jsx(BlogCard, { type: "works", ...works[currentIndex], layout: "row2" }), works[currentIndex + 1] && _jsx(BlogCard, { type: "works", ...works[currentIndex + 1], layout: "row2" })] }, currentIndex));
                    currentIndex += 2;
                    break;
                case 5:
                    renderedCards.push(_jsx(BlogCard, { type: "works", ...works[currentIndex], layout: "row4" }, currentIndex));
                    currentIndex++;
                    break;
                case 6:
                    renderedCards.push(_jsx(BlogCard, { type: "works", className: "works-row3-card", ...works[currentIndex], layout: "row3" }, currentIndex));
                    currentIndex++;
                    break;
                default:
                    break;
            }
        }
        return renderedCards.map((card, index) => (_jsx("div", { ref: (el) => { blogPostRefs.current[index] = el; }, children: card }, index)));
    };
    return (_jsxs(_Fragment, { children: [_jsxs(Helmet, { children: [_jsx("meta", { charSet: "utf-8" }), _jsx("title", { children: "Our Work - MYLG" }), _jsx("meta", { name: "description", content: "Explore our portfolio of purposeful branding and immersive digital designs. See how we bring visions to life with precision and creativity." }), _jsx("meta", { name: "keywords", content: "branding, digital design, portfolio, creative agency, MYLG" }), _jsx("meta", { property: "og:title", content: "Our Work - *MYLG!*" }), _jsx("meta", { property: "og:description", content: "Purposeful branding and immersive digital designs by MYLG. Check out our creative solutions for various clients." }), _jsx("meta", { property: "og:image", content: "https://d2qb21tb4meex0.cloudfront.net/Iphone+14+mockup+sign+up.png" }), _jsx("meta", { property: "og:url", content: "https://mylg.studio/works" }), _jsx("meta", { property: "og:type", content: "website" }), _jsx("meta", { name: "twitter:card", content: "summary_large_image" }), _jsx("meta", { name: "twitter:title", content: "Our Work - MYLG" }), _jsx("meta", { name: "twitter:description", content: "Explore our portfolio of purposeful branding and immersive digital designs." }), _jsx("meta", { name: "twitter:image", content: "https://d2qb21tb4meex0.cloudfront.net/Iphone+14+mockup+sign+up.png" }), _jsx("link", { rel: "icon", href: "/path-to-favicon.png", type: "image/png" })] }), _jsxs("div", { className: `workspage-container ${opacityClass}`, children: [_jsxs("div", { className: "works-heading", children: [_jsxs("div", { className: "works-top-row", children: [_jsx("div", { className: "works-header", children: _jsx("h2", { children: "Our Work" }) }), _jsx("span", { className: "arrow-down works-arrow", children: "\u2193" })] }), _jsx("div", { className: "works-subheader", children: _jsxs("h3", { children: ["Purposeful branding & ", _jsx("br", {}), "immersive digital"] }) })] }), _jsx("div", { className: "works-container", ref: (el) => { blogPostRefs.current[0] = el; }, children: _jsx("div", { className: "blog-section", children: renderWorks(displayedWorks) }) })] }), _jsxs("div", { className: "footer-blog-section", children: [_jsxs("div", { className: "blog-header", children: [_jsx("h2", { children: "Blog" }), _jsx("span", { className: "arrow-down blog-arrow", children: "\u2193" })] }), _jsx("div", { className: "blog-grid", children: allBlogPosts.slice(5, 10).map((post, index) => (_jsx(BlogEntry, { post: post }, index))) })] }), _jsx("hr", { style: { opacity: "1", color: "fff", height: "2px", backgroundColor: "#fff" } }), _jsx(InfoSection, {}), _jsx("hr", { style: { opacity: "1", color: "fff", height: "2px", backgroundColor: "#fff" } }), _jsx("div", { className: "single-ticker-section", children: _jsx(SingleTicker, {}) })] }));
};
