"use client";
import { useEffect, useRef, type ReactNode } from "react";

/** Content stays visible without JS. Reveal only offscreen sections, once. */
export function MotionReveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    if (element.getBoundingClientRect().top < window.innerHeight) return;
    element.classList.add("reveal-waiting");
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { element.classList.remove("reveal-waiting"); observer.disconnect(); }
    }, { threshold: 0.08 });
    observer.observe(element);
    return () => { observer.disconnect(); element.classList.remove("reveal-waiting"); };
  }, []);
  return <div ref={ref} className="motion-reveal">{children}</div>;
}
