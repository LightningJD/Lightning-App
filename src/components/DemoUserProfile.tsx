import React, { useState } from 'react';
import OtherUserProfileDialog from './OtherUserProfileDialog';

interface DemoUserProfileProps {
  nightMode: boolean;
}

const DemoUserProfile: React.FC<DemoUserProfileProps> = ({ nightMode }) => {
  const [showDemo, setShowDemo] = useState(false);

  // Mock user data to demonstrate the layout
  const mockUser = {
    id: 'demo-user-123',
    displayName: 'Sarah Johnson',
    username: 'sarahj',
    avatar: '👩‍💼',
    location: 'Nashville, TN',
    distance: '12 miles',
    online: true,
    bio: 'Worship leader and coffee enthusiast ☕ | Jesus follower | Love hiking and songwriting',
    story: {
      id: 'demo-testimony-123',
      title: 'From Darkness to Light',
      content: 'My life was completely transformed when I encountered God\'s love. I was struggling with anxiety and depression, feeling lost and alone. But through prayer and community, God showed me His incredible grace and purpose for my life. Now I wake up every day with hope and joy!',
      lesson: 'God\'s grace is sufficient, even in our darkest moments. He never gives up on us.',
      likeCount: 42
    },
    music: {
      platform: 'youtube' as const,
      spotifyUrl: 'https://www.youtube.com/watch?v=T1LRsp8qBY0',
      trackName: 'YOUR WAY\'S BETTER',
      artist: 'Forrest Frank'
    },
    mutualFriends: 3
  };

  return (
    <>
      <button
        onClick={() => setShowDemo(true)}
        className={`fixed bottom-4 left-4 z-50 px-4 py-2 rounded-lg font-semibold transition-all ${
          nightMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
      >
        👁️ Preview Other User Profile
      </button>

      {showDemo && (
        <OtherUserProfileDialog
          user={mockUser}
          onClose={() => setShowDemo(false)}
          nightMode={nightMode}
          onMessage={(user) => {
            console.log('Message clicked for:', user.displayName);
            alert(`Message feature would open for ${user.displayName}`);
          }}
        />
      )}
    </>
  );
};

export default DemoUserProfile;
