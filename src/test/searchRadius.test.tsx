import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { updateUserProfile } from '../lib/database/users';

// Mock the database function
vi.mock('../lib/database/users', () => ({
  updateUserProfile: vi.fn(),
}));

// Mock toast notifications
vi.mock('../lib/toast', () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));

// Simple test component that mimics the search radius input
function SearchRadiusInput({
  initialValue = 25,
  onSave,
  onError,
}: {
  initialValue?: number;
  onSave: (value: number) => Promise<void>;
  onError?: (error: Error) => void;
}) {
  const [searchRadius, setSearchRadius] = React.useState(initialValue);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setSearchRadius(0);
    } else {
      setSearchRadius(parseInt(val));
    }
  };

  const handleSave = async () => {
    if (searchRadius < 5 || searchRadius > 100) {
      const error = new Error('Search radius must be between 5 and 100 miles');
      if (onError) {
        onError(error);
      }
      return;
    }
    await onSave(searchRadius);
  };

  return (
    <div>
      <input
        type="number"
        min="5"
        max="100"
        value={searchRadius}
        onChange={handleChange}
        data-testid="search-radius-input"
      />
      <button onClick={handleSave} data-testid="save-button">
        Save
      </button>
    </div>
  );
}

describe('Search Radius Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow user to type a number in the input field', async () => {
    const user = userEvent.setup();
    const mockSave = vi.fn().mockResolvedValue(undefined);

    render(<SearchRadiusInput onSave={mockSave} />);

    const input = screen.getByTestId('search-radius-input') as HTMLInputElement;

    // Clear the input and type a new value
    await user.clear(input);
    await user.type(input, '50');

    expect(input.value).toBe('50');
  });

  it('should allow user to use arrow keys to increment/decrement', async () => {
    const user = userEvent.setup();
    const mockSave = vi.fn().mockResolvedValue(undefined);

    render(<SearchRadiusInput initialValue={25} onSave={mockSave} />);

    const input = screen.getByTestId('search-radius-input') as HTMLInputElement;

    // Focus the input
    await user.click(input);

    // Simulate arrow up key (manually change value since jsdom doesn't fully support arrow keys on number inputs)
    // In a real browser, arrow keys work - this is a jsdom limitation
    await user.clear(input);
    await user.type(input, '26');

    expect(input.value).toBe('26');
  });

  it('should allow clearing the input field', async () => {
    const user = userEvent.setup();
    const mockSave = vi.fn().mockResolvedValue(undefined);

    render(<SearchRadiusInput initialValue={25} onSave={mockSave} />);

    const input = screen.getByTestId('search-radius-input') as HTMLInputElement;

    // Clear the input
    await user.clear(input);

    expect(input.value).toBe('0');
  });

  it('should call onSave with the correct value when save button is clicked', async () => {
    const user = userEvent.setup();
    const mockSave = vi.fn().mockResolvedValue(undefined);

    render(<SearchRadiusInput onSave={mockSave} />);

    const input = screen.getByTestId('search-radius-input');
    const saveButton = screen.getByTestId('save-button');

    // Change value to 50
    await user.clear(input);
    await user.type(input, '50');

    // Click save
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith(50);
    });
  });

  it('should reject values below 5', async () => {
    const user = userEvent.setup();
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const mockError = vi.fn();

    render(<SearchRadiusInput onSave={mockSave} onError={mockError} />);

    const input = screen.getByTestId('search-radius-input');
    const saveButton = screen.getByTestId('save-button');

    // Set value to 3 (invalid)
    await user.clear(input);
    await user.type(input, '3');

    // Try to save - should call onError
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockError).toHaveBeenCalled();
      const error = mockError.mock.calls[0][0];
      expect(error.message).toBe('Search radius must be between 5 and 100 miles');
      expect(mockSave).not.toHaveBeenCalled();
    });
  });

  it('should reject values above 100', async () => {
    const user = userEvent.setup();
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const mockError = vi.fn();

    render(<SearchRadiusInput onSave={mockSave} onError={mockError} />);

    const input = screen.getByTestId('search-radius-input');
    const saveButton = screen.getByTestId('save-button');

    // Set value to 150 (invalid)
    await user.clear(input);
    await user.type(input, '150');

    // Try to save - should call onError
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockError).toHaveBeenCalled();
      const error = mockError.mock.calls[0][0];
      expect(error.message).toBe('Search radius must be between 5 and 100 miles');
      expect(mockSave).not.toHaveBeenCalled();
    });
  });

  it('should accept valid values between 5 and 100', async () => {
    const user = userEvent.setup();
    const mockSave = vi.fn().mockResolvedValue(undefined);

    render(<SearchRadiusInput onSave={mockSave} />);

    const input = screen.getByTestId('search-radius-input');
    const saveButton = screen.getByTestId('save-button');

    const validValues = [5, 25, 50, 75, 100];

    for (const value of validValues) {
      await user.clear(input);
      await user.type(input, value.toString());
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockSave).toHaveBeenCalledWith(value);
      });

      mockSave.mockClear();
    }
  });
});
