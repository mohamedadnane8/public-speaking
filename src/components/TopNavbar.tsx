import { motion } from "framer-motion";

export type NavSection = "GENERAL_PRACTICE" | "INTERVIEWS" | "HISTORY" | "FEATURE_REQUEST";

interface NavItem {
  section: NavSection;
  label: string;
  requiresAuth?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { section: "GENERAL_PRACTICE", label: "General Practice" },
  { section: "INTERVIEWS", label: "Interviews" },
  { section: "HISTORY", label: "History" },
  { section: "FEATURE_REQUEST", label: "Request Feature" },
];

interface TopNavbarProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  isLocalhost: boolean;
  user: { firstName: string; lastName: string } | null;
  isAccountMenuOpen: boolean;
  onToggleAccountMenu: () => void;
  onLogin: () => void;
  onDevLogin: () => void;
  onLogout: () => void;
  accountMenuRef: React.RefObject<HTMLDivElement | null>;
}

export function TopNavbar({
  activeSection,
  onNavigate,
  isAuthenticated,
  isAuthLoading,
  isLocalhost,
  user,
  isAccountMenuOpen,
  onToggleAccountMenu,
  onLogin,
  onDevLogin,
  onLogout,
  accountMenuRef,
}: TopNavbarProps) {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 sm:px-6 md:px-8 h-12 bg-[#FDF6F0]/95 backdrop-blur-sm border-b border-[#1a1a1a]/8"
    >
      {/* Nav links */}
      <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          if (item.requiresAuth && !isAuthenticated) return null;

          const isActive = activeSection === item.section;
          return (
            <button
              key={item.section}
              type="button"
              onClick={() => onNavigate(item.section)}
              className={`relative whitespace-nowrap text-[10px] sm:text-[11px] tracking-[0.15em] uppercase transition-colors py-3 ${
                isActive
                  ? "text-[#1a1a1a]"
                  : "text-[#1a1a1a]/45 hover:text-[#1a1a1a]/75"
              }`}
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              {item.label}
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#1a1a1a]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Right side: auth */}
      <div className="flex items-center gap-3">
        {!isAuthLoading && (
          <>
            {isAuthenticated && user ? (
              <div ref={accountMenuRef} className="relative">
                <button
                  type="button"
                  onClick={onToggleAccountMenu}
                  className="flex items-center gap-1.5 text-[11px] text-[#1a1a1a]/60 transition-colors hover:text-[#1a1a1a]"
                  style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                  aria-haspopup="menu"
                  aria-expanded={isAccountMenuOpen}
                >
                  <span className="hidden sm:inline">
                    {user.firstName} {user.lastName}
                  </span>
                  <span className="sm:hidden inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#1a1a1a]/25 text-[10px] uppercase text-[#1a1a1a]/60">
                    {user.firstName.slice(0, 1)}
                  </span>
                  <svg
                    className={`h-3 w-3 transition-transform ${isAccountMenuOpen ? "rotate-180" : ""}`}
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d="M2.5 4.5 6 8l3.5-3.5" />
                  </svg>
                </button>

                {isAccountMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 min-w-[12rem] border border-[#1a1a1a]/20 bg-[#FDF6F0] py-1 shadow-[0_8px_24px_rgba(26,26,26,0.08)]"
                    role="menu"
                    aria-label="Account menu"
                  >
                    <button
                      type="button"
                      onClick={onLogout}
                      className="w-full px-4 py-2 text-left text-[11px] tracking-[0.08em] uppercase text-[#7A2E2E]/80 hover:bg-[#7A2E2E]/8 hover:text-[#7A2E2E] transition-colors"
                      style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                      role="menuitem"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {isLocalhost && (
                  <button
                    onClick={onDevLogin}
                    className="text-[11px] tracking-[0.15em] text-[#2E7A4E]/70 hover:text-[#2E7A4E] transition-colors uppercase"
                    style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                  >
                    Dev Login
                  </button>
                )}
                <button
                  onClick={onLogin}
                  className="text-[11px] tracking-[0.15em] text-[#1a1a1a]/60 hover:text-[#1a1a1a] transition-colors uppercase"
                  style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                >
                  Login
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </motion.nav>
  );
}
