import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

/**
 * Integration test for the search radius input in App.tsx
 * Tests the actual behavior of the input field when userProfile changes
 */

// Mock component that simulates the App.tsx behavior
function SearchRadiusWithProfileSync({
  initialProfile,
  onProfileChange,
}: {
  initialProfile: { searchRadius: number };
  onProfileChange?: (profile: { searchRadius: number }) => void;
}) {
  const [userProfile, setUserProfile] = React.useState(initialProfile);
  const [searchRadius, setSearchRadius] = React.useState(userProfile.searchRadius);

  // THIS IS THE BUG: useEffect resets searchRadius whenever userProfile changes
  // This means user input gets overwritten by the profile value
  React.useEffect(() => {
    if (userProfile) {
      setSearchRadius(userProfile.searchRadius);
    }
  }, [userProfile]);

  // Simulate frequent profile updates (like from real-time sync)
  React.useEffect(() => {
    const interval = setInterval(() => {
      // Simulate profile "updates" that don't actually change the value
      // but trigger the useEffect anyway (object reference changes)
      setUserProfile({ ...userProfile });
    }, 100);
    return () => clearInterval(interval);
  }, [userProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setSearchRadius(0);
    } else {
      setSearchRadius(parseInt(val));
    }
  };

  const handleSave = async () => {
    // Simulate saving which might trigger a profile update
    const updatedProfile = { searchRadius };
    setUserProfile(updatedProfile);
    if (onProfileChange) {
      onProfileChange(updatedProfile);
    }
  };

  return (
    <div>
      <input
        type="number"
        value={searchRadius}
        onChange={handleChange}
        data-testid="search-radius-input"
      />
      <button onClick={handleSave} data-testid="save-button">
        Save
      </button>
      <div data-testid="current-value">{searchRadius}</div>
    </div>
  );
}

describe('Search Radius Input - Profile Sync Bug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow user to type and change the value from 20 to 50', async () => {
    const user = userEvent.setup();

    render(<SearchRadiusWithProfileSync initialProfile={{ searchRadius: 20 }} />);

    const input = screen.getByTestId('search-radius-input') as HTMLInputElement;

    // Initial value should be 20
    expect(input.value).toBe('20');

    // User clears and types 50
    await user.clear(input);
    await user.type(input, '50');

    // Value should now be 50 (but currently it stays at 20 due to bug)
    expect(input.value).toBe('50');
  });

  it('should maintain user input even when component re-renders', async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <SearchRadiusWithProfileSync initialProfile={{ searchRadius: 20 }} />
    );

    const input = screen.getByTestId('search-radius-input') as HTMLInputElement;

    // User changes value to 75
    await user.clear(input);
    await user.type(input, '75');

    expect(input.value).toBe('75');

    // Component re-renders (simulating any state change)
    rerender(<SearchRadiusWithProfileSync initialProfile={{ searchRadius: 20 }} />);

    // Value should still be 75 (user's input should persist)
    await waitFor(() => {
      expect(input.value).toBe('75');
    });
  });

  it('should not reset user input when userProfile changes externally', async () => {
    const user = userEvent.setup();

    // Start with profile value of 20
    const { rerender } = render(
      <SearchRadiusWithProfileSync initialProfile={{ searchRadius: 20 }} />
    );

    const input = screen.getByTestId('search-radius-input') as HTMLInputElement;

    // User types 60
    await user.clear(input);
    await user.type(input, '60');

    expect(input.value).toBe('60');

    // Simulate external profile update (e.g., from database sync)
    // This currently RESETS the input to 20 (THE BUG)
    rerender(<SearchRadiusWithProfileSync initialProfile={{ searchRadius: 20 }} />);

    // User's input should PERSIST and stay at 60
    // (But currently it resets to 20 due to useEffect bug)
    await waitFor(() => {
      expect(input.value).toBe('60');
    });
  });

  it('should only update input when user explicitly saves', async () => {
    const user = userEvent.setup();
    const onProfileChange = vi.fn();

    render(
      <SearchRadiusWithProfileSync
        initialProfile={{ searchRadius: 20 }}
        onProfileChange={onProfileChange}
      />
    );

    const input = screen.getByTestId('search-radius-input') as HTMLInputElement;
    const saveButton = screen.getByTestId('save-button');

    // User types 80
    await user.clear(input);
    await user.type(input, '80');

    expect(input.value).toBe('80');

    // Click save
    await user.click(saveButton);

    await waitFor(() => {
      expect(onProfileChange).toHaveBeenCalledWith({ searchRadius: 80 });
    });

    // After save, value should still be 80
    expect(input.value).toBe('80');
  });

  it('should handle rapid typing without losing characters', async () => {
    const user = userEvent.setup();

    render(<SearchRadiusWithProfileSync initialProfile={{ searchRadius: 20 }} />);

    const input = screen.getByTestId('search-radius-input') as HTMLInputElement;

    // User rapidly types "95"
    await user.clear(input);
    await user.type(input, '95');

    // All characters should be captured
    expect(input.value).toBe('95');
  });
});
