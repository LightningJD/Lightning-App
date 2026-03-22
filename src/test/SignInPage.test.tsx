import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock Clerk's SignIn component
vi.mock("@clerk/clerk-react", () => ({
  SignIn: (props: any) => (
    <div data-testid="clerk-sign-in" data-path={props.path} data-sign-up-url={props.signUpUrl}>
      Clerk SignIn
    </div>
  ),
}));

import SignInPage from "../components/SignInPage";

describe("SignInPage", () => {
  it("renders without crashing", () => {
    render(<SignInPage />);
    expect(screen.getByText("Lightning")).toBeInTheDocument();
  });

  it("displays the lightning bolt branding", () => {
    render(<SignInPage />);
    expect(screen.getByText("⚡")).toBeInTheDocument();
  });

  it("displays the tagline", () => {
    render(<SignInPage />);
    expect(screen.getByText("Connect. Share. Grow.")).toBeInTheDocument();
  });

  it("displays the description text", () => {
    render(<SignInPage />);
    expect(
      screen.getByText("A faith-based community to share your testimony and connect with others")
    ).toBeInTheDocument();
  });

  it("renders the Clerk SignIn component", () => {
    render(<SignInPage />);
    expect(screen.getByTestId("clerk-sign-in")).toBeInTheDocument();
  });

  it("passes correct routing props to Clerk SignIn", () => {
    render(<SignInPage />);
    const clerkSignIn = screen.getByTestId("clerk-sign-in");
    expect(clerkSignIn).toHaveAttribute("data-path", "/sign-in");
    expect(clerkSignIn).toHaveAttribute("data-sign-up-url", "/sign-up");
  });

  it("applies gradient background", () => {
    render(<SignInPage />);
    const container = screen.getByText("Lightning").closest(".min-h-screen");
    expect(container).toBeTruthy();
    const style = container?.getAttribute("style") || "";
    expect(style).toContain("linear-gradient");
  });
});
