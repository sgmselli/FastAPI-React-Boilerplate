import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { PublicLayout } from "./layouts/PublicLayout";
import { AppLayout } from "./layouts/AppLayout";
import { ScrollToTop } from "./components/ScrollToTop";
import Landing from "./pages/Landing/Landing";
import { NotFound } from "./pages/NotFound/NotFound";
import { PrivacyPolicy } from "./pages/PrivacyPolicy/PrivacyPolicy";
import { TermsAndConditions } from "./pages/TermsAndConditions/TermsAndConditions";
import { Login } from "./pages/Auth/Login";
import { Register } from "./pages/Auth/Register";
import { AuthProvider } from "./contexts/auth";
import { ToastProvider } from "./contexts/toast";

import AuthorizedRoute from "./components/ProtectedRoutes/AuthorizedRoute";
import UnauthorisedRoute from "./components/ProtectedRoutes/UnauthorizedRoute";
import { Logout } from "./pages/Auth/Logout";
import { AuthCallback } from "./pages/Auth/AuthCallback";
import { ForgotPassword } from "./pages/ForgotPassword/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword/ResetPassword";
import { Settings } from "./pages/Settings/Settings";
import { CompleteProfile } from "./pages/CompleteProfile/CompleteProfile";
import { VerifyEmail } from "./pages/VerifyEmail/VerifyEmail";
import { AboutUs } from "./pages/AboutUs/AboutUs";
import { Faq } from "./pages/Faq/Faq";
import { GettingStarted } from "./pages/GettingStarted/GettingStarted";

function App() {

  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <ScrollToTop />
          <Routes>
              <Route element={<PublicLayout fullWidth />}>
                <Route path="/" element={<Landing />} />
              </Route>

              <Route element={<PublicLayout />}>
                <Route path="/about-us" element={<AboutUs />} />
                <Route path="/faq" element={<Faq />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/*" element={<NotFound />} />

                {/* Outside the unauthenticated routes - a signed in user following
                    a reset link from their email must not be bounced away from it */}
                <Route path="/password-reset" element={<ResetPassword />} />
              </Route>

              {/* Must be authenticated routes */}
              <Route element={<AuthorizedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/getting-started" element={<GettingStarted />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>

                <Route element={<PublicLayout />}>
                  <Route path="/complete-profile" element={<CompleteProfile />} />
                </Route>

                <Route path="/logout" element={<Logout />} />
              </Route>

              {/* Must be unauthenticated routes */}
              <Route element={<UnauthorisedRoute />}>
                <Route element={<PublicLayout />}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                </Route>
              </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
