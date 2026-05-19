import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { NeighbourhoodProvider } from './contexts/NeighbourhoodContext';
import { LocationProvider } from './contexts/LocationContext';
import AppLayout from './layouts/AppLayout';
import AuthLayout from './layouts/AuthLayout';
import ProtectedRoute from './components/ProtectedRoute';
import ChunkErrorBoundary from './components/ChunkErrorBoundary';

// ── Lazy page imports — each route gets its own chunk ────────────────────────
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const LandingPage          = lazy(() => import('./pages/LandingPage'));
const FeedPage             = lazy(() => import('./pages/FeedPage'));
const VenuePage            = lazy(() => import('./pages/VenuePage'));
const CheckInPage          = lazy(() => import('./pages/CheckInPage'));
const DashboardPage        = lazy(() => import('./pages/DashboardPage'));
const OnboardingPage       = lazy(() => import('./pages/OnboardingPage'));
const WelcomePage          = lazy(() => import('./pages/WelcomePage'));
// SetupPage removed — "What brings you here?" chooser deleted. /setup → /feed.
const BoardPage            = lazy(() => import('./pages/BoardPage'));
const BoardPostPage        = lazy(() => import('./pages/BoardPostPage'));
const BoardNewPage         = lazy(() => import('./pages/BoardNewPage'));
const BoardMinePage        = lazy(() => import('./pages/BoardMinePage'));
const JobsPage             = lazy(() => import('./pages/JobsPage'));
const RegularCardPage      = lazy(() => import('./pages/RegularCardPage'));
const QRCheckInPage        = lazy(() => import('./pages/QRCheckInPage'));
const CountriesPage        = lazy(() => import('./pages/CountriesPage'));
const CheckInBrowsePage    = lazy(() => import('./pages/CheckInBrowsePage'));
const ExplorePage          = lazy(() => import('./pages/ExplorePage'));
const CreatePost           = lazy(() => import('./pages/CreatePost'));
const ProfilePage          = lazy(() => import('./pages/ProfilePage'));
const EditProfile          = lazy(() => import('./pages/EditProfile'));
const PrivacySettings      = lazy(() => import('./pages/PrivacySettings'));
const Help                 = lazy(() => import('./pages/Help'));
const EmergencyContacts    = lazy(() => import('./pages/EmergencyContacts'));
const VenueDashboard       = lazy(() => import('./pages/VenueDashboard'));
const VenueHours           = lazy(() => import('./pages/VenueHours'));
const VenueQRCode          = lazy(() => import('./pages/VenueQRCode'));
const VenueAnalytics       = lazy(() => import('./pages/VenueAnalytics'));
const VenueUpdates         = lazy(() => import('./pages/VenueUpdates'));
const VenuePhotos          = lazy(() => import('./pages/VenuePhotos'));
const VenueEvents          = lazy(() => import('./pages/VenueEvents'));
const VenueEditDetails     = lazy(() => import('./pages/VenueEditDetails'));
const AlertsPage           = lazy(() => import('./pages/AlertsPage'));
const CreatePage           = lazy(() => import('./pages/CreatePage'));
const VenueBoostPage       = lazy(() => import('./pages/VenueBoostPage'));
const NeighbourhoodPage    = lazy(() => import('./pages/NeighbourhoodPage'));
const OwnerDashboard       = lazy(() => import('./pages/OwnerDashboard'));
const HousingPage          = lazy(() => import('./pages/HousingPage'));
const SafetyReportPage     = lazy(() => import('./pages/SafetyReportPage'));
const MomentCreatePage     = lazy(() => import('./pages/MomentCreatePage'));
const UtilityReportPage    = lazy(() => import('./pages/UtilityReportPage'));
const ClaimBusinessPage    = lazy(() => import('./pages/ClaimBusinessPage'));

