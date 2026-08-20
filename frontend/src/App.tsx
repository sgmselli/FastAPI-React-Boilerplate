import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { Page } from "./components/Page";
import Landing from "./pages/Landing/Landing";
import Account from "./pages/Account/Account";
import { NotFound } from "./pages/NotFound/NotFound";
import { PrivacyPolicy } from "./pages/PrivacyPolicy/PrivacyPolicy";
import { TermsAndConditions } from "./pages/TermsAndConditions/TermsAndConditions";
import { Login } from "./pages/Auth/Login";
import { Register } from "./pages/Auth/Register";
import { AuthProvider } from "./contexts/auth";

import AuthorizedRoute from "./components/ProtectedRoutes/AuthorizedRoute";
import UnauthorisedRoute from "./components/ProtectedRoutes/UnauthorizedRoute";
import { Logout } from "./pages/Auth/Logout";
import { AuthCallback } from "./pages/Auth/AuthCallback";

function App() {

  return (
    <Router>
      <AuthProvider>
        <Routes>
            <Route path="/" element={<Page children={<Landing />} />} />
            <Route path="/privacy-policy" element={<Page children={<PrivacyPolicy />} />} />
            <Route path="/terms-and-conditions" element={<Page children={<TermsAndConditions />} />} />
            <Route path="/*" element={<Page children={<NotFound />} />} />
            <Route path="/auth/callback" element={<Page children={<AuthCallback />} />} />

            {/* Must be authenticated routes */}
            <Route element={<AuthorizedRoute />}>
              <Route path="/account" element={<Page children={<Account />} />} />
              <Route path="/logout" element={<Page children={<Logout />} />} />
            </Route>

            {/* Must be unauthenticated routes */}
            <Route element={<UnauthorisedRoute />}>
              <Route path="/login" element={<Page children={<Login />} />} />
              <Route path="/register" element={<Page children={<Register />} />} />
            </Route>
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
