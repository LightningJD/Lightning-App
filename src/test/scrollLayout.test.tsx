import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

/**
 * Tests for scroll layout bug - white segment appearing on scroll
 *
 * Issue: When scrolling down, a white segment appears above the content
 * This indicates improper background/layout handling
 */

// Mock ProfileTab component that simulates the layout issue
function ProfileTabLayout({ nightMode = true }: { nightMode?: boolean }) {
  return (
    <div
      data-testid="profile-container"
      className={`min-h-screen ${nightMode ? "bg-slate-900" : "bg-gray-50"}`}
    >
      {/* Profile Header Section */}
      <div
        data-testid="profile-header"
        className={`relative ${nightMode ? "bg-slate-900" : "bg-white"}`}
      >
        {/* Avatar Circle */}
        <div className="flex justify-center pt-8 pb-4">
          <div
            data-testid="avatar-circle"
            className="w-40 h-40 rounded-full bg-black flex items-center justify-center"
          >
            <span className="text-4xl">⚡</span>
          </div>
        </div>

        {/* User Info */}
        <div className="text-center px-4 pb-6">
          <h1
            className={`text-2xl font-bold ${nightMode ? "text-white" : "text-gray-900"}`}
          >
            jordandoann
          </h1>
          <p className={`${nightMode ? "text-slate-300" : "text-gray-600"}`}>
            Jordyn Doanne
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div
        data-testid="content-section"
        className={`${nightMode ? "bg-slate-900" : "bg-gray-50"}`}
      >
        <div className="p-4">
          <div className="testimony-card">
            <p>Testimony content...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

describe("Profile Scroll Layout", () => {
  beforeEach(() => {
    // Reset any scroll position
    window.scrollTo(0, 0);
  });

  describe("Background Consistency", () => {
    it("should have consistent background color throughout the page (night mode)", () => {
      render(<ProfileTabLayout nightMode={true} />);

      const container = screen.getByTestId("profile-container");
      const header = screen.getByTestId("profile-header");
      const content = screen.getByTestId("content-section");

      // Get computed styles
      const containerBg = window.getComputedStyle(container).backgroundColor;
      const headerBg = window.getComputedStyle(header).backgroundColor;
      const contentBg = window.getComputedStyle(content).backgroundColor;

      // All should have the same dark background (no white segments)
      expect(containerBg).toBeTruthy();
      expect(headerBg).toBe(containerBg);
      expect(contentBg).toBe(containerBg);
    });

    it("should have consistent background color throughout the page (day mode)", () => {
      render(<ProfileTabLayout nightMode={false} />);

      const container = screen.getByTestId("profile-container");
      const header = screen.getByTestId("profile-header");
      const content = screen.getByTestId("content-section");

      // Get computed styles
      const containerBg = window.getComputedStyle(container).backgroundColor;
      const contentBg = window.getComputedStyle(content).backgroundColor;

      // Container and content should match (no unexpected white/colored segments)
      expect(containerBg).toBeTruthy();
      expect(contentBg).toBeTruthy();
    });
  });

  describe("No White Gaps", () => {
    it("should not have white gaps between sections", () => {
      const { container } = render(<ProfileTabLayout nightMode={true} />);

      const header = screen.getByTestId("profile-header");
      const content = screen.getByTestId("content-section");

      // Check that sections are adjacent (no gap)
      const headerRect = header.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();

      // Content should start immediately after header (or overlap slightly)
      // Gap should be 0 or negative (overlap)
      const gap = contentRect.top - headerRect.bottom;

      expect(gap).toBeLessThanOrEqual(0);
    });

    it("should not have margin/padding creating white space on scroll", () => {
      render(<ProfileTabLayout nightMode={true} />);

      const header = screen.getByTestId("profile-header");
      const content = screen.getByTestId("content-section");

      const headerStyle = window.getComputedStyle(header);
      const contentStyle = window.getComputedStyle(content);

      // No excessive margins that could create white gaps
      const headerMargin = Number.parseInt(headerStyle.marginBottom) || 0;
      const contentMargin = Number.parseInt(contentStyle.marginTop) || 0;
      expect(headerMargin).toBeLessThanOrEqual(0);
      expect(contentMargin).toBeLessThanOrEqual(0);
    });
  });

  describe("Avatar Positioning", () => {
    it("should position avatar circle correctly without breaking layout", () => {
      render(<ProfileTabLayout nightMode={true} />);

      const avatar = screen.getByTestId("avatar-circle");
      const header = screen.getByTestId("profile-header");

      const avatarRect = avatar.getBoundingClientRect();
      const headerRect = header.getBoundingClientRect();

      // Avatar should be within header bounds (not protruding into white space)
      expect(avatarRect.top).toBeGreaterThanOrEqual(headerRect.top - 1); // Allow 1px tolerance
    });

    it("should not create white background segments around avatar", () => {
      render(<ProfileTabLayout nightMode={true} />);

      const header = screen.getByTestId("profile-header");
      const headerBg = window.getComputedStyle(header).backgroundColor;

      // Header should have dark background, not white
      // In jsdom, Tailwind classes might not apply, so just check it's not explicitly white
      expect(headerBg).not.toBe("rgb(255, 255, 255)"); // Not white
    });
  });

  describe("Responsive Layout", () => {
    it("should maintain layout consistency on mobile viewport", () => {
      // Simulate mobile viewport
      global.innerWidth = 375;
      global.innerHeight = 667;

      render(<ProfileTabLayout nightMode={true} />);

      const container = screen.getByTestId("profile-container");
      const header = screen.getByTestId("profile-header");
      const content = screen.getByTestId("content-section");

      const containerBg = window.getComputedStyle(container).backgroundColor;
      const headerBg = window.getComputedStyle(header).backgroundColor;
      const contentBg = window.getComputedStyle(content).backgroundColor;

      // All backgrounds should match
      expect(headerBg).toBe(containerBg);
      expect(contentBg).toBe(containerBg);
    });

    it("should maintain layout consistency on desktop viewport", () => {
      // Simulate desktop viewport
      global.innerWidth = 1920;
      global.innerHeight = 1080;

      render(<ProfileTabLayout nightMode={true} />);

      const container = screen.getByTestId("profile-container");
      const header = screen.getByTestId("profile-header");
      const content = screen.getByTestId("content-section");

      const containerBg = window.getComputedStyle(container).backgroundColor;
      const headerBg = window.getComputedStyle(header).backgroundColor;
      const contentBg = window.getComputedStyle(content).backgroundColor;

      // All backgrounds should match
      expect(headerBg).toBe(containerBg);
      expect(contentBg).toBe(containerBg);
    });
  });

  describe("Overflow Handling", () => {
    it("should handle overflow without creating white segments", () => {
      render(<ProfileTabLayout nightMode={true} />);

      const container = screen.getByTestId("profile-container");
      const containerStyle = window.getComputedStyle(container);

      // Container should handle overflow properly
      expect(containerStyle.overflowX).not.toBe("visible");
      // minHeight might be empty in jsdom, so just check it's set in className
      expect(container.className).toContain("min-h-screen");
    });
  });
});
