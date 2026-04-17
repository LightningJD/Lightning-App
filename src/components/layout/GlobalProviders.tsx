/*
 * GlobalProviders — Layer 1 of the layout architecture
 *
 * Wraps ALL routes with shared providers and global UI (modals, toasts).
 * Both AppLayout routes and FullScreenLayout routes are children of this.
 *
 * Provider stack (outer → inner):
 *   1. AppProvider — all app state (auth, profile, theme, navigation, handlers)
 *   2. ErrorBoundary — crash recovery
 *   3. PremiumProvider — server/user subscription state
 *   4. GuestModalProvider — guest signup modal
 *
 * Also renders:
 *   - <Toaster /> (react-hot-toast)
 *   - Settings menu overlay
 *   - Notifications panel overlay
 *   - All modal dialogs (profile wizard, testimony, admin, etc.)
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from '../ErrorBoundary';
import ProfileCreationWizard from '../ProfileCreationWizard';
import ProfileEditDialog from '../ProfileEditDialog';
import ChangePictureModal from '../ChangePictureModal';
import EditTestimonyDialog from '../EditTestimonyDialog';
import ConfirmDialog from '../ConfirmDialog';
import SaveTestimonyModal from '../SaveTestimonyModal';
import SecretsMuseum from '../SecretsMuseum';
import BugReportDialog from '../BugReportDialog';
import TermsOfService from '../TermsOfService';
import PrivacyPolicy from '../PrivacyPolicy';
import HelpCenter from '../HelpCenter';
import ContactSupport from '../ContactSupport';
import BlockedUsers from '../BlockedUsers';
import ReportContent from '../ReportContent';
import LinkSpotify from '../LinkSpotify';
import TestimonyQuestionnaire from '../TestimonyQuestionnaire';
import AdminDashboard from '../AdminDashboard';
import SettingsMenu from '../SettingsMenu';
import NotificationsPanel from '../NotificationsPanel';
import { GuestModalProvider } from '../../contexts/GuestModalContext';
import { PremiumProvider } from '../../contexts/PremiumContext';
import { AppProvider, useAppContext } from '../../contexts/AppContext';
import { showLoading, updateToSuccess, updateToError } from '../../lib/toast';
import { updateUserProfile } from '../../lib/database';
import { trackAvatarChange } from '../../lib/activityTracker';
import { unlockSecret } from '../../lib/secrets';

// ============================================
// OUTER WRAPPER — provides AppContext
// ============================================

const GlobalProviders: React.FC = () => {
  return (
    <AppProvider>
      <GlobalProvidersInner />
    </AppProvider>
  );
};

// ============================================
// INNER — reads AppContext, wraps remaining providers + modals
// ============================================

function GlobalProvidersInner() {
  const ctx = useAppContext();

  // Show loading screen only if user profile hasn't loaded yet
  // (not just initial auth check)
  if (ctx.isLoading && !ctx.userProfile) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: ctx.nightMode
            ? ctx.themes[ctx.selectedTheme].darkGradient
            : ctx.themes[ctx.selectedTheme].lightGradient,
        }}
      >
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
      onError={(error, errorInfo) => {
        console.error('App Error:', error, errorInfo);
      }}
    >
      <PremiumProvider userId={ctx.userProfile?.supabaseId}>
        <GuestModalProvider nightMode={ctx.nightMode}>
          <Toaster />

          {/* Route content (AppLayout or FullScreenLayout) */}
          <Outlet />

          {/* ============================================ */}
          {/* GLOBAL OVERLAYS                             */}
          {/* ============================================ */}

          {/* Settings Menu */}
          {ctx.showMenu && <SettingsMenu />}

          {/* Notifications Panel */}
          {ctx.showNotifications && (
            <NotificationsPanel
              nightMode={ctx.nightMode}
              onClose={() => ctx.setShowNotifications(false)}
            />
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
                    avatarUrl: avatarUrl,
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
                  updateToError(
                    toastId,
                    error instanceof Error ? error.message : 'Failed to update profile picture',
                  );
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
            <div
              className="fixed inset-0 z-50"
              style={{ background: ctx.nightMode ? '#0a0a19' : '#f0f4ff' }}
            >
              <AdminDashboard
                nightMode={ctx.nightMode}
                onBack={() => ctx.setShowAdminDashboard(false)}
              />
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

          <TermsOfService
            isOpen={ctx.showTerms}
            onClose={() => ctx.setShowTerms(false)}
            nightMode={ctx.nightMode}
          />
          <PrivacyPolicy
            isOpen={ctx.showPrivacy}
            onClose={() => ctx.setShowPrivacy(false)}
            nightMode={ctx.nightMode}
          />
          <HelpCenter
            isOpen={ctx.showHelp}
            onClose={() => ctx.setShowHelp(false)}
            nightMode={ctx.nightMode}
            onContactSupport={() => ctx.setShowContactSupport(true)}
          />
          <ContactSupport
            isOpen={ctx.showContactSupport}
            onClose={() => ctx.setShowContactSupport(false)}
            nightMode={ctx.nightMode}
            userProfile={ctx.userProfile}
          />
          <BlockedUsers
            isOpen={ctx.showBlockedUsers}
            onClose={() => ctx.setShowBlockedUsers(false)}
            nightMode={ctx.nightMode}
            userProfile={ctx.userProfile}
          />

          <ReportContent
            isOpen={ctx.showReportContent}
            onClose={() => {
              ctx.setShowReportContent(false);
              ctx.setReportData({ type: null, content: null });
            }}
            nightMode={ctx.nightMode}
            userProfile={ctx.userProfile}
            reportType={ctx.reportData.type || 'user'}
            reportedContent={ctx.reportData.content || { id: '' }}
          />

          <LinkSpotify
            isOpen={ctx.showLinkSpotify}
            onClose={() => ctx.setShowLinkSpotify(false)}
            nightMode={ctx.nightMode}
            userProfile={ctx.userProfile}
          />

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
        </GuestModalProvider>
      </PremiumProvider>
    </ErrorBoundary>
  );
}

export default GlobalProviders;
