import React from 'react';
import { Zap, Plus } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary, { ComponentErrorBoundary } from './components/ErrorBoundary';
import ProfileTab from './components/ProfileTab';
import ChatTab from './components/ChatTab';
import NearbyTab from './components/NearbyTab';
import ProfileCreationWizard from './components/ProfileCreationWizard';
import ProfileEditDialog from './components/ProfileEditDialog';
import ChangePictureModal from './components/ChangePictureModal';
import EditTestimonyDialog from './components/EditTestimonyDialog';
import ConfirmDialog from './components/ConfirmDialog';
import SaveTestimonyModal from './components/SaveTestimonyModal';
import SecretsMuseum from './components/SecretsMuseum';
import BugReportDialog from './components/BugReportDialog';
import TermsOfService from './components/TermsOfService';
import PrivacyPolicy from './components/PrivacyPolicy';
import HelpCenter from './components/HelpCenter';
import ContactSupport from './components/ContactSupport';
import BlockedUsers from './components/BlockedUsers';
import ReportContent from './components/ReportContent';
import LinkSpotify from './components/LinkSpotify';
import TestimonyQuestionnaire from './components/TestimonyQuestionnaire';
import ReferralRedirect from './components/ReferralRedirect';
import AdminDashboard from './components/AdminDashboard';
import SettingsMenu from './components/SettingsMenu';
import AppLayout from './components/AppLayout';
import { GuestModalProvider } from './contexts/GuestModalContext';
import { PremiumProvider } from './contexts/PremiumContext';
import { AppProvider, useAppContext } from './contexts/AppContext';
import { showLoading, updateToSuccess, updateToError } from './lib/toast';
import { updateUserProfile } from './lib/database';
import { trackAvatarChange } from './lib/activityTracker';
import { unlockSecret } from './lib/secrets';

// ============================================
// INNER APP — uses AppContext
// ============================================

