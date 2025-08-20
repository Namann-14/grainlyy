"use client";
import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion } from "framer-motion";
import Link from "next/link";

const HeroSection = () => {
  const canvasRef = useRef(null);
  const heroRef = useRef(null);
  const headerRef = useRef(null);
  const heroImgRef = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const canvas = canvasRef.current;
    const header = headerRef.current;
    const heroImg = heroImgRef.current;
    const context = canvas.getContext("2d");

    // Get navigation element
    let nav = null;
    const getNavElement = () => {
      nav =
        document.querySelector(".nav-links") ||
        document.querySelector("header") ||
        document.querySelector("nav");
    };

    // Try to get nav element, retry if not found
    getNavElement();
    if (!nav) {
      setTimeout(getNavElement, 100);
    }

    // Listen for navigation ready event from Navigation component
    const handleNavigationReady = (event) => {
      if (event.detail && event.detail.nav) {
        nav = event.detail.nav;
      }
    };

    window.addEventListener("navigationReady", handleNavigationReady);

    const setCanvasSize = () => {
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * pixelRatio;
      canvas.height = window.innerHeight * pixelRatio;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";

      context.scale(pixelRatio, pixelRatio);
    };

    setCanvasSize();

    // Initial render to show loading state
    const initialRender = () => {
      const canvasWidth = window.innerWidth;
      const canvasHeight = window.innerHeight;
      context.fillStyle = "#fefbf4";
      context.fillRect(0, 0, canvasWidth, canvasHeight);
      context.fillStyle = "#241910";
      context.font = "24px Arial";
      context.textAlign = "center";
      // context.fillText(
      //   "Loading animation frames...",
      //   canvasWidth / 2,
      //   canvasHeight / 2
      // );
    };

    initialRender();

    const frameCount = 140;
    const currFrame = (index) => {
      return `/grainlyy/frame_${(index + 1).toString().padStart(4, "0")}.jpg`;
    };

    let images = [];
    let videoFrames = { frame: 0 };
    let imagesToLoad = frameCount;

    const onLoad = () => {
      imagesToLoad--;
      console.log(`Loaded image. Remaining: ${imagesToLoad}`);
      if (!imagesToLoad) {
        console.log("All images loaded, starting animation");
        render();
        setupScrollTrigger();
      }
    };

    console.log(`Starting to load ${frameCount} images...`);

    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      img.onload = onLoad;
      img.onerror = function () {
        console.log(`Failed to load image: ${currFrame(i)}`);
        onLoad.call(this);
      };
      const imagePath = currFrame(i);
      console.log(`Loading image: ${imagePath}`);
      img.src = imagePath;
      images.push(img);
    }

    const render = () => {
      const canvasWidth = window.innerWidth;
      const canvasHeight = window.innerHeight;

      context.clearRect(0, 0, canvasWidth, canvasHeight);

      const img = images[videoFrames.frame];

      if (img && img.complete && img.naturalWidth > 0) {
        const imageAspect = img.naturalWidth / img.naturalHeight;
        const canvasAspect = canvasWidth / canvasHeight;

        let drawWidth, drawHeight, drawX, drawY;

        if (imageAspect > canvasAspect) {
          drawHeight = canvasHeight;
          drawWidth = drawHeight * imageAspect;
          drawX = (canvasWidth - drawWidth) / 2;
          drawY = 0;
        } else {
          drawWidth = canvasWidth;
          drawHeight = drawWidth / imageAspect;
          drawX = 0;
          drawY = (canvasHeight - drawHeight) / 2;
        }

        context.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      } else {
        // Fallback: draw a simple background if images aren't loaded
        context.fillStyle = "#fefbf4";
        context.fillRect(0, 0, canvasWidth, canvasHeight);

        // Add some text to indicate loading
        context.fillStyle = "#241910";
        context.font = "24px Arial";
        context.textAlign = "center";
        context.fillText(
          "Loading animation frames...",
          canvasWidth / 2,
          canvasHeight / 2
        );
      }
    };

    const setupScrollTrigger = () => {
      ScrollTrigger.create({
        trigger: heroRef.current,
        start: "top top",
        end: `+=${window.innerHeight * 7}px`,
        pin: true,
        pinSpacing: true,
        scrub: 1,
        onUpdate: (self) => {
          const progress = self.progress;
          const animationProgress = Math.min(progress / 0.9, 1);
          const targetFrame = Math.round(animationProgress * (frameCount - 1));
          videoFrames.frame = targetFrame;
          render();

          if (progress <= 0.1) {
            const navProgress = progress / 0.1;
            const opacity = 1 - navProgress;
            if (nav) {
              gsap.set(nav, { opacity });
            }
          } else {
            if (nav) {
              gsap.set(nav, { opacity: 0 });
            }
          }

          if (progress <= 0.25) {
            const zProgress = progress / 0.25;
            const translatez = zProgress - 500;
            let opacity = 1;
            if (progress >= 0.2) {
              const fadeProgress = Math.min((progress - 0.2) / (0.25 - 0.2), 1);
              opacity = 1 - fadeProgress;
            }
            gsap.set(header, {
              transform: `translate(-50%, -50%) translateZ(${translatez}px)`,
              opacity,
            });
          } else {
            gsap.set(header, { opacity: 0 });
          }

          if (progress < 0.6) {
            gsap.set(heroImg, {
              transform: "translateZ(1000px)",
              opacity: 0,
            });
          } else if (progress >= 0.6 && progress <= 0.9) {
            const imgProgress = (progress - 0.6) / 0.3;
            const translateZ = 1000 - imgProgress * 1000;

            let opacity = 0;
            if (progress <= 0.8) {
              const opacityProgress = (progress - 0.6) / 0.2;
              opacity = opacityProgress;
            } else {
              opacity = 1;
            }

            gsap.set(heroImg, {
              transform: `translateZ(${translateZ}px)`,
              opacity,
            });
          } else {
            gsap.set(heroImg, {
              transform: "translateZ(0px)",
              opacity: 1,
            });
          }
        },
      });
    };

    const handleResize = () => {
      setCanvasSize();
      render();
      ScrollTrigger.refresh();
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("navigationReady", handleNavigationReady);
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <section
      className="hero relative w-full h-screen overflow-hidden"
      ref={heroRef}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover"
      ></canvas>
      {/* <div className="hero-content">
        <div className="header" ref={headerRef}>
          <h1>One unified workspace to build, test, and ship AI faster</h1>
          <p>Trusted By</p>
          <div className="client-logos">
            <div className="client-logo">
              <img src="https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=120&h=60&fit=crop&crop=center" alt="OpenAI" />
            </div>
            <div className="client-logo">
              <img src="https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=120&h=60&fit=crop&crop=center" alt="Google" />
            </div>
            <div className="client-logo">
              <img src="https://images.unsplash.com/photo-1633409361618-c73427e4e206?w=120&h=60&fit=crop&crop=center" alt="Microsoft" />
            </div>
            <div className="client-logo">
              <img src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=120&h=60&fit=crop&crop=center" alt="Meta" />
            </div>
          </div>
        </div>
      </div>
      <div className="hero-img-container">
        <div className="hero-img" ref={heroImgRef}>
          <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop&crop=center" alt="AI Dashboard Interface" />
        </div>
      </div> */}

      <div className="hero-content -top-20 relative z-10 flex items-center justify-center min-h-screen">
        <div
          className="header absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center max-w-4xl w-full px-4"
          ref={headerRef}
        >
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="space-y-8 text-center w-full"
          >
            <motion.div
              variants={fadeIn}
              className="inline-block px-4 py-2 text-sm bg-white/10 backdrop-blur-sm text-white rounded-full border border-white/20"
            >
              Blockchain-Powered Public Distribution
            </motion.div>

            <motion.h1
              variants={fadeIn}
              className="text-5xl md:text-7xl lg:text-8xl font-bold leading-tight text-white text-center flex flex-col justify-center items-center"
            >
              <span>Transforming Public</span>
              <span>Distribution</span>
              <span className="text-white">With Blockchain</span>
            </motion.h1>

            <motion.p
              variants={fadeIn}
              className="text-white/80 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed text-center"
            >
              Making government ration delivery transparent, tamper-proof, and
              publicly verifiable through blockchain technology.
            </motion.p>

            <motion.div
              variants={fadeIn}
              className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-8"
            >
              <Link
                href="#features"
                className="px-8 py-4 bg-green-200 text-green-900 font-semibold rounded-lg hover:bg-green-300 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Learn More
              </Link>
              <Link
                href="#stakeholders"
                className="px-8 py-4 bg-transparent border-2 border-white/30 text-white font-semibold rounded-lg hover:bg-white/10 transition-all duration-300 backdrop-blur-sm"
              >
                Get Started
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* User Count Badge - Bottom Left */}
        {/* <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="absolute bottom-8 left-8 bg-white/90 backdrop-blur-sm text-black rounded-xl p-4 shadow-xl hidden md:block border border-white/20"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-green-800">
              Deliveries Tracked
            </span>
          </div>
          <div className="font-bold text-3xl text-green-900">20K+</div>
        </motion.div> */}

        {/* Toggle - Bottom Right */}
        {/* <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="absolute bottom-8 right-8 bg-white/10 backdrop-blur-sm rounded-full p-1 hidden md:flex border border-white/20"
        >
          <button className="px-6 py-3 rounded-full bg-green-400 text-green-900 text-sm font-semibold shadow-lg">
            Public
          </button>
          <button className="px-6 py-3 rounded-full text-white/80 text-sm font-medium hover:text-white transition-colors">
            Government
          </button>
        </motion.div> */}
      </div>

      <div className="hero-img-container">
        <div className="hero-img" ref={heroImgRef}>
          <img
            src="/ok.png"
            className="rounded-2xl"
            alt="AI Dashboard Interface"
          />
        </div>
      </div>
      {/* Hero Image Container
      <div className="hero-img-container absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1/2 perspective-1000">
        <div className="hero-img relative w-full h-full" ref={heroImgRef} style={{ transform: 'translateZ(1000px)', opacity: 0 }}>
          <img 
            src="/image.png" 
            alt="Grainlyy Dashboard Interface" 
            className="w-full h-auto rounded-xl shadow-2xl"
          />
        </div>
      </div> */}
    </section>
  );
};

export default HeroSection;
