import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell } from "lucide-react";

import { WelcomeScreen } from "./components/WelcomeScreen";
import { AuthScreen } from "./components/AuthScreen";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { BodyScanScreen } from "./components/BodyScanScreen";
import { InitialPlanScreen } from "./components/InitialPlanScreen";
import { HomeScreen } from "./components/HomeScreen";
import { MealsScreen } from "./components/MealsScreen";
import { AICoachScreen } from "./components/AICoachScreen";
import { ProgressScreen } from "./components/ProgressScreen";
import { ProfileScreen } from "./components/ProfileScreen";
import { BottomNav } from "./components/BottomNav";
import { CheckInScreen } from "./components/CheckInScreen";
import { NotificationsScreen } from "./components/NotificationsScreen";
import { SubscriptionsScreen } from "./components/SubscriptionsScreen";
import { GroceryScreen } from "./components/GroceryScreen";
import { RestaurantScreen } from "./components/RestaurantScreen";
import { RewardAdScreen } from "./components/RewardAdScreen";
import { BannerAd } from "./components/BannerAd";

/* MARKER-MAKE-KIT-INVOKED */

type Flow = "welcome" | "auth" | "onboarding" | "ad_onboarding" | "bodyscan" | "ad_plan" | "plan" | "app";
type AppTab = "home" | "meals" | "coach" | "progress" | "profile";
type Overlay =
  | null
  | "checkin"
  | "notifications"
  | "subscriptions"
  | "grocery"
  | "restaurant"
  | "ad_meal";

