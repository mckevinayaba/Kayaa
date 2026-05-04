// Legacy entry point — /login now redirects to /welcome via App.tsx routing.
// This file is kept as a safety net in case anything still imports it directly.
import { Navigate } from 'react-router-dom';
export default function LoginPage() {
  return <Navigate to="/welcome" replace />;
}
