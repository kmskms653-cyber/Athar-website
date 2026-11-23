import { useEffect } from "react";

// يضيف الصنف "in" للعناصر ذات الصنف "rv" عند ظهورها في الشاشة
export function useReveal(dep) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll(".rv:not(.in)"));
    if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return undefined; }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((x) => { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }),
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [dep]);
}
