import { Plus } from 'lucide-react';
import { ComponentErrorBoundary } from './components/ErrorBoundary';
import ProfileTab from './components/ProfileTab';
import ChatTab from './components/ChatTab';
import NearbyTab from './components/NearbyTab';
import ReferralRedirect from './components/ReferralRedirect';
import AppLayout from './components/AppLayout';
import { useAppContext } from './contexts/AppContext';

// ============================================
// APP — Tab content inside AppLayout (Layer 2a)
//
// GlobalProviders (Layer 1) handles: AppProvider, ErrorBoundary,
// PremiumProvider, GuestModalProvider, Toaster, and all modal dialogs.
// This component only renders the tab-based UI within the app shell.
// ============================================

function App() {
  const ctx = useAppContext();

  const renderContent = () => {
    switch (ctx.currentTab) {
      case 'charge':
        return (
          <ComponentErrorBoundary name="Charge" nightMode={ctx.nightMode}>
            <NearbyTab
              sortBy={ctx.sortBy}
              setSortBy={ctx.setSortBy}
              activeDiscoverTab={ctx.activeDiscoverTab}
              setActiveDiscoverTab={ctx.setActiveDiscoverTab}
              nightMode={ctx.nightMode}
              onNavigateToMessages={(user: any) => {
                ctx.setStartChatWith({ id: String(user.id), name: user.displayName || user.username || 'User', avatar: user.avatar || user.avatar_emoji || '\u{1F464}' });
                ctx.setCurrentTab('home');
              }}
            />
          </ComponentErrorBoundary>
        );
      case 'you':
        return (
          <ComponentErrorBoundary name="Profile" nightMode={ctx.nightMode}>
            <ProfileTab
              profile={ctx.profile}
              nightMode={ctx.nightMode}
              currentUserProfile={ctx.profile}
              onAddTestimony={() => {
                ctx.setShowTestimonyQuestionnaire(true);
                ctx.setTestimonyStartTime(Date.now());
              }}
              onEditTestimony={ctx.handleEditTestimony}
            />
          </ComponentErrorBoundary>
        );
      case 'home':
      default:
        return (
          <ComponentErrorBoundary name="Home" nightMode={ctx.nightMode}>
            <ChatTab
              nightMode={ctx.nightMode}
              onConversationsCountChange={ctx.handleConversationsCountChange}
              startChatWith={ctx.startChatWith}
              onStartChatConsumed={() => ctx.setStartChatWith(null)}
              onActiveServerChange={(name, emoji) => { ctx.setActiveServerName(name); ctx.setActiveServerEmoji(emoji || null); }}
            />
          </ComponentErrorBoundary>
        );
    }
  };

  return (
    <div className="min-h-screen pb-12 relative">
      <ReferralRedirect />

      <AppLayout>
        {renderContent()}
      </AppLayout>

      {/* Testimony Prompt FAB */}
      {ctx.currentTab === 'you' && !ctx.profile.hasTestimony && !ctx.showTestimonyQuestionnaire && (
        <button
          onClick={() => {
            ctx.setShowTestimonyQuestionnaire(true);
            ctx.setTestimonyStartTime(Date.now());
          }}
          className="fixed bottom-20 right-6 w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 z-40 text-slate-100 border border-white/20"
          style={{
            background: 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)',
            boxShadow: ctx.nightMode
              ? '0 8px 24px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              : '0 8px 24px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)';
            e.currentTarget.style.boxShadow = ctx.nightMode
              ? '0 12px 32px rgba(59, 130, 246, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
              : '0 12px 32px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #4faaf8 0%, #3b82f6 50%, #2563eb 100%)';
            e.currentTarget.style.boxShadow = ctx.nightMode
              ? '0 8px 24px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              : '0 8px 24px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25)';
          }}
        >
          <Plus className="w-7 h-7 text-white" />
        </button>
      )}
    </div>
  );
}

export default App;
