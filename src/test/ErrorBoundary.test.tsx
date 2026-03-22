import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import ErrorBoundary, {
  ComponentErrorBoundary,
  useAsyncError,
  withErrorBoundary,
} from "../components/ErrorBoundary";

// Suppress console.error for expected error boundary triggers
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
  // Reset Sentry mock
  (window as any).Sentry = undefined;
});

afterEach(() => {
  console.error = originalConsoleError;
});

// Component that throws on render
const ThrowingComponent = ({ message = "Test error" }: { message?: string }) => {
  throw new Error(message);
};

// Component that renders fine
const GoodComponent = () => <div>Working content</div>;

describe("ErrorBoundary", () => {
  describe("when no error occurs", () => {
    it("renders children normally", () => {
      render(
        <ErrorBoundary>
          <GoodComponent />
        </ErrorBoundary>
      );
      expect(screen.getByText("Working content")).toBeInTheDocument();
    });
  });

  describe("when an error occurs", () => {
    it("shows default error UI", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );
      expect(screen.getByText("Oops! Something went wrong")).toBeInTheDocument();
    });

    it("shows custom message when provided", () => {
      render(
        <ErrorBoundary message="Custom error message">
          <ThrowingComponent />
        </ErrorBoundary>
      );
      expect(screen.getByText("Custom error message")).toBeInTheDocument();
    });

    it("shows default message when no custom message", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );
      expect(
        screen.getByText(
          "We're sorry, but something unexpected happened. Please try refreshing the page."
        )
      ).toBeInTheDocument();
    });

    it("renders custom fallback when provided", () => {
      render(
        <ErrorBoundary fallback={<div>Custom fallback</div>}>
          <ThrowingComponent />
        </ErrorBoundary>
      );
      expect(screen.getByText("Custom fallback")).toBeInTheDocument();
      expect(screen.queryByText("Oops! Something went wrong")).not.toBeInTheDocument();
    });

    it("renders action buttons", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );
      expect(screen.getByText("Try Again")).toBeInTheDocument();
      expect(screen.getByText("Refresh Page")).toBeInTheDocument();
      expect(screen.getByText("Go to Home")).toBeInTheDocument();
      expect(screen.getByText("Report this issue")).toBeInTheDocument();
    });

    it("calls onError callback", () => {
      const onError = vi.fn();
      render(
        <ErrorBoundary onError={onError}>
          <ThrowingComponent message="callback test" />
        </ErrorBoundary>
      );
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][0].message).toBe("callback test");
    });

    it("resets on Try Again click and calls onReset", () => {
      const onReset = vi.fn();
      // After reset, ThrowingComponent will throw again, so we need a way to toggle.
      // Instead, just verify the callback fires.
      render(
        <ErrorBoundary onReset={onReset}>
          <ThrowingComponent />
        </ErrorBoundary>
      );
      fireEvent.click(screen.getByText("Try Again"));
      expect(onReset).toHaveBeenCalledTimes(1);
    });

    it("shows error details when showDetails is true", () => {
      render(
        <ErrorBoundary showDetails>
          <ThrowingComponent message="Detailed error" />
        </ErrorBoundary>
      );
      expect(screen.getByText("Error Details:")).toBeInTheDocument();
      expect(screen.getByText(/Detailed error/)).toBeInTheDocument();
    });

    it("hides error details when showDetails is false", () => {
      render(
        <ErrorBoundary showDetails={false}>
          <ThrowingComponent />
        </ErrorBoundary>
      );
      expect(screen.queryByText("Error Details:")).not.toBeInTheDocument();
    });

    it("dispatches openBugReport event on Report click", () => {
      const listener = vi.fn();
      window.addEventListener("openBugReport", listener);

      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );
      fireEvent.click(screen.getByText("Report this issue"));

      expect(listener).toHaveBeenCalledTimes(1);
      window.removeEventListener("openBugReport", listener);
    });

    it("reports to Sentry when configured", () => {
      const captureException = vi.fn();
      (window as any).Sentry = { captureException };

      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(captureException).toHaveBeenCalledTimes(1);
    });

    it("applies night mode styling", () => {
      render(
        <ErrorBoundary nightMode>
          <ThrowingComponent />
        </ErrorBoundary>
      );
      const container = screen.getByText("Oops! Something went wrong").closest(".min-h-screen");
      expect(container?.className).toContain("bg-[#0a0a0a]");
    });

    it("does not show error count on first error", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );
      expect(screen.queryByText(/This error has occurred/)).not.toBeInTheDocument();
    });
  });
});

describe("ComponentErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ComponentErrorBoundary>
        <GoodComponent />
      </ComponentErrorBoundary>
    );
    expect(screen.getByText("Working content")).toBeInTheDocument();
  });

  it("shows component-specific error message", () => {
    render(
      <ComponentErrorBoundary name="TestWidget">
        <ThrowingComponent />
      </ComponentErrorBoundary>
    );
    expect(screen.getByText("TestWidget failed to load")).toBeInTheDocument();
  });

  it("shows default name when not provided", () => {
    render(
      <ComponentErrorBoundary>
        <ThrowingComponent />
      </ComponentErrorBoundary>
    );
    expect(screen.getByText("This component failed to load")).toBeInTheDocument();
  });

  it("shows refresh button", () => {
    render(
      <ComponentErrorBoundary>
        <ThrowingComponent />
      </ComponentErrorBoundary>
    );
    expect(screen.getByText("Refresh Page")).toBeInTheDocument();
  });
});

describe("withErrorBoundary HOC", () => {
  it("wraps component with error boundary", () => {
    const WrappedGood = withErrorBoundary(GoodComponent);
    render(<WrappedGood />);
    expect(screen.getByText("Working content")).toBeInTheDocument();
  });

  it("catches errors in wrapped component", () => {
    const WrappedBad = withErrorBoundary(ThrowingComponent);
    render(<WrappedBad />);
    expect(screen.getByText("Oops! Something went wrong")).toBeInTheDocument();
  });

  it("sets displayName on wrapped component", () => {
    const Named = () => <div>Named</div>;
    Named.displayName = "MyComponent";
    const Wrapped = withErrorBoundary(Named);
    expect(Wrapped.displayName).toBe("withErrorBoundary(MyComponent)");
  });
});

describe("useAsyncError", () => {
  it("throws error to be caught by boundary", () => {
    const AsyncErrorThrower = () => {
      const throwError = useAsyncError();
      return (
        <button onClick={() => throwError(new Error("async fail"))}>
          Trigger
        </button>
      );
    };

    render(
      <ErrorBoundary>
        <AsyncErrorThrower />
      </ErrorBoundary>
    );

    // Before clicking, content is normal
    expect(screen.getByText("Trigger")).toBeInTheDocument();

    // After clicking, error boundary catches it
    fireEvent.click(screen.getByText("Trigger"));
    expect(screen.getByText("Oops! Something went wrong")).toBeInTheDocument();
  });
});