function AppInner() {
  const ctx = useAppContext();

  const renderContent = () => {
    switch (ctx.currentTab) {
      case 'home':
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

  if (ctx.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: ctx.nightMode ? ctx.themes[ctx.selectedTheme].darkGradient : ctx.themes[ctx.selectedTheme].lightGradient }}>
        <div className="text-center">
          <Zap className="w-16 h-16 text-slate-100 animate-pulse mx-auto mb-4" />
          <p className="text-slate-100 text-xl font-semibold">Loading Lightning...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      nightMode={ctx.nightMode}
      showDetails={process.env.NODE_ENV === 'development'}
      message="Something went wrong in the Lightning app. Please refresh to try again."
      onError={(error, errorInfo) => { console.error('App Error:', error, errorInfo); }}
    >
      <PremiumProvider userId={ctx.userProfile?.supabaseId}>
        <GuestModalProvider nightMode={ctx.nightMode}>
          <div className="min-h-screen pb-12 relative">
            <ReferralRedirect />
            <Toaster />

            <AppLayout>
              {renderContent()}
            </AppLayout>

            {/* Settings Menu */}
            {ctx.showMenu && <SettingsMenu />}

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

            {/* ============================================ */}
            {/* MODAL DIALOGS                               */}
            {/* ============================================ */}

            {ctx.showProfileWizard && (
              <ProfileCreationWizard
                nightMode={ctx.nightMode}
                onComplete={ctx.handleProfileComplete}
                onSkip={ctx.handleSkipProfileWizard}
              />
            )}

            {ctx.showProfileEdit && (
              <ProfileEditDialog
                profile={ctx.profile}
                nightMode={ctx.nightMode}
                onSave={ctx.handleProfileEdit}
                onClose={() => ctx.setShowProfileEdit(false)}
              />
            )}

            {ctx.showChangePicture && (
              <ChangePictureModal
                isOpen={ctx.showChangePicture}
                onClose={() => ctx.setShowChangePicture(false)}
                nightMode={ctx.nightMode}
                currentAvatar={ctx.profile.avatar || '\u{1F464}'}
                currentAvatarUrl={ctx.profile.avatarImage || null}
                onSave={async (avatarUrl, avatar) => {
                  if (!ctx.userProfile || !ctx.userProfile.supabaseId) {
                    throw new Error('No user profile found');
                  }
                  const toastId = showLoading('Updating profile picture...');
                  try {
                    const updated = await updateUserProfile(ctx.userProfile.supabaseId, {
                      avatar: avatar,
                      avatarUrl: avatarUrl
                    });
                    if (updated) {
                      ctx.setLocalProfile((prev: any) => {
                        if (!prev) return prev;
                        return { ...prev, avatar: avatar, avatarImage: avatarUrl };
                      });
                      if (avatar !== ctx.userProfile.avatar) {
                        const changes = trackAvatarChange();
                        if (changes === 5) unlockSecret('avatar_changed_5x');
                      }
                      updateToSuccess(toastId, 'Profile picture updated!');
                      window.dispatchEvent(new CustomEvent('profileUpdated'));
                    } else {
                      throw new Error('Failed to update profile picture');
                    }
                  } catch (error) {
                    console.error('Error updating profile picture:', error);
                    updateToError(toastId, error instanceof Error ? error.message : 'Failed to update profile picture');
                    throw error;
                  }
                }}
              />
            )}

            {ctx.showTestimonyEdit && ctx.testimonyData && (
              <EditTestimonyDialog
                testimony={ctx.testimonyData}
                nightMode={ctx.nightMode}
                userName={ctx.profile?.displayName}
                userId={ctx.userProfile?.supabaseId}
                onSave={ctx.handleTestimonySave}
                onClose={() => ctx.setShowTestimonyEdit(false)}
              />
            )}

            {ctx.showAdminDashboard && (
              <div className="fixed inset-0 z-50" style={{ background: ctx.nightMode ? '#0a0a19' : '#f0f4ff' }}>
                <AdminDashboard nightMode={ctx.nightMode} onBack={() => ctx.setShowAdminDashboard(false)} />
              </div>
            )}

            <ConfirmDialog
              isOpen={ctx.showLogoutConfirm}
              onClose={() => ctx.setShowLogoutConfirm(false)}
              onConfirm={ctx.signOut}
              title="Sign Out"
              message="Are you sure you want to sign out? You'll need to sign in again to access your account."
              confirmText="Sign Out"
              cancelText="Cancel"
              variant="danger"
              nightMode={ctx.nightMode}
            />

            <SaveTestimonyModal
              isOpen={ctx.showSaveTestimonyModal}
              onClose={ctx.handleSaveTestimonyModalClose}
              onContinueAsGuest={ctx.handleContinueAsGuest}
              nightMode={ctx.nightMode}
              testimonyPreview={''}
            />

            <SecretsMuseum
              isOpen={ctx.showSecretsMuseum}
              onClose={() => ctx.setShowSecretsMuseum(false)}
              nightMode={ctx.nightMode}
            />

            {ctx.showBugReport && (
              <BugReportDialog
                onClose={() => ctx.setShowBugReport(false)}
                nightMode={ctx.nightMode}
                currentTab={ctx.currentTab}
                userProfile={ctx.userProfile}
              />
            )}

            <TermsOfService isOpen={ctx.showTerms} onClose={() => ctx.setShowTerms(false)} nightMode={ctx.nightMode} />
            <PrivacyPolicy isOpen={ctx.showPrivacy} onClose={() => ctx.setShowPrivacy(false)} nightMode={ctx.nightMode} />
            <HelpCenter isOpen={ctx.showHelp} onClose={() => ctx.setShowHelp(false)} nightMode={ctx.nightMode} onContactSupport={() => ctx.setShowContactSupport(true)} />
            <ContactSupport isOpen={ctx.showContactSupport} onClose={() => ctx.setShowContactSupport(false)} nightMode={ctx.nightMode} userProfile={ctx.userProfile} />
            <BlockedUsers isOpen={ctx.showBlockedUsers} onClose={() => ctx.setShowBlockedUsers(false)} nightMode={ctx.nightMode} userProfile={ctx.userProfile} />

            <ReportContent
              isOpen={ctx.showReportContent}
              onClose={() => { ctx.setShowReportContent(false); ctx.setReportData({ type: null, content: null }); }}
              nightMode={ctx.nightMode}
              userProfile={ctx.userProfile}
              reportType={ctx.reportData.type || 'user'}
              reportedContent={ctx.reportData.content || { id: '' }}
            />

            <LinkSpotify isOpen={ctx.showLinkSpotify} onClose={() => ctx.setShowLinkSpotify(false)} nightMode={ctx.nightMode} userProfile={ctx.userProfile} />

            {ctx.showTestimonyQuestionnaire && (
              <TestimonyQuestionnaire
                nightMode={ctx.nightMode}
                userName={ctx.profile.displayName}
                userAge={undefined}
                userId={ctx.userProfile?.supabaseId}
                hasChurch={!!ctx.profile?.churchId}
                onComplete={ctx.handleTestimonyQuestionnaireComplete}
                onCancel={() => ctx.setShowTestimonyQuestionnaire(false)}
              />
            )}
          </div>
        </GuestModalProvider>
      </PremiumProvider>
    </ErrorBoundary>
  );
}

// ============================================
// APP ROOT — wraps everything in AppProvider
// ============================================

function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}

export default App;
