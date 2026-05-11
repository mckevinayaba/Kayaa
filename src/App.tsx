import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { NeighbourhoodProvider } from './contexts/NeighbourhoodContext';
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
import SkillDetail   from './pages/SkillDetail';
import PostSkill     from './pages/PostSkill';
import CreatePost   from './pages/CreatePost';
import ProfilePage      from './pages/ProfilePage';
import EditProfile      from './pages/EditProfile';
import PrivacySettings       from './pages/PrivacySettings';
import Help                  from './pages/Help';
import EmergencyContacts     from './pages/EmergencyContacts';
import VenueDashboard        from './pages/VenueDashboard';
import VenueHours            from './pages/VenueHours';
import VenueQRCode           from './pages/VenueQRCode';
import VenueAnalytics        from './pages/VenueAnalytics';
import VenueUpdates          from './pages/VenueUpdates';
import VenuePhotos           from './pages/VenuePhotos';
import VenueEvents           from './pages/VenueEvents';
import AlertsPage            from './pages/AlertsPage';

// ── Root redirect ────────────────────────────────────────────────────────────
// Signed-in → /feed.  Unauthenticated → landing page.
// Rendered synchronously — no useEffect, no flash.
function RootRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/feed" replace /> : <Navigate to="/about" replace />;
}

// ── Convenience wrapper ───────────────────────────────────────────────────────
// Keeps route definitions below clean for routes that need auth.
function Auth({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <NeighbourhoodProvider>
    <AuthProvider>
      <LocationProvider>
      <BrowserRouter>
        <Routes>
          {/* Root redirect */}
          <Route path="/" element={<RootRoute />} />

          {/* ── Public standalone — own layout, no AppLayout chrome ── */}
          <Route path="/about"    element={<LandingPage />} />
          <Route path="/waitlist" element={<Navigate to="/welcome" replace />} />

          {/* ── Auth screens — bare AuthLayout ── */}
          <Route element={<AuthLayout />}>
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/setup"   element={<SetupPage />} />
            <Route path="/login"   element={<Navigate to="/welcome" replace />} />
          </Route>

          {/* ── App shell — AppLayout with top/bottom nav ── */}
          <Route element={<AppLayout />}>

            {/* ── Protected: require sign-in before the page renders ── */}
            <Route path="/feed"    element={<Auth><FeedPage /></Auth>} />
            <Route path="/onboarding" element={<Auth><OnboardingPage /></Auth>} />

            {/* Board — read (/:id) stays public; write actions require auth */}
            <Route path="/board"      element={<Auth><BoardPage /></Auth>} />
            <Route path="/board/mine" element={<Auth><BoardMinePage /></Auth>} />
            <Route path="/board/new"  element={<Auth><BoardNewPage /></Auth>} />
            <Route path="/board/:id"  element={<BoardPostPage />} />

            {/* Profile + settings */}
            <Route path="/profile"      element={<Auth><ProfilePage /></Auth>} />
            <Route path="/profile/edit" element={<Auth><EditProfile /></Auth>} />
            <Route path="/settings/privacy"            element={<Auth><PrivacySettings /></Auth>} />
            <Route path="/settings/notifications"      element={<Navigate to="/profile" replace />} />
            <Route path="/settings/emergency-contacts" element={<Auth><EmergencyContacts /></Auth>} />

            {/* Skills — /skills and /skills/browse redirect to /board; detail + create still work */}
            <Route path="/skills"          element={<Navigate to="/board" replace />} />
            <Route path="/skills/browse"   element={<Navigate to="/board" replace />} />
            <Route path="/skills/new"      element={<Auth><PostSkill /></Auth>} />
            <Route path="/skills/edit/:id" element={<Auth><PostSkill /></Auth>} />
            <Route path="/skills/:id"      element={<SkillDetail />} />

            {/* Posts */}
            <Route path="/post/new" element={<Auth><CreatePost /></Auth>} />

            {/* Owner dashboard suite */}
            <Route path="/dashboard"        element={<Auth><DashboardPage /></Auth>} />
            <Route path="/venue/dashboard"  element={<Auth><VenueDashboard /></Auth>} />
            <Route path="/venue/hours"      element={<Auth><VenueHours /></Auth>} />
            <Route path="/venue/qr-code"    element={<Auth><VenueQRCode /></Auth>} />
            <Route path="/venue/analytics"  element={<Auth><VenueAnalytics /></Auth>} />
            <Route path="/venue/updates"    element={<Auth><VenueUpdates /></Auth>} />
            <Route path="/venue/photos"     element={<Auth><VenuePhotos /></Auth>} />
            <Route path="/venue/events"     element={<Auth><VenueEvents /></Auth>} />

            {/* ── Public app pages — no sign-in required ── */}
            <Route path="/venue/:slug"          element={<VenuePage />} />
            <Route path="/venue/:slug/checkin"  element={<CheckInPage />} />
            <Route path="/checkin/:venueId"     element={<QRCheckInPage />} />
            <Route path="/explore"              element={<ExplorePage />} />
            <Route path="/checkin"              element={<CheckInBrowsePage />} />
            <Route path="/jobs"                 element={<JobsPage />} />
            <Route path="/card/:name"           element={<RegularCardPage />} />
            <Route path="/countries"            element={<CountriesPage />} />
            <Route path="/help"                 element={<Help />} />
            <Route path="/alerts"              element={<Auth><AlertsPage /></Auth>} />
            <Route path="/search" element={<Navigate to="/checkin" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </LocationProvider>
    </AuthProvider>
    </NeighbourhoodProvider>
  );
}
