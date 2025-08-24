// Home.tsx
import React, { useEffect, useRef, useState } from "react";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { useScrollContext } from "../../app/contexts/ScrollContext";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrambleButton } from "../../components/scramblebutton";
import { InfoSection } from "../../components/infosection";
import { HeroSection } from "../../components/herosection";
import { BlogEntry } from '../../components/blogentry';
import allBlogPosts from '../blog/allblogposts/allBlogPosts.json';
import World from "../../assets/svg/branding-new.svg?react";
import PortfolioCard from "../../components/portfoliocard";
import Ticker from "../../components/ticker";
import SingleTicker from "../../components/singleticker";
import ScrollToTopButton from "../../components/scrolltotopbutton";
import { useData } from "../../app/contexts/DataProvider";
import "./style.css";
gsap.registerPlugin(ScrollTrigger);
export const Home = () => {
    const { opacity, setOpacity } = useData();
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
    const tickerLines = [
        " L.A. +22 ← Paris, France +1  ←   New York. ←  London.  ←  California",
        "ADPTV.TROIA.NOCCO.PD.BAREBELLS.MISTIFI.ZAPPOS.THE GOLD PRINCESS.MOKIBABY.",
        "↜34.0549° N, 118.2426° W 48.8566° N, 2.3522° E 40.7128° N, 74.0060° W 51.5072° N, 0.1276° W"
    ];
    useEffect(() => {
        const masterTimeline = gsap.timeline();
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
    }, []);
    return (_jsxs(_Fragment, { children: [_jsxs(Helmet, { children: [_jsx("meta", { charSet: "utf-8" }), _jsx("title", { children: "*MYLG!* | Simplify Your Creative Process" }), _jsx("meta", { name: "description", content: "An all-in-one platform to streamline your design projects with tools for management, collaboration, and presentation." }), _jsx("meta", { name: "keywords", content: "creative tools, design presentation, project collaboration, 3D renders, MYLG, project management, creative support, design assistance, creative platform, rendering services" }), _jsx("meta", { property: "og:title", content: "*MYLG!* - Creative to enhance your vision" }), _jsx("meta", { property: "og:description", content: "Elevate your design projects with MYLG's all-in-one platform for professional rendering, presentation, and project execution." }), _jsx("meta", { property: "og:image", content: "https://d2qb21tb4meex0.cloudfront.net/Iphone+14+mockup+sign+up.png" }), _jsx("meta", { property: "og:url", content: "https://mylg.studio" })] }), _jsxs("div", { className: `${opacityClass}`, children: [_jsx("div", { className: "svg-overlay", children: _jsx("svg", { viewBox: "0 0 1000 1000", width: "100%", height: "100%", preserveAspectRatio: "none", children: _jsx("path", { id: "revealPath", d: "M0,1005S175,995,500,995s500,5,500,5V0H0Z" }) }) }), _jsx(HeroSection, { title: "Streamline Your Creativity", subtitle: "A platform to elevate your creative projects", ctaText: "Get Started \u2192", ctaLink: "/register" }), _jsxs("div", { className: "header-section", style: { padding: '5px 0', backgroundColor: '#0c0c0c' }, children: [_jsxs("div", { className: "portfolio-row double-card-row", children: [_jsx(PortfolioCard, { linkUrl: "/works/strikefit", imageSrc: "https://d2qb21tb4meex0.cloudfront.net/images/Jack-Masai.jpg", imageAlt: "Strike Fit", title: "Strike Fit", subtitle: "Paris, France", description: "Branding, Photography, Styling" }), _jsx(PortfolioCard, { linkUrl: "/works/Bloom-and-Bliss", imageSrc: "https://d2qb21tb4meex0.cloudfront.net/images/Bloom-And-Bliss.jpg", imageAlt: "Bloom & Bliss Design", title: "Bloom & Bliss", subtitle: "Brand Identity", description: "Branding, 3D Animation" })] }), _jsx("div", { className: "portfolio-row single-card-row", children: _jsx(PortfolioCard, { linkUrl: "/works/elf-Makeup", className: "single-card elf", imageSrc: "https://d2qb21tb4meex0.cloudfront.net/images/Elf.jpg", imageAlt: "e.l.f. Beauty Design", title: "e.l.f. Beauty", subtitle: "Nylon House Mokibaby Art Basel", description: "3D Design, Immersive Digital" }) })] }), _jsxs("div", { className: "home-info-container", style: { background: 'linear-gradient(to bottom, #000, #0c0c0c)', borderTopLeftRadius: '20px', borderTopRightRadius: '20px' }, children: [_jsx("div", { className: "home-info-column", children: _jsx("h2", { children: "*The Platform*" }) }), _jsxs("div", { className: "home-info-column", style: { padding: '0 25px' }, children: [_jsx("p", { style: {
                                            margin: '0',
                                            wordBreak: 'break-word',
                                            overflowWrap: 'break-word',
                                            whiteSpace: 'normal',
                                            hyphens: 'manual'
                                        }, children: "*MYLG!* simplifies your creative process. Our all-in-one platform streamlines project management, communication, and presentation for your designs. Experience efficiency and elevate your creative effortlessly." }), _jsx("div", { className: "button-container platform", style: { paddingTop: '20px' }, children: _jsx(ScrambleButton, { text: "Sign-up \u2192", to: "/register" }) })] })] }), _jsx("div", { className: "home-info-container", children: _jsx("div", { className: "image-container", style: { position: 'relative' }, children: _jsx("img", { src: "https://d1cazymewvlm0k.cloudfront.net/1-iPhone+14+Pro+MockupFINAL.jpg", alt: "Our Platform", className: "responsive-image" }) }) }), _jsxs("div", { className: "home-info-container discover", children: [_jsx("div", { className: "home-info-column", style: { padding: '0 25px' }, children: _jsxs("p", { style: {}, children: [_jsx("span", { className: "drop-cap", children: "D" }), "iscover the all-in-one solution, designed to enhance creative. Upload ideas, sketches and initiate your projects effortlessly. Our intuitive dashboard lets you control your files, communicate with our team, track milestones, and access design files easily and conveniently."] }) }), _jsx("div", { className: "home-info-column", style: { padding: '0 25px' }, children: _jsx("p", { style: {
                                        wordBreak: 'break-word',
                                        overflowWrap: 'break-word',
                                        whiteSpace: 'normal',
                                        hyphens: 'manual'
                                    }, children: "Our dashboard system streamlines project communication. Set guidelines, budgets, upload assets, and collaborate with your team seamlessly all in one place. Save time, simplify the process, and accelerate your creative process." }) }), _jsx("div", { className: "home-info-column", style: { padding: '0 25px' }, children: _jsx("p", { style: {
                                        wordBreak: 'normal',
                                        overflowWrap: 'anywhere',
                                        whiteSpace: 'normal',
                                        hyphens: 'manual'
                                    }, children: "The core belief of *MYLG!* is that the management of a project is as crucial as its design. The app offers a suite of tools to execute your projects with precision, including timeline coordination, resource allocation, stakeholder communication, drawings, and detailed execution plans." }) })] }), _jsxs("div", { className: "home-info-container materializing", children: [_jsx("div", { className: "home-info-column", children: _jsxs("h2", { children: ["Materializing ", _jsx("br", {}), " your vision ", _jsx("br", {}), " with quality & speed."] }) }), _jsx("div", { className: "home-info-column", style: { padding: '0 25px' }, children: _jsxs("video", { className: "video-responsive", loop: true, autoPlay: true, muted: true, playsInline: true, children: [_jsx("source", { src: "https://d1cazymewvlm0k.cloudfront.net/metalflower_RS+Camera_a.mp4", type: "video/mp4" }), "Your browser does not support the video tag."] }) })] }), _jsxs("div", { className: "home-info-container", style: { padding: '20px 0 60px', backgroundColor: '#000000' }, children: [_jsx("div", { className: "home-info-column", style: { padding: '0 25px' }, children: _jsx(World, { className: "world-svg", style: { padding: '20px 0 60px' } }) }), _jsx("div", { className: "button-container platform", style: { padding: '25px 100px 0px', margin: '30px 0px 0px' }, children: _jsx(ScrambleButton, { style: { margin: '0' }, text: "Register \u2192", to: "/register" }) })] }), _jsx("div", { className: "video-container", children: _jsxs("video", { loop: true, autoPlay: true, muted: true, playsInline: true, children: [_jsx("source", { src: "https://d2qb21tb4meex0.cloudfront.net/videos/liquid+bullet.mp4", type: "video/mp4" }), "Your browser does not support the video tag."] }) }), _jsx("div", { className: "ticker-section", style: { padding: '100px 0 60px' }, children: _jsx(Ticker, { lines: tickerLines, scrollContainerRef: scrollableDivRef }) }), _jsxs("div", { className: "home-info-container discover-1", children: [_jsx("div", { className: "home-info-column heading", style: { padding: '0px 25px' }, children: _jsxs("h2", { style: { margin: '0px' }, children: ["Discover", _jsx("br", {}), " our work"] }) }), _jsxs("div", { className: "home-info-column", style: { padding: '0 25px' }, children: [_jsx("p", { style: {
                                            margin: '0',
                                            wordBreak: 'normal',
                                            overflowWrap: 'anywhere',
                                            whiteSpace: 'normal',
                                            hyphens: 'manual'
                                        }, children: "*MYLG!* is an all-in-one platform with a built-in request for proposal dashboard system, speeding-up the process of design and visualizations. Provide us with your ideas we provide you with high quality, creative 2D & 3D design presentations with a fast turn-around." }), _jsx("div", { className: "button-container platform", style: { padding: '0' }, children: _jsx(ScrambleButton, { text: "View Showcase \u2192", to: "/works" }) })] })] }), _jsxs("div", { className: "portfolio-section", children: [_jsx("div", { className: "portfolio-row single-card-row", children: _jsx(PortfolioCard, { linkUrl: "/works/Pipe-Dream-Events", className: "single-card", imageSrc: "https://d2qb21tb4meex0.cloudfront.net/images/Pipedream-Events.jpg", imageAlt: "PD Events", title: "PD Events", subtitle: "Branding & Web Design", description: "3D Design, Animation, Web, Branding" }) }), _jsxs("div", { className: "portfolio-row double-card-row", children: [_jsx(PortfolioCard, { linkUrl: "/works/Academy-of-Pop", imageSrc: "https://d2qb21tb4meex0.cloudfront.net/images/the-A.png", imageAlt: "Academy of Pop", title: "Academy of Pop", subtitle: "Branding Mokibaby", description: "3D Design, Immersive, Digital" }), _jsx(PortfolioCard, { linkUrl: "/works/NOCCO", imageSrc: "https://d2qb21tb4meex0.cloudfront.net/images/Nocco+vertical-03.png", imageAlt: "NOCCO", title: "NOCCO", subtitle: "Influencers Venice Beach, CA", description: "3D Design, Immersive, Branding" })] }), _jsx("div", { className: "portfolio-row single-card-row", children: _jsx(PortfolioCard, { linkUrl: "/works/Ghost-Circus-Apparel", className: "single-card gca", imageSrc: "https://d2qb21tb4meex0.cloudfront.net/images/Ghost-Circus.jpg", imageAlt: "Ghost Circus Apparel", title: "Ghost Circus Apparel", subtitle: "X by Eli James Collection", description: "Branding, Photography, Web Design" }) })] }), _jsxs("div", { className: "home-info-container", style: { paddingBottom: '25px' }, children: [_jsxs("div", { className: "home-info-column", style: { padding: '0px 25px', minWidth: '350px' }, children: [_jsxs("h2", { style: { margin: '0px', paddingBottom: '20px' }, children: ["Let's", _jsx("br", {}), " get started"] }), _jsx("p", { style: {
                                            margin: '0',
                                            wordBreak: 'normal',
                                            overflowWrap: 'anywhere',
                                            whiteSpace: 'normal',
                                            hyphens: 'manual'
                                        }, children: "Unlock the door to a world of creativity with us. We\u2019re committed to delivering high-quality, fast, and efficient design presentation and concept execution. Our focus is on artful visualizations, always dedicated to the finest details." }), _jsx("div", { className: "button-container platform2", style: { padding: '0' }, children: _jsx(ScrambleButton, { text: "Sign-up \u2192", to: "/register" }) })] }), _jsx("div", { className: "sign-up-image", style: { alignItems: "flex-end" }, children: _jsx("img", { src: "https://d2qb21tb4meex0.cloudfront.net/Iphone+14+mockup+sign+up.png", alt: "Get Started", className: "responsive-image2" }) })] }), _jsx(InfoSection, {}), _jsx("div", { className: "single-ticker-section", children: _jsx(SingleTicker, {}) })] }), window.innerWidth > 768 && _jsx(ScrollToTopButton, {})] }));
};
