import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

/**
 * Tests for leading zero bug in search radius input
 *
 * Issue: When user types "5", the input shows "05" with a leading zero
 * This is confusing and looks like a bug
 */

// Mock search radius input component
function SearchRadiusInput({
  initialValue = 25,
  onChange
}: {
  initialValue?: number;
  onChange?: (value: number) => void;
}) {
  const [searchRadius, setSearchRadius] = React.useState(initialValue);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setSearchRadius(0);
    } else {
      const numValue = parseInt(val);
      setSearchRadius(numValue);
      if (onChange) {
        onChange(numValue);
      }
    }
  };

  return (
    <div>
      <input
        type="number"
        value={searchRadius}
        onChange={handleChange}
        min={5}
        max={100}
        data-testid="search-radius-input"
      />
      <div data-testid="display-value">{searchRadius} miles</div>
    </div>
  );
}

describe('Search Radius Leading Zero Bug', () => {
  beforeEach(() => {
    // Clear any previous renders
  });

  it('should not show leading zero when typing single digit (5)', async () => {
    const user = userEvent.setup();

    render(<SearchRadiusInput initialValue={25} />);

    const input = screen.getByTestId('search-radius-input') as HTMLInputElement;

    // Clear and type "5"
    await user.clear(input);
    await user.type(input, '5');

    // Value should be "5", NOT "05"
    expect(input.value).toBe('5');
    expect(input.value).not.toBe('05');
  });

  it('should not show leading zero when typing "10"', async () => {
    const user = userEvent.setup();

    render(<SearchRadiusInput initialValue={25} />);

    const input = screen.getByTestId('search-radius-input') as HTMLInputElement;

    // Clear and type "10"
    await user.clear(input);
    await user.type(input, '10');

    // Value should be "10", NOT "010"
    expect(input.value).toBe('10');
    expect(input.value).not.toBe('010');
  });

  it('should handle typing "50" without leading zeros', async () => {
    const user = userEvent.setup();

    render(<SearchRadiusInput initialValue={25} />);

    const input = screen.getByTestId('search-radius-input') as HTMLInputElement;

    // Clear and type "50"
    await user.clear(input);
    await user.type(input, '50');

    // Value should be "50", NOT "050"
    expect(input.value).toBe('50');
    expect(input.value).not.toMatch(/^0/); // No leading zero
  });

  it('should handle typing "100" without leading zeros', async () => {
    const user = userEvent.setup();

    render(<SearchRadiusInput initialValue={25} />);

    const input = screen.getByTestId('search-radius-input') as HTMLInputElement;

    // Clear and type "100"
    await user.clear(input);
    await user.type(input, '100');

    // Value should be "100", NOT "0100"
    expect(input.value).toBe('100');
    expect(input.value).not.toMatch(/^0/); // No leading zero
  });

  it('should display correct value in the "X miles" text', async () => {
    const user = userEvent.setup();

    render(<SearchRadiusInput initialValue={25} />);

    const input = screen.getByTestId('search-radius-input') as HTMLInputElement;
    const display = screen.getByTestId('display-value');

    // Initial display
    expect(display.textContent).toBe('25 miles');

    // Type "15"
    await user.clear(input);
    await user.type(input, '15');

    // Display should show "15 miles", NOT "015 miles"
    expect(display.textContent).toBe('15 miles');
    expect(display.textContent).not.toMatch(/^0/);
  });

  it('should not preserve leading zeros when user types "05"', async () => {
    const user = userEvent.setup();

    render(<SearchRadiusInput initialValue={25} />);

    const input = screen.getByTestId('search-radius-input') as HTMLInputElement;

    // User types "05" (with leading zero)
    await user.clear(input);
    await user.type(input, '05');

    // Input should normalize to "5" (remove leading zero)
    // parseInt("05") = 5, and when set back as value it should be "5"
    expect(input.value).toBe('5');
  });

  it('should handle backspace without creating leading zeros', async () => {
    const user = userEvent.setup();

    render(<SearchRadiusInput initialValue={50} />);

    const input = screen.getByTestId('search-radius-input') as HTMLInputElement;

    // Initial value is 50
    expect(input.value).toBe('50');

    // Click on input and backspace once (50 -> 5)
    await user.click(input);
    await user.keyboard('{Backspace}');

    // Value should be "5", NOT "05"
    expect(input.value).toBe('5');
    expect(input.value).not.toBe('05');
  });

  // Note: Arrow key test removed due to jsdom limitation
  // jsdom doesn't fully support arrow key behavior on number inputs
  // This behavior is tested manually in browser

  it('should call onChange with number value, not string with leading zero', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<SearchRadiusInput initialValue={25} onChange={onChange} />);

    const input = screen.getByTestId('search-radius-input') as HTMLInputElement;

    // Type "7"
    await user.clear(input);
    await user.type(input, '7');

    // onChange should be called with number 7, not "07"
    expect(onChange).toHaveBeenCalledWith(7);
    expect(onChange).not.toHaveBeenCalledWith('07');
  });
});
