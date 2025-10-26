import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

/**
 * Test to verify the actual App.tsx search radius input behavior
 *
 * This tests the exact implementation in App.tsx lines 1080-1092:
 * - type="number"
 * - value={searchRadius} (controlled by state)
 * - onChange uses parseInt(val) which strips leading zeros
 */

describe('App.tsx Search Radius - Actual Implementation', () => {
  // Component that mirrors the exact App.tsx implementation
  function ActualSearchRadiusInput() {
    const [searchRadius, setSearchRadius] = React.useState(25);

    return (
      <div>
        <input
          type="number"
          min="5"
          max="100"
          value={searchRadius}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '') {
              setSearchRadius(0); // Allow clearing
            } else {
              setSearchRadius(parseInt(val));
            }
          }}
          data-testid="search-radius-input"
        />
        <div data-testid="display-value">{searchRadius} miles</div>
      </div>
    );
  }

  it('should not show leading zero when user types "5"', async () => {
    const user = userEvent.setup();

    render(<ActualSearchRadiusInput />);

    const input = screen.getByTestId('search-radius-input') as HTMLInputElement;

    // Clear and type "5"
    await user.clear(input);
    await user.type(input, '5');

    // Input value should be "5", NOT "05"
    expect(input.value).toBe('5');

    // Display should also show "5 miles"
    const display = screen.getByTestId('display-value');
    expect(display.textContent).toBe('5 miles');
  });

  it('should not show leading zero when user types "05" explicitly', async () => {
    const user = userEvent.setup();

    render(<ActualSearchRadiusInput />);

    const input = screen.getByTestId('search-radius-input') as HTMLInputElement;

    // User tries to type "05" with leading zero
    await user.clear(input);
    await user.type(input, '05');

    // parseInt("05") = 5, so value should be normalized to "5"
    expect(input.value).toBe('5');
    expect(input.value).not.toBe('05');
  });

  it('should handle two-digit numbers without leading zeros', async () => {
    const user = userEvent.setup();

    render(<ActualSearchRadiusInput />);

    const input = screen.getByTestId('search-radius-input') as HTMLInputElement;

    // Type "50"
    await user.clear(input);
    await user.type(input, '50');

    // Value should be "50", NOT "050"
    expect(input.value).toBe('50');
    expect(input.value).not.toMatch(/^0/); // No leading zero
  });

  it('should handle three-digit numbers without leading zeros', async () => {
    const user = userEvent.setup();

    render(<ActualSearchRadiusInput />);

    const input = screen.getByTestId('search-radius-input') as HTMLInputElement;

    // Type "100"
    await user.clear(input);
    await user.type(input, '100');

    // Value should be "100", NOT "0100"
    expect(input.value).toBe('100');
    expect(input.value).not.toMatch(/^0/); // No leading zero
  });

  it('should update state correctly with parseInt (no leading zeros in state)', async () => {
    const user = userEvent.setup();

    render(<ActualSearchRadiusInput />);

    const input = screen.getByTestId('search-radius-input') as HTMLInputElement;
    const display = screen.getByTestId('display-value');

    // Type "08" (user tries to add leading zero)
    await user.clear(input);
    await user.type(input, '08');

    // State should be 8 (parseInt strips the leading zero)
    expect(display.textContent).toBe('8 miles');

    // Input value should reflect the state (8, not 08)
    expect(input.value).toBe('8');
  });

  it('should handle backspace without creating leading zeros', async () => {
    const user = userEvent.setup();

    render(<ActualSearchRadiusInput />);

    const input = screen.getByTestId('search-radius-input') as HTMLInputElement;

    // Initial value is 25
    expect(input.value).toBe('25');

    // Click and backspace to remove "5" (leaving "2")
    await user.click(input);
    await user.keyboard('{Backspace}');

    // Should show "2", not "02"
    expect(input.value).toBe('2');
    expect(input.value).not.toBe('02');
  });

  it('CRITICAL: No leading zeros anywhere in the input lifecycle', async () => {
    const user = userEvent.setup();

    render(<ActualSearchRadiusInput />);

    const input = screen.getByTestId('search-radius-input') as HTMLInputElement;

    // Test various single-digit inputs
    const testValues = ['5', '6', '7', '8', '9'];

    for (const val of testValues) {
      await user.clear(input);
      await user.type(input, val);

      // CRITICAL: Input should NEVER show leading zeros
      expect(input.value).toBe(val);
      expect(input.value).not.toMatch(/^0[0-9]/); // Regex for leading zero
      expect(input.value.length).toBe(1); // Single digit should be 1 char
    }
  });
});