// ── Page loader — shown while a lazy chunk is fetching ───────────────────────
function PageLoader() {
  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0D1117',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        border: '2.5px solid rgba(255,255,255,0.08)',
        borderTopColor: '#39D98A',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

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

// Redirects /skills/:id → /board/:id so old share links still resolve
function SkillToBoard() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/board/${id ?? ''}`} replace />;
}

export default function App() {
  return (
    <NeighbourhoodProvider>
    <AuthProvider>
      <LocationProvider>
      <BrowserRouter>
        <ChunkErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Root redirect */}
            <Route path="/" element={<RootRoute />} />

            {/* ── Public standalone — own layout, no AppLayout chrome ── */}
            <Route path="/about"    element={<LandingPage />} />
            <Route path="/waitlist" element={<Navigate to="/welcome" replace />} />

            {/* ── Auth screens — bare AuthLayout ── */}
            <Route element={<AuthLayout />}>
              <Route path="/welcome" element={<WelcomePage />} />
              {/* /setup was the "What brings you here?" chooser — removed, now goes straight to feed */}
              <Route path="/setup"   element={<Navigate to="/feed" replace />} />
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

              {/* Skills — all routes redirect into Board; /skills/:id preserves the ID */}
              <Route path="/skills"          element={<Navigate to="/board" replace />} />
              <Route path="/skills/browse"   element={<Navigate to="/board" replace />} />
              <Route path="/skills/new"      element={<Navigate to="/board/new?cat=services" replace />} />
              <Route path="/skills/edit/:id" element={<Navigate to="/board" replace />} />
              <Route path="/skills/:id"      element={<SkillToBoard />} />

              {/* Posts */}
              <Route path="/post/new" element={<Auth><CreatePost /></Auth>} />

              {/* Owner dashboard suite */}
              <Route path="/owner"            element={<Auth><OwnerDashboard /></Auth>} />
              <Route path="/dashboard"        element={<Auth><DashboardPage /></Auth>} />
              <Route path="/venue/dashboard"  element={<Auth><VenueDashboard /></Auth>} />
              <Route path="/venue/hours"      element={<Auth><VenueHours /></Auth>} />
              <Route path="/venue/edit"       element={<Auth><VenueEditDetails /></Auth>} />
              <Route path="/venue/qr-code"    element={<Auth><VenueQRCode /></Auth>} />
              <Route path="/venue/analytics"  element={<Auth><VenueAnalytics /></Auth>} />
              <Route path="/venue/updates"    element={<Auth><VenueUpdates /></Auth>} />
              <Route path="/venue/photos"     element={<Auth><VenuePhotos /></Auth>} />
              <Route path="/venue/events"     element={<Auth><VenueEvents /></Auth>} />
              <Route path="/venue/boost"      element={<Auth><VenueBoostPage /></Auth>} />

              {/* ── Public app pages — no sign-in required ── */}
              <Route path="/venue/:slug"          element={<VenuePage />} />
              <Route path="/venue/:slug/checkin"  element={<CheckInPage />} />
              <Route path="/checkin/:venueId"     element={<QRCheckInPage />} />
              <Route path="/explore"              element={<ExplorePage />} />
              <Route path="/neighbourhood"        element={<NeighbourhoodPage />} />
              <Route path="/checkin"              element={<CheckInBrowsePage />} />
              <Route path="/housing"              element={<HousingPage />} />
              <Route path="/jobs"                 element={<JobsPage />} />
              <Route path="/card/:name"           element={<RegularCardPage />} />
              <Route path="/countries"            element={<CountriesPage />} />
              <Route path="/help"                 element={<Help />} />
              <Route path="/alerts"              element={<Auth><AlertsPage /></Auth>} />
              <Route path="/report/safety"       element={<Auth><SafetyReportPage /></Auth>} />
              <Route path="/moments/new"         element={<Auth><MomentCreatePage /></Auth>} />
              <Route path="/report/utility/:type" element={<Auth><UtilityReportPage /></Auth>} />
              <Route path="/create"              element={<Auth><CreatePage /></Auth>} />
              <Route path="/claim-business"      element={<Auth><ClaimBusinessPage /></Auth>} />
              <Route path="/search" element={<Navigate to="/checkin" replace />} />
            </Route>

            {/* ── Catch-all: any unmatched URL → 404 ── */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        </ChunkErrorBoundary>
      </BrowserRouter>
      </LocationProvider>
    </AuthProvider>
    </NeighbourhoodProvider>
  );
}
