"use client";

import { useEffect } from "react";

/** Now and then (every 9-20 s) a shooting star crosses the opening sky. Never with reduced motion. */
export function ShootingStars() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer = 0;
    const launch = () => {
      timer = window.setTimeout(launch, 9000 + Math.random() * 11000);
      if (document.hidden || window.scrollY > innerHeight * 0.7) return;
      const star = document.createElement("span");
      star.className = "shooting-star";
      star.setAttribute("aria-hidden", "true");
      star.style.left = `${10 + Math.random() * 60}vw`;
      star.style.top = `${4 + Math.random() * 22}vh`;
      star.style.setProperty("--angle", `${18 + Math.random() * 18}deg`);
      star.style.setProperty("--travel", `${220 + Math.random() * 200}px`);
      document.body.appendChild(star);
      star.addEventListener("animationend", () => star.remove());
    };
    timer = window.setTimeout(launch, 4000);
    return () => window.clearTimeout(timer);
  }, []);
  return null;
}
