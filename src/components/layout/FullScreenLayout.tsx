/*
 * FullScreenLayout — Layer 2b of the layout architecture
 *
 * Minimal wrapper with no header, no bottom nav, no sidebar.
 * Pages inside this layout own their own UI completely.
 *
 * Used for: ChannelChat, and future full-screen views (DMs, testimony creation).
 */

import { Outlet } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';

const FullScreenLayout: React.FC = () => {
  const { nightMode, themes, selectedTheme } = useAppContext();

  return (
    <>
      {/* Full-Screen Background — same as AppLayout for visual consistency */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: nightMode
            ? themes[selectedTheme].darkGradient
            : themes[selectedTheme].lightGradient,
        }}
      />

      <div className="h-screen w-screen flex flex-col relative">
        <Outlet />
      </div>
    </>
  );
};

export default FullScreenLayout;