export default function App() {
  const [flow, setFlow] = useState<Flow>("welcome");
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [overlay, setOverlay] = useState<Overlay>(null);
  // Callback to fire after the meal ad finishes (unlocks the specific tab/section)
  const [adUnlockCallback, setAdUnlockCallback] = useState<(() => void) | null>(null);

  const handleNavigate = (screen: string) => {
    // Handle special overlays triggered from nav or home screen
    if (screen === "checkin") { setOverlay("checkin"); return; }
    if (screen === "notifications") { setOverlay("notifications"); return; }
    if (screen === "subscriptions") { setOverlay("subscriptions"); return; }
    if (screen === "grocery") { setOverlay("grocery"); return; }
    if (screen === "restaurant") { setOverlay("restaurant"); return; }
    setActiveTab(screen as AppTab);
  };

  return (
    <div
      className="size-full flex items-center justify-center"
      style={{
        background: "linear-gradient(135deg,#0a0a14 0%,#131320 50%,#0a0a14 100%)",
        fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      }}
    >
      {/* iPhone 16 Pro Max frame */}
      <div
        className="relative flex flex-col"
        style={{
          width: "100%",
          maxWidth: 430,
          height: "100%",
          maxHeight: 932,
          borderRadius: "clamp(0px,4vw,50px)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.07), 0 40px 120px rgba(0,0,0,0.7)",
          background: "var(--background)",
          overflow: "hidden",
        }}
      >
        {/* Dynamic island (decorative) */}
        {flow !== "welcome" && (
          <div
            className="absolute top-3 left-1/2 -translate-x-1/2 z-20 rounded-full"
            style={{ width: 126, height: 34, background: "#000", zIndex: 30 }}
          />
        )}

        {/* Notification badge overlay trigger (in app shell) */}
        {flow === "app" && (
          <button
            onClick={() => setOverlay("notifications")}
            className="absolute top-14 right-5 z-10 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
          >
            <Bell size={16} style={{ color: "var(--foreground)" }} />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ background: "#EF4444" }} />
          </button>
        )}

        {/* Main screen content */}
        <div className="flex-1 relative overflow-hidden">
          <AnimatePresence mode="wait">

            {/* ——— WELCOME ——— */}
            {flow === "welcome" && (
              <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="absolute inset-0">
                <WelcomeScreen
                  onGetStarted={() => { setAuthMode("signup"); setFlow("auth"); }}
                  onLogin={() => { setAuthMode("login"); setFlow("auth"); }}
                />
              </motion.div>
            )}

            {/* ——— AUTH ——— */}
            {flow === "auth" && (
              <motion.div key="auth" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.28 }} className="absolute inset-0">
                <AuthScreen
                  onSuccess={() => authMode === "login" ? setFlow("app") : setFlow("onboarding")}
                  onBack={() => setFlow("welcome")}
                />
              </motion.div>
            )}

            {/* ——— ONBOARDING ——— */}
            {flow === "onboarding" && (
              <motion.div key="onboarding" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.28 }} className="absolute inset-0">
                <OnboardingScreen onComplete={() => setFlow("ad_onboarding")} />
              </motion.div>
            )}

            {/* ——— POST-ONBOARDING AD INTERSTITIAL ——— */}
            {flow === "ad_onboarding" && (
              <motion.div key="ad_onboarding" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0 flex flex-col bg-[#080C12]">
                {/* Header */}
                <div className="px-5 pt-14 pb-4 flex items-center justify-between">
                  <span style={{ color: "#475569", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.07em" }}>ADVERTISEMENT</span>
                  <button
                    onClick={() => setFlow("bodyscan")}
                    style={{ color: "#F59E0B", fontSize: "0.82rem", fontWeight: 700 }}
                  >
                    Skip →
                  </button>
                </div>

                {/* Large banner fills the space */}
                <div className="flex-1 flex flex-col justify-center px-5 gap-4">
                  <BannerAd variant="large" dismissible={false} />
                  <BannerAd variant="standard" dismissible={false} />
                </div>

                {/* Continue CTA */}
                <div className="px-5 pb-10 pt-4">
                  <button
                    onClick={() => setFlow("bodyscan")}
                    className="w-full py-4 rounded-2xl text-white transition-all active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", fontSize: "1rem", fontWeight: 800, boxShadow: "0 8px 24px rgba(245,158,11,0.35)" }}
                  >
                    Continue to Body Scan →
                  </button>
                  <p style={{ color: "#334155", fontSize: "0.68rem", textAlign: "center", marginTop: 10 }}>
                    DietBuddy Free · Upgrade to Premium to remove ads
                  </p>
                </div>
              </motion.div>
            )}

            {/* ——— BODY SCAN ——— */}
            {flow === "bodyscan" && (
              <motion.div key="bodyscan" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.28 }} className="absolute inset-0">
                <BodyScanScreen
                  onComplete={() => setFlow("ad_plan")}
                  onBack={() => setFlow("onboarding")}
                />
              </motion.div>
            )}

            {/* ——— REWARD AD → PLAN ——— */}
            {flow === "ad_plan" && (
              <motion.div key="ad_plan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0">
                <RewardAdScreen
                  reward="Your AI Plan"
                  rewardXP={100}
                  onComplete={() => setFlow("plan")}
                  onSkip={() => setFlow("plan")}
                />
              </motion.div>
            )}

            {/* ——— INITIAL AI PLAN ——— */}
            {flow === "plan" && (
              <motion.div key="plan" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.28 }} className="absolute inset-0">
                <InitialPlanScreen onContinue={() => setFlow("app")} />
              </motion.div>
            )}

            {/* ——— MAIN APP ——— */}
            {flow === "app" && (
              <motion.div key="app" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0 flex flex-col">
                {/* Tab screens */}
                <div className="flex-1 relative overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="absolute inset-0">
                      {activeTab === "home" && <HomeScreen onNavigate={handleNavigate} />}
                      {activeTab === "meals" && (
                        <MealsScreen
                          onShowAd={(onUnlock) => {
                            setAdUnlockCallback(() => onUnlock);
                            setOverlay("ad_meal");
                          }}
                        />
                      )}
                      {activeTab === "coach" && <AICoachScreen />}
                      {activeTab === "progress" && <ProgressScreen />}
                      {activeTab === "profile" && (
                        <ProfileScreen
                          onLogout={() => setFlow("welcome")}
                          onNavigate={handleNavigate}
                        />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <BottomNav active={activeTab} onNavigate={handleNavigate} />
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ——— OVERLAYS (slide up from bottom) ——— */}
        <AnimatePresence>
          {overlay && (
            <motion.div
              key={overlay}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 350 }}
              className="absolute inset-0 z-50"
              style={{ background: "var(--background)" }}
            >
              {overlay === "checkin" && <CheckInScreen onClose={() => setOverlay(null)} />}
              {overlay === "notifications" && <NotificationsScreen onClose={() => setOverlay(null)} />}
              {overlay === "subscriptions" && <SubscriptionsScreen onClose={() => setOverlay(null)} />}
              {overlay === "grocery" && <GroceryScreen onClose={() => setOverlay(null)} />}
              {overlay === "restaurant" && <RestaurantScreen onClose={() => setOverlay(null)} />}
              {overlay === "ad_meal" && (
                <RewardAdScreen
                  reward="Meal Plan"
                  rewardXP={50}
                  onComplete={() => {
                    adUnlockCallback?.();
                    setAdUnlockCallback(null);
                    setOverlay(null);
                  }}
                  onSkip={() => {
                    setAdUnlockCallback(null);
                    setOverlay(null);
                  }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
