import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// Mock dependencies
vi.mock("../hooks/useGeolocation", () => ({
  useGeolocation: () => ({
    detect: vi.fn().mockResolvedValue({ cityName: "Dallas, TX", lat: 32.7, lng: -96.8 }),
    isDetecting: false,
    error: null,
  }),
}));

vi.mock("../lib/database", () => ({
  resolveReferralCode: vi.fn().mockResolvedValue(null),
}));

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null }),
        }),
      }),
    }),
  },
}));

import ProfileCreationWizard from "../components/ProfileCreationWizard";

const defaultProps = {
  nightMode: false,
  onComplete: vi.fn().mockResolvedValue(undefined),
  onSkip: vi.fn(),
};

describe("ProfileCreationWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("initial render (Step 0)", () => {
    it("renders without crashing", () => {
      render(<ProfileCreationWizard {...defaultProps} />);
      expect(screen.getByLabelText(/Full Name/)).toBeInTheDocument();
    });

    it("shows Full Name and Location fields", () => {
      render(<ProfileCreationWizard {...defaultProps} />);
      expect(screen.getByLabelText(/Full Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Location/)).toBeInTheDocument();
    });

    it("shows referral code field", () => {
      render(<ProfileCreationWizard {...defaultProps} />);
      expect(screen.getByLabelText(/Referral Code/)).toBeInTheDocument();
    });

    it("shows Use my location button", () => {
      render(<ProfileCreationWizard {...defaultProps} />);
      expect(screen.getByText("Use my location")).toBeInTheDocument();
    });
  });

  describe("form validation", () => {
    it("shows error when Full Name is empty on Next", () => {
      render(<ProfileCreationWizard {...defaultProps} />);
      // Fill location but leave name empty
      fireEvent.change(screen.getByLabelText(/Location/), { target: { value: "Dallas, TX" } });
      fireEvent.click(screen.getByText("Next"));
      expect(screen.getByText("Name is required")).toBeInTheDocument();
    });

    it("shows error when Location is empty on Next", () => {
      render(<ProfileCreationWizard {...defaultProps} />);
      // Fill name but leave location empty
      fireEvent.change(screen.getByLabelText(/Full Name/), { target: { value: "John Doe" } });
      fireEvent.click(screen.getByText("Next"));
      expect(screen.getByText("Location is required")).toBeInTheDocument();
    });

    it("clears error when user starts typing in the field", () => {
      render(<ProfileCreationWizard {...defaultProps} />);
      fireEvent.click(screen.getByText("Next"));
      expect(screen.getByText("Name is required")).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(/Full Name/), { target: { value: "J" } });
      expect(screen.queryByText("Name is required")).not.toBeInTheDocument();
    });
  });

  describe("step navigation", () => {
    it("advances to step 1 when validation passes", async () => {
      render(<ProfileCreationWizard {...defaultProps} />);
      fireEvent.change(screen.getByLabelText(/Full Name/), { target: { value: "John Doe" } });
      fireEvent.change(screen.getByLabelText(/Location/), { target: { value: "Dallas, TX" } });
      fireEvent.click(screen.getByText("Next"));

      // Step 1 shows community options
      await waitFor(() => {
        expect(screen.getByText("Join a Server")).toBeInTheDocument();
      });
    });

    it("goes back to step 0 when Previous is clicked", async () => {
      render(<ProfileCreationWizard {...defaultProps} />);
      // Go to step 1
      fireEvent.change(screen.getByLabelText(/Full Name/), { target: { value: "John Doe" } });
      fireEvent.change(screen.getByLabelText(/Location/), { target: { value: "Dallas, TX" } });
      fireEvent.click(screen.getByText("Next"));

      await waitFor(() => {
        expect(screen.getByText("Join a Server")).toBeInTheDocument();
      });

      // Go back using "Previous" button
      fireEvent.click(screen.getByText("Previous"));
      expect(screen.getByLabelText(/Full Name/)).toBeInTheDocument();
    });
  });

  describe("input handling", () => {
    it("updates displayName on change", () => {
      render(<ProfileCreationWizard {...defaultProps} />);
      const input = screen.getByLabelText(/Full Name/) as HTMLInputElement;
      fireEvent.change(input, { target: { value: "Jane Smith" } });
      expect(input.value).toBe("Jane Smith");
    });

    it("updates location on change", () => {
      render(<ProfileCreationWizard {...defaultProps} />);
      const input = screen.getByLabelText(/Location/) as HTMLInputElement;
      fireEvent.change(input, { target: { value: "Houston, TX" } });
      expect(input.value).toBe("Houston, TX");
    });
  });

  describe("night mode", () => {
    it("renders in night mode without crashing", () => {
      render(<ProfileCreationWizard {...defaultProps} nightMode />);
      expect(screen.getByLabelText(/Full Name/)).toBeInTheDocument();
    });
  });

  describe("referral code from localStorage", () => {
    it("loads referral code from localStorage on mount", () => {
      localStorage.setItem("lightning_referral_code", "testcode");
      render(<ProfileCreationWizard {...defaultProps} />);
      const input = screen.getByLabelText(/Referral Code/) as HTMLInputElement;
      expect(input.value).toBe("testcode");
    });
  });
});
