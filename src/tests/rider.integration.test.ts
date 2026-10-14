import { describe, expect, it } from "vitest";
import { RiderView } from "../render/RiderView";

describe("RiderView", () => {
  it("mounts the real animated 81-path rider above gameplay", () => {
    const host = document.createElement("div");
    const rider = new RiderView(host, true);
    const svg = host.querySelector("svg");
    expect(svg?.querySelectorAll("path")).toHaveLength(81);
    expect(svg?.getAttribute("viewBox")).toBe("0 0 82 175");
    expect(host.querySelector(".rider-layer")).not.toBeNull();
    expect((host.querySelector(".rider-layer") as HTMLElement).style.pointerEvents).toBe("none");
    expect(rider.currentState).toBe("ready");
    rider.setState("ride");
    expect(rider.currentState).toBe("ride");
    rider.setState("throw-left");
    expect(host.querySelector(".rider-layer")?.classList.contains("throw-left")).toBe(true);
    rider.reset();
    expect(host.querySelector(".rider-layer")?.classList.contains("throw-left")).toBe(false);
    rider.destroy();
    expect(host.children).toHaveLength(0);
  });
});

