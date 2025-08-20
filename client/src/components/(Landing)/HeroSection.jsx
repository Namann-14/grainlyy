'use client'
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const HeroSection = () => {
  const canvasRef = useRef(null);
  const heroRef = useRef(null);
  const navRef = useRef(null);
  const headerRef = useRef(null);
  const heroImgRef = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const canvas = canvasRef.current;
    const nav = navRef.current;
    const header = headerRef.current;
    const heroImg = heroImgRef.current;
    const context = canvas.getContext("2d");

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
      context.fillStyle = '#fefbf4';
      context.fillRect(0, 0, canvasWidth, canvasHeight);
      context.fillStyle = '#241910';
      context.font = '24px Arial';
      context.textAlign = 'center';
      context.fillText('Loading animation frames...', canvasWidth / 2, canvasHeight / 2);
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
        console.log('All images loaded, starting animation');
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
        context.fillStyle = '#fefbf4';
        context.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Add some text to indicate loading
        context.fillStyle = '#241910';
        context.font = '24px Arial';
        context.textAlign = 'center';
        context.fillText('Loading animation frames...', canvasWidth / 2, canvasHeight / 2);
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
            gsap.set(nav, { opacity });
          } else {
            gsap.set(nav, { opacity: 0 });
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
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <section className="hero" ref={heroRef}>
      <canvas ref={canvasRef}></canvas>
      <div className="hero-content">
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
      </div>
    </section>
  );
};

export default HeroSection;
