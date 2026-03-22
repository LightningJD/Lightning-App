import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock Clerk's SignUp component
vi.mock("@clerk/clerk-react", () => ({
  SignUp: (props: any) => (
    <div data-testid="clerk-sign-up" data-path={props.path} data-sign-in-url={props.signInUrl}>
      Clerk SignUp
    </div>
  ),
}));

import SignUpPage from "../components/SignUpPage";

describe("SignUpPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders without crashing", () => {
    render(<SignUpPage />);
    expect(screen.getByText("Join Lightning")).toBeInTheDocument();
  });

  it("displays the lightning bolt branding", () => {
    render(<SignUpPage />);
    expect(screen.getByText("⚡")).toBeInTheDocument();
  });

  it("displays the sign-up tagline", () => {
    render(<SignUpPage />);
    expect(screen.getByText("Start sharing your testimony today")).toBeInTheDocument();
  });

  it("displays the footer description", () => {
    render(<SignUpPage />);
    expect(
      screen.getByText("Free account • Share your story • Connect with believers worldwide")
    ).toBeInTheDocument();
  });

  it("renders the Clerk SignUp component", () => {
    render(<SignUpPage />);
    expect(screen.getByTestId("clerk-sign-up")).toBeInTheDocument();
  });

  it("passes correct routing props to Clerk SignUp", () => {
    render(<SignUpPage />);
    const clerkSignUp = screen.getByTestId("clerk-sign-up");
    expect(clerkSignUp).toHaveAttribute("data-path", "/sign-up");
    expect(clerkSignUp).toHaveAttribute("data-sign-in-url", "/sign-in");
  });

  it("applies gradient background", () => {
    render(<SignUpPage />);
    const container = screen.getByText("Join Lightning").closest(".min-h-screen");
    expect(container).toBeTruthy();
    const style = container?.getAttribute("style") || "";
    expect(style).toContain("linear-gradient");
  });

  it("cleans up timers and observer on unmount", () => {
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
    const disconnectSpy = vi.fn();
    const originalMutationObserver = global.MutationObserver;

    // Must be a proper class/constructor for `new MutationObserver()`
    global.MutationObserver = class {
      observe = vi.fn();
      disconnect = disconnectSpy;
      takeRecords = vi.fn();
      constructor() {}
    } as any;

    const { unmount } = render(<SignUpPage />);
    unmount();

    // 5 timers should be cleared
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(5);
    expect(disconnectSpy).toHaveBeenCalledTimes(1);

    global.MutationObserver = originalMutationObserver;
    clearTimeoutSpy.mockRestore();
  });
});
