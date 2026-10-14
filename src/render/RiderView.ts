import { gsap } from "gsap";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { INITIAL_SVG, MORPH_TARGETS } from "../artwork";

gsap.registerPlugin(MorphSVGPlugin);
export type RiderState = "ready" | "ride" | "throw-left" | "throw-right" | "fail";

export function createMorphAnimation(svg: SVGSVGElement, reducedMotion: boolean): gsap.core.Timeline | null {
  if (reducedMotion) return null;
  const paths = svg.querySelectorAll("path");
  const timeline = gsap.timeline({ repeat: -1, yoyo: true });
  for (const { index, d } of MORPH_TARGETS) {
    timeline.to(paths[index], { duration: .7, ease: "power2.inOut", morphSVG: { shape: d, type: "linear" } }, 0);
  }
  timeline.to(svg, { duration: .35, ease: "power2.inOut", rotation: -.6, transformOrigin: "50% 82%", x: -.65, y: -1.5 }, 0)
    .to(svg, { duration: .35, ease: "power2.inOut", rotation: .6, x: .65, y: 0 }, .35);
  return timeline;
}

export class RiderView {
  private readonly layer: HTMLDivElement;
  private readonly svg: SVGSVGElement;
  private readonly timeline: gsap.core.Timeline | null;
  private state: RiderState = "ready";
  constructor(host: HTMLElement, reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches) {
    this.layer = document.createElement("div");
    this.layer.className = "rider-layer";
    this.layer.style.pointerEvents = "none";
    this.layer.innerHTML = INITIAL_SVG;
    host.append(this.layer);
    this.svg = this.layer.querySelector("svg")!;
    this.svg.classList.add("rider-svg");
    this.svg.setAttribute("aria-hidden", "true");
    this.timeline = createMorphAnimation(this.svg, reducedMotion);
    this.timeline?.pause(0);
  }
  setState(state: RiderState): void {
    this.state = state;
    this.layer.classList.remove("throw-left", "throw-right", "fail");
    if (state !== "ride") this.layer.classList.add(state);
    if (state === "fail" || state === "ready") this.timeline?.pause(); else this.timeline?.resume();
  }
  reset(): void { this.timeline?.restart().pause(0); this.setState("ready"); }
  get currentState(): RiderState { return this.state; }
  destroy(): void { this.timeline?.kill(); this.layer.remove(); }
}

