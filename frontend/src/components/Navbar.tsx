import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { authApi } from "@/api/auth";
import Button from "./Button";
import NotificationBell from "./NotificationBell";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const { user, logout, refreshToken } = useAuthStore((s) => ({
    user: s.user,
    logout: s.logout,
    refreshToken: s.refreshToken,
  }));
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } finally {
      logout();
      navigate("/login");
    }
  };

  const navLinks =
    user?.role === "CLEANER"
      ? [
          { to: "/cleaner/dashboard", label: "Dashboard" },
          { to: "/cleaner/bookings", label: "Bookings" },
          { to: "/cleaner/profile", label: "Profile" },
        ]
      : user?.role === "ADMIN"
      ? [
          { to: "/admin/cleaners", label: "Cleaners" },
          { to: "/admin/disputes", label: "Disputes" },
          { to: "/admin/analytics", label: "Analytics" },
        ]
      : [
          { to: "/search", label: "Find cleaners" },
          { to: "/customer/bookings", label: "My bookings" },
        ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-border">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-extrabold text-orange">Clean</span>
            <span className="text-xl font-extrabold text-black">NG</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn("text-sm font-medium transition-colors", isActive ? "text-orange" : "text-grey-dark hover:text-black")
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <NotificationBell />
                <span className="text-sm text-grey-mid">{user.first_name}</span>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate("/login")}>
                  Log in
                </Button>
                <Button size="sm" onClick={() => navigate("/register")}>
                  Get started
                </Button>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden text-grey-dark"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-border flex flex-col gap-4">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn("text-sm font-medium py-2", isActive ? "text-orange" : "text-grey-dark")
                }
              >
                {link.label}
              </NavLink>
            ))}
            {user ? (
              <Button variant="outline" fullWidth onClick={handleLogout}>
                Log out
              </Button>
            ) : (
              <>
                <Button variant="outline" fullWidth onClick={() => { navigate("/login"); setMobileOpen(false); }}>
                  Log in
                </Button>
                <Button fullWidth onClick={() => { navigate("/register"); setMobileOpen(false); }}>
                  Get started
                </Button>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
