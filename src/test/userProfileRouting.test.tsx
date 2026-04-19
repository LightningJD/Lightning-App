import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';

// --- Module mocks (hoisted by vitest before imports) ---

vi.mock('../lib/database', () => ({
  getUserByUsername: vi.fn(),
  getTestimonyByUserId: vi.fn().mockResolvedValue(null),
  getChurchById: vi.fn().mockResolvedValue(null),
}));

vi.mock('../contexts/AppContext', () => ({
  useAppContext: () => ({
    nightMode: false,
    themes: {
      ocean: {
        name: 'Ocean',
        lightGradient: 'linear-gradient(to bottom, #e0f2fe, #f0f9ff)',
        darkGradient: 'linear-gradient(to bottom, #0c1a2e, #1e3a5f)',
        description: 'Ocean theme',
      },
    },
    selectedTheme: 'ocean',
  }),
}));

vi.mock('../components/useUserProfile', () => ({
  useUserProfile: () => ({
    isLoading: false,
    isAuthenticated: true,
    isSyncing: false,
    profile: { supabaseId: 'current-user-id' },
    user: null,
  }),
}));

// Stub ProfileTab so we don't pull in its heavy dependency tree
vi.mock('../components/ProfileTab', () => ({
  default: ({ profile }: { profile: any }) => (
    <div data-testid="profile-tab">{profile?.displayName ?? 'Unknown'}</div>
  ),
}));

import { getUserByUsername } from '../lib/database';
import UserProfilePage from '../pages/UserProfilePage';

// ---------------------------------------------------------------------------
// Helper stubs used in route-priority tests
// ---------------------------------------------------------------------------

function MockFeedPage() {
  return <div data-testid="feed-page">Feed</div>;
}

function MockProfilePage() {
  return <div data-testid="profile-page">Profile</div>;
}

// ---------------------------------------------------------------------------
// Route priority tests
//
// These use the same route ordering as AuthWrapper (/u/:handle before /*)
// to prove the specific route takes precedence over the catch-all.
// Before BUG-03 was fixed, /u/:handle fell through to /* and rendered the feed.
// ---------------------------------------------------------------------------

describe('/u/:handle route priority', () => {
  it('routes /u/<handle> to UserProfilePage, not the feed catch-all', () => {
    render(
      <MemoryRouter initialEntries={['/u/testimonies']}>
        <Routes>
          <Route path="/u/:handle" element={<MockProfilePage />} />
          <Route path="/*" element={<MockFeedPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('profile-page')).toBeInTheDocument();
    expect(screen.queryByTestId('feed-page')).not.toBeInTheDocument();
  });

  it('routes / to the feed, not UserProfilePage', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/u/:handle" element={<MockProfilePage />} />
          <Route path="/*" element={<MockFeedPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('feed-page')).toBeInTheDocument();
    expect(screen.queryByTestId('profile-page')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// UserProfilePage component behavior tests
//
// These tests verify the actual component renders the correct state.
// Both would have failed before the fix because UserProfilePage didn't exist.
// ---------------------------------------------------------------------------

describe('UserProfilePage component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the profile for an existing handle, not the feed', async () => {
    vi.mocked(getUserByUsername).mockResolvedValue({
      id: 'user-123',
      username: 'testimonies',
      display_name: 'Test User',
      avatar_emoji: '✝️',
      bio: 'My faith journey',
      clerk_id: 'clerk-123',
      email: 'test@example.com',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });

    render(
      <MemoryRouter initialEntries={['/u/testimonies']}>
        <Routes>
          <Route path="/u/:handle" element={<UserProfilePage />} />
          <Route path="/*" element={<MockFeedPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-profile')).toBeInTheDocument();
    });
    expect(screen.getByTestId('profile-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('not-found')).not.toBeInTheDocument();
    expect(screen.queryByTestId('feed-page')).not.toBeInTheDocument();
  });

  it('renders not-found for a non-existing handle, not the feed', async () => {
    vi.mocked(getUserByUsername).mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={['/u/ghost-user']}>
        <Routes>
          <Route path="/u/:handle" element={<UserProfilePage />} />
          <Route path="/*" element={<MockFeedPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('not-found')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('user-profile')).not.toBeInTheDocument();
    expect(screen.queryByTestId('profile-tab')).not.toBeInTheDocument();
    expect(screen.queryByTestId('feed-page')).not.toBeInTheDocument();
  });
});
