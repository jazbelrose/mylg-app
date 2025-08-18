import React, { useEffect, useRef } from "react";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { dataabout, meta, } from "../../content_option";
import dataAbout from "./dataAbout.json";
import { ReactComponent as Studiosubtitle } from "../../assets/svg/subtitles.svg";
import { ReactComponent as Tagline } from "../../assets/svg/notjust.svg";
import { ReactComponent as Brandingcard } from "../../assets/svg/brandingcard.svg";
import InlineSvg from "../../components/inlinesvg/index.jsx";


import { gsap } from "gsap";

import { ScrollTrigger } from "gsap/ScrollTrigger";

import "./style.css";

gsap.registerPlugin(ScrollTrigger);

export const About = () => {
  useEffect(() => {

    
    const masterTimeline = gsap.timeline();

    // Path reveal animations
    masterTimeline
      .to("#revealPath", {
        attr: { d: "M0,502S175,272,500,272s500,230,500,230V0H0Z" }, // Intermediate state
        duration: 0.75,
        ease: "Power1.easeIn",
      })
      .to("#revealPath", {
        attr: { d: "M0,2S175,1,500,1s500,1,500,1V0H0Z" }, // Final state
        duration: 0.5,
        ease: "power1.easeOut"
      });
  
    // Staggered fade-ins
    gsap.set(".uuid-66427b3d-aabb-420f-a8e7-bf006193f4f4", { opacity: 0 });
    masterTimeline.to(".uuid-66427b3d-aabb-420f-a8e7-bf006193f4f4", {
      opacity: 1,
      duration: 0.1,
      stagger: 0.1,
      ease: "power2.out"
    });
  
    gsap.set(".uuid-01f5aca7-0df2-4d97-885c-bee4c47a7981", { opacity: 0 });
    masterTimeline.to(".uuid-01f5aca7-0df2-4d97-885c-bee4c47a7981", {
      opacity: 1,
      duration: 0.1,
      stagger: 0.1,
      ease: "power2.out"
    });
  
    gsap.set(".cls-all", { opacity: 0 });
    masterTimeline.to(".cls-all", {
      opacity: 1,
      duration: 0.5,
      stagger: 0.002,
      ease: "power4.inOut"
    });
  
    
 // Set the initial state for elements with class `st1` to `st10`
 for (let i = 2; i <= 11; i++) {
  gsap.set(`.st${i}`, { opacity: 0 });
}

// Create the staggered animation for the elements
for (let i = 2; i <= 11; i++) {
  masterTimeline.to(`.st${i}`, {
    opacity: 1,
    duration: 0.01,
    scrub: true,
    // Don't use stagger here since it's being handled by the loop
    ease: "power2.out"
  }, `+=${i * 0.01}`); // Add a relative offset for each subsequent animation
}

gsap.set(".st1", { opacity: 0, scale: 0.5 });
masterTimeline.to(".st1", {
  scale: 1,
  opacity: 1,
  duration: 0.5,
  stagger: 0.002,
  ease: "power4.inOut"
});

    //DESIGN SERVICES
    gsap.set(".uuid-8f1a6b90-5ac3-4aa1-bc90-e08ce41c3195", { opacity: 0 });
    gsap.to(".uuid-8f1a6b90-5ac3-4aa1-bc90-e08ce41c3195", {
      opacity: 1,
      duration: 0.1,
      stagger: 0.015,
      delay: 0.75,
      ease: "power2.out",
      scrollTrigger: {
        trigger: "#tagline",
        start: "top bottom",
        markers: true
      }
    });


    //EXPERIENTIAL SERVICES

    gsap.set(".uuid-5f43e327-c228-43b8-9ef9-8c8e7994fc22", { opacity: 0 });
    gsap.to(".uuid-5f43e327-c228-43b8-9ef9-8c8e7994fc22", {
      opacity: 1,
      duration: 0.1,
      stagger: 0.015,
      delay: 0.75,
      ease: "power2.out",

      scrollTrigger: {
        trigger: "#tagline",
        start: "top bottom",
        markers: true
      }

    });

    //TECH SERVICES
    gsap.set(".uuid-20cdce58-cbcf-46d1-8067-9f46302af0a6", { opacity: 0 });
    gsap.to(".uuid-20cdce58-cbcf-46d1-8067-9f46302af0a6", {
      opacity: 1,
      duration: 0.1,
      stagger: 0.015,

      ease: "power2.out",
      scrollTrigger: {
        trigger: ".techcard",
        start: "top bottom -=250px", // The animation will start even earlier
        
      }
      
    });

    //BRANDING SERVICES
    gsap.set(".uuid-f45ebbdd-fd0e-4c32-b939-92482ee45304", { opacity: 0 });
    gsap.to(".uuid-f45ebbdd-fd0e-4c32-b939-92482ee45304", {
      opacity: 1,
      duration: 0.1,
      stagger: 0.015,

      ease: "power2.out",
      scrollTrigger: {
        trigger: ".techcard",
        start: "top bottom -=250px", // The animation will start even earlier
        
      }
      
    });









    
 // Clean up ScrollTriggers when the component unmounts
return () => ScrollTrigger.getAll().forEach(trigger => trigger.kill());
}, []);
   

  const randomQuote =
    dataAbout.dataAbout &&
    dataAbout.dataAbout[
    Math.floor(Math.random() * dataAbout.dataAbout.length)
    ];

    

  return (
    <HelmetProvider>
      <Helmet>
        <meta charSet="utf-8" />
        <title> About | *MYLG!* </title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="svg-overlay">
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none">
          <path id="revealPath" d="M0,1005S175,995,500,995s500,5,500,5V0H0Z"></path>
        </svg>
      </div>



      <div className="studio-subtitle">
        <div className="content-limit">
          <Studiosubtitle id="studio-subtitle" />
        </div>
      </div>

     
      
      
          <Tagline id="tagline" />
       
         

        <div className="cards-container">
          <div className="card-item">
            <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/designcard.svg" />
          </div>
          <div className="card-item">
            <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/experientialcard.svg" />
          </div>
          <div className="card-item">
            <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/techcard.svg" className="techcard" />
          </div>
          <div className="card-item">
            <Brandingcard className="brandingcard" />
          </div>
        </div>

      <div className="tagline">
       
        <p className="services-description">MYLG is here to make you look good in any digital landscape.
          As a premier design agency, we focus on delivering tailored
          digital solutions that elevate your brand’s presence. From 3D
          environment design, 3D modeling and comprehensive web
          design to advanced back-end and front-end development,
          we are dedicated to setting industry standards. Our work
          doesn’t just aim for aesthetics; we ensure it communicates
          the essence of your brand. If you’re seeking immersive
          digital campaigns, strategic brand narratives, or
          high-end commercial content, MYLG is
          equipped to drive your vision into the
          future of digital innovation.</p>
      </div>





    </HelmetProvider>
  );

};