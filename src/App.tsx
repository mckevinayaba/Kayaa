import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { LocationProvider } from './contexts/LocationContext';
import AppLayout from './layouts/AppLayout';
import AuthLayout from './layouts/AuthLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import FeedPage from './pages/FeedPage';
import VenuePage from './pages/VenuePage';
import CheckInPage from './pages/CheckInPage';
import DashboardPage from './pages/DashboardPage';
import OnboardingPage from './pages/OnboardingPage';
import WelcomePage from './pages/WelcomePage';
import SetupPage from './pages/SetupPage';
import BoardPage from './pages/BoardPage';
import BoardPostPage from './pages/BoardPostPage';
import BoardNewPage from './pages/BoardNewPage';
import BoardMinePage from './pages/BoardMinePage';
import JobsPage from './pages/JobsPage';
import RegularCardPage from './pages/RegularCardPage';
import QRCheckInPage from './pages/QRCheckInPage';
import CountriesPage from './pages/CountriesPage';
import CheckInBrowsePage from './pages/CheckInBrowsePage';
import ExplorePage from './pages/ExplorePage';
import SkillsPage   from './pages/SkillsPage';
import SkillsBrowse  from './pages/SkillsBrowse';
import SkillDetail   from './pages/SkillDetail';
import PostSkill     from './pages/PostSkill';
import CreatePost   from './pages/CreatePost';
import ProfilePage      from './pages/ProfilePage';
import EditProfile      from './pages/EditProfile';
import PrivacySettings       from './pages/PrivacySettings';
import NotificationSettings  from './pages/NotificationSettings';
import Help                  from './pages/Help';
import EmergencyContacts     from './pages/EmergencyContacts';
import VenueDashboard        from './pages/VenueDashboard';
import VenueHours            from './pages/VenueHours';
import VenueQRCode           from './pages/VenueQRCode';
import VenueAnalytics        from './pages/VenueAnalytics';
import VenueUpdates          from './pages/VenueUpdates';
import VenuePhotos           from './pages/VenuePhotos';
import VenueEvents           from './pages/VenueEvents';

// ── Root: authenticated → check setup → feed, anonymous → landing ─────────────
function RootRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    const setupDone = localStorage.getItem('kayaa_setup_done');
    if (setupDone) return <Navigate to="/feed" replace />;
    // Returning users who have existing location data are already "set up"
    const hasLocation = !!(
      localStorage.getItem('kayaa_suburb') ||
      localStorage.getItem('kayaa_city') ||
      localStorage.getItem('kayaa_location_current')
    );
    if (hasLocation) {
      localStorage.setItem('kayaa_setup_done', 'true');
      return <Navigate to="/feed" replace />;
    }
    return <Navigate to="/setup" replace />;
  }
  return <LandingPage />;
}

// ── Post-auth guard: new users who land on /feed get redirected to /setup ─────
// Handles the case where Google OAuth or magic link drops a new user straight on /feed.
function FeedGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const setupDone = localStorage.getItem('kayaa_setup_done');
    if (setupDone) return;
    const hasLocation = !!(
      localStorage.getItem('kayaa_suburb') ||
      localStorage.getItem('kayaa_city') ||
      localStorage.getItem('kayaa_location_current')
    );
    if (hasLocation) {
      localStorage.setItem('kayaa_setup_done', 'true');
      return;
    }
    navigate('/setup', { replace: true });
  }, [user, navigate]);

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <LocationProvider>
      <BrowserRouter>
        <Routes>
          {/* Landing page — outside AppLayout, has its own nav */}
          <Route path="/" element={<RootRoute />} />

          {/* ── Auth routes — bare AuthLayout, NO top/bottom nav ── */}
          <Route element={<AuthLayout />}>
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/setup"   element={<SetupPage />} />
            {/* Legacy /login URL → welcome page */}
            <Route path="/login"   element={<Navigate to="/welcome" replace />} />
          </Route>

          {/* ── App routes — AppLayout with top/bottom nav ── */}
          <Route element={<AppLayout />}>
            <Route path="/feed" element={
              <FeedGuard><FeedPage /></FeedGuard>
            } />
            <Route path="/venue/:slug" element={<VenuePage />} />
            <Route path="/venue/:slug/checkin" element={<CheckInPage />} />
            <Route path="/checkin/:venueId" element={<QRCheckInPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/board" element={<BoardPage />} />
            <Route path="/board/mine" element={<BoardMinePage />} />
            <Route path="/board/new" element={<BoardNewPage />} />
            <Route path="/board/:id" element={<BoardPostPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/checkin" element={<CheckInBrowsePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/skills"           element={<SkillsPage />} />
            <Route path="/skills/browse"    element={<SkillsBrowse />} />
            <Route path="/skills/new"       element={<PostSkill />} />
            <Route path="/skills/edit/:id"  element={<PostSkill />} />
            <Route path="/skills/:id"       element={<SkillDetail />} />
            <Route path="/post/new"    element={<CreatePost />} />
            <Route path="/card/:name" element={<RegularCardPage />} />
            <Route path="/countries" element={<CountriesPage />} />
            <Route path="/profile"          element={<ProfilePage />} />
            <Route path="/profile/edit"    element={<EditProfile />} />
            <Route path="/settings/privacy"        element={<PrivacySettings />} />
            <Route path="/settings/notifications"  element={<NotificationSettings />} />
            <Route path="/settings/emergency-contacts" element={<EmergencyContacts />} />
            <Route path="/help"                    element={<Help />} />
            <Route path="/search" element={<Navigate to="/checkin" replace />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/venue/dashboard"
              element={
                <ProtectedRoute>
                  <VenueDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/venue/hours"
              element={
                <ProtectedRoute>
                  <VenueHours />
                </ProtectedRoute>
              }
            />
            <Route
              path="/venue/qr-code"
              element={
                <ProtectedRoute>
                  <VenueQRCode />
                </ProtectedRoute>
              }
            />
            <Route
              path="/venue/analytics"
              element={
                <ProtectedRoute>
                  <VenueAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/venue/updates"
              element={
                <ProtectedRoute>
                  <VenueUpdates />
                </ProtectedRoute>
              }
            />
            <Route
              path="/venue/photos"
              element={
                <ProtectedRoute>
                  <VenuePhotos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/venue/events"
              element={
                <ProtectedRoute>
                  <VenueEvents />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
      </LocationProvider>
    </AuthProvider>
  );
}
