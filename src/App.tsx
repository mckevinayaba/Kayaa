import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import FeedPage from './pages/FeedPage';
import VenuePage from './pages/VenuePage';
import CheckInPage from './pages/CheckInPage';
import DashboardPage from './pages/DashboardPage';
import OnboardingPage from './pages/OnboardingPage';
import LoginPage from './pages/LoginPage';
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
import SkillsPage  from './pages/SkillsPage';
import SkillDetail  from './pages/SkillDetail';
import PostSkill    from './pages/PostSkill';
import CreatePost   from './pages/CreatePost';
import ProfilePage      from './pages/ProfilePage';
import EditProfile      from './pages/EditProfile';
import PrivacySettings       from './pages/PrivacySettings';
import NotificationSettings  from './pages/NotificationSettings';
import Help                  from './pages/Help';

// Root: authenticated → /feed, anonymous → landing page
function RootRoute() {
  const { user, loading } = useAuth();
  if (loading) return null; // wait for session check
  if (user) return <Navigate to="/feed" replace />;
  return <LandingPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Landing page — outside AppLayout, has its own nav */}
          <Route path="/" element={<RootRoute />} />

          <Route element={<AppLayout />}>
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/venue/:slug" element={<VenuePage />} />
            <Route path="/venue/:slug/checkin" element={<CheckInPage />} />
            <Route path="/checkin/:venueId" element={<QRCheckInPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/board" element={<BoardPage />} />
            <Route path="/board/mine" element={<BoardMinePage />} />
            <Route path="/board/new" element={<BoardNewPage />} />
            <Route path="/board/:id" element={<BoardPostPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/checkin" element={<CheckInBrowsePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/skills"      element={<SkillsPage />} />
            <Route path="/skills/new"  element={<PostSkill />} />
            <Route path="/skills/:id"  element={<SkillDetail />} />
            <Route path="/post/new"    element={<CreatePost />} />
            <Route path="/card/:name" element={<RegularCardPage />} />
            <Route path="/countries" element={<CountriesPage />} />
            <Route path="/profile"          element={<ProfilePage />} />
            <Route path="/profile/edit"    element={<EditProfile />} />
            <Route path="/settings/privacy"        element={<PrivacySettings />} />
            <Route path="/settings/notifications"  element={<NotificationSettings />} />
            <Route path="/help"                    element={<Help />} />
            <Route path="/search"          element={<Navigate to="/checkin" replace />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
