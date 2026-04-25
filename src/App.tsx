import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/feed" replace />} />
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
            <Route path="/card/:name" element={<RegularCardPage />} />
            <Route path="/countries" element={<CountriesPage />} />
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
