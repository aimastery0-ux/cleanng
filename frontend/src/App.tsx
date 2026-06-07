import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthGuard from "@/routes/AuthGuard";

// Auth pages
const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/features/auth/pages/RegisterPage"));
const VerifyPhonePage = lazy(() => import("@/features/auth/pages/VerifyPhonePage"));
const VerifyEmailPage = lazy(() => import("@/features/auth/pages/VerifyEmailPage"));
const ForgotPasswordPage = lazy(() => import("@/features/auth/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/features/auth/pages/ResetPasswordPage"));

// Public pages
const HomePage = lazy(() => import("@/features/customer/pages/HomePage"));
const SearchPage = lazy(() => import("@/features/customer/pages/SearchPage"));
const CleanerPublicPage = lazy(() => import("@/features/customer/pages/CleanerPublicPage"));

// Customer pages
const CustomerOnboarding = lazy(() => import("@/features/customer/pages/OnboardingPage"));
const CustomerDashboard = lazy(() => import("@/features/customer/pages/DashboardPage"));
const CustomerBookings = lazy(() => import("@/features/customer/pages/BookingsPage"));

// Cleaner pages
const CleanerOnboarding = lazy(() => import("@/features/cleaner/pages/OnboardingPage"));
const CleanerDashboard = lazy(() => import("@/features/cleaner/pages/DashboardPage"));
const CleanerProfile = lazy(() => import("@/features/cleaner/pages/ProfilePage"));
const CleanerBookings = lazy(() => import("@/features/cleaner/pages/BookingsPage"));
const CleanerServices = lazy(() => import("@/features/cleaner/pages/ServicesPage"));
const CleanerAvailability = lazy(() => import("@/features/cleaner/pages/AvailabilityPage"));

// Admin pages
const AdminDashboard = lazy(() => import("@/features/admin/pages/DashboardPage"));

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 border-2 border-orange border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Layout><HomePage /></Layout>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/search" element={<Layout><SearchPage /></Layout>} />
          <Route path="/cleaners/:id" element={<Layout><CleanerPublicPage /></Layout>} />

          {/* Phone verification (authenticated, any role) */}
          <Route
            path="/verify-phone"
            element={<AuthGuard><VerifyPhonePage /></AuthGuard>}
          />

          {/* Customer onboarding + protected pages */}
          <Route
            path="/customer/onboarding"
            element={<AuthGuard allowedRoles={["CUSTOMER"]}><CustomerOnboarding /></AuthGuard>}
          />
          <Route
            path="/customer"
            element={<AuthGuard allowedRoles={["CUSTOMER"]}><Layout><CustomerDashboard /></Layout></AuthGuard>}
          />
          <Route
            path="/customer/bookings"
            element={<AuthGuard allowedRoles={["CUSTOMER"]}><Layout><CustomerBookings /></Layout></AuthGuard>}
          />

          {/* Cleaner onboarding + protected pages */}
          <Route
            path="/cleaner/onboarding"
            element={<AuthGuard allowedRoles={["CLEANER"]}><CleanerOnboarding /></AuthGuard>}
          />
          <Route
            path="/cleaner/dashboard"
            element={<AuthGuard allowedRoles={["CLEANER"]}><Layout><CleanerDashboard /></Layout></AuthGuard>}
          />
          <Route
            path="/cleaner/profile"
            element={<AuthGuard allowedRoles={["CLEANER"]}><Layout><CleanerProfile /></Layout></AuthGuard>}
          />
          <Route
            path="/cleaner/bookings"
            element={<AuthGuard allowedRoles={["CLEANER"]}><Layout><CleanerBookings /></Layout></AuthGuard>}
          />
          <Route
            path="/cleaner/services"
            element={<AuthGuard allowedRoles={["CLEANER"]}><Layout><CleanerServices /></Layout></AuthGuard>}
          />
          <Route
            path="/cleaner/availability"
            element={<AuthGuard allowedRoles={["CLEANER"]}><Layout><CleanerAvailability /></Layout></AuthGuard>}
          />

          {/* Admin */}
          <Route
            path="/admin/*"
            element={<AuthGuard allowedRoles={["ADMIN"]}><Layout><AdminDashboard /></Layout></AuthGuard>}
          />

          {/* Fallbacks */}
          <Route
            path="/unauthorized"
            element={<Layout><div className="p-8 text-center"><h1 className="text-h1">Access denied</h1></div></Layout>}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
