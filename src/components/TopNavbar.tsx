import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";

export type NavSection = "GENERAL_PRACTICE" | "INTERVIEWS" | "HISTORY" | "FEATURE_REQUEST";

interface NavItem {
  section: NavSection;
  label: string;
  shortLabel: string;
  requiresAuth?: boolean;
  /** If true, item is only shown in the overflow menu on mobile */
  secondary?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { section: "GENERAL_PRACTICE", label: "nav.generalPractice", shortLabel: "nav.generalPractice" },
  { section: "INTERVIEWS", label: "nav.interviewPractice", shortLabel: "nav.interviewPractice" },
  { section: "HISTORY", label: "nav.history", shortLabel: "nav.history", secondary: true },
  { section: "FEATURE_REQUEST", label: "nav.requestFeature", shortLabel: "nav.requestFeature", secondary: true },
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
  const { t } = useTranslation();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const primaryItems = NAV_ITEMS.filter((item) => !item.secondary);
  const secondaryItems = NAV_ITEMS.filter((item) => item.secondary);

  const handleNavigate = (section: NavSection) => {
    setMoreMenuOpen(false);
    onNavigate(section);
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-3 sm:px-6 md:px-8 h-12 bg-[#FDF6F0]/95 backdrop-blur-sm border-b border-[#1a1a1a]/8"
    >
      {/* Nav links */}
      <div className="flex items-center gap-1 sm:gap-5">
        {/* Primary items — always visible */}
        {primaryItems.map((item) => {
          const isActive = activeSection === item.section;
          return (
            <button
              key={item.section}
              type="button"
              onClick={() => handleNavigate(item.section)}
              className={`relative whitespace-nowrap text-[10px] sm:text-[11px] tracking-[0.12em] sm:tracking-[0.15em] uppercase transition-colors px-1.5 sm:px-0 py-3 ${
                isActive
                  ? "text-[#1a1a1a]"
                  : "text-[#1a1a1a]/45 hover:text-[#1a1a1a]/75"
              }`}
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              {/* Short label on mobile, full on sm+ */}
              <span className="sm:hidden">{t(item.shortLabel)}</span>
              <span className="hidden sm:inline">{t(item.label)}</span>
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

        {/* Secondary items — visible on md+, hidden on mobile behind "more" */}
        {secondaryItems.map((item) => {
          if (item.requiresAuth && !isAuthenticated) return null;
          const isActive = activeSection === item.section;
          return (
            <button
              key={item.section}
              type="button"
              onClick={() => handleNavigate(item.section)}
              className={`relative whitespace-nowrap text-[11px] tracking-[0.15em] uppercase transition-colors py-3 hidden md:block ${
                isActive
                  ? "text-[#1a1a1a]"
                  : "text-[#1a1a1a]/45 hover:text-[#1a1a1a]/75"
              }`}
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              {t(item.label)}
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

        {/* More button — visible on mobile/tablet only */}
        <div className="relative md:hidden">
          <button
            type="button"
            onClick={() => setMoreMenuOpen((prev) => !prev)}
            className={`relative whitespace-nowrap text-[10px] sm:text-[11px] tracking-[0.12em] sm:tracking-[0.15em] uppercase transition-colors px-1.5 sm:px-0 py-3 ${
              secondaryItems.some((i) => i.section === activeSection)
                ? "text-[#1a1a1a]"
                : "text-[#1a1a1a]/45 hover:text-[#1a1a1a]/75"
            }`}
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            {t("nav.more")}
            {secondaryItems.some((i) => i.section === activeSection) && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#1a1a1a]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>

          <AnimatePresence>
            {moreMenuOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-30"
                  onClick={() => setMoreMenuOpen(false)}
                />
                {/* Dropdown */}
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-full mt-1 min-w-[11rem] border border-[#1a1a1a]/15 bg-[#FDF6F0] py-1 shadow-[0_8px_24px_rgba(26,26,26,0.08)] z-40"
                >
                  {secondaryItems.map((item) => {
                    if (item.requiresAuth && !isAuthenticated) return null;
                    const isActive = activeSection === item.section;
                    return (
                      <button
                        key={item.section}
                        type="button"
                        onClick={() => handleNavigate(item.section)}
                        className={`w-full px-4 py-2.5 text-left text-[11px] tracking-[0.1em] uppercase transition-colors ${
                          isActive
                            ? "text-[#1a1a1a] bg-[#1a1a1a]/5"
                            : "text-[#1a1a1a]/65 hover:bg-[#1a1a1a]/5 hover:text-[#1a1a1a]"
                        }`}
                        style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                      >
                        {t(item.label)}
                      </button>
                    );
                  })}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right side: auth */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
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
                      {t("nav.logout")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                {isLocalhost && (
                  <button
                    onClick={onDevLogin}
                    className="text-[10px] sm:text-[11px] tracking-[0.12em] sm:tracking-[0.15em] text-[#2E7A4E]/70 hover:text-[#2E7A4E] transition-colors uppercase whitespace-nowrap"
                    style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                  >
                    {t("nav.dev")}
                  </button>
                )}
                <button
                  onClick={onLogin}
                  className="text-[10px] sm:text-[11px] tracking-[0.12em] sm:tracking-[0.15em] text-[#1a1a1a]/60 hover:text-[#1a1a1a] transition-colors uppercase whitespace-nowrap"
                  style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                >
                  {t("nav.login")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </motion.nav>
  );
}
