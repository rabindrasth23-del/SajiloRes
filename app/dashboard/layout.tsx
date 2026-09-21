"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStaffSession } from "@/lib/hooks/useStaffSession";
import { DashboardProvider, useDashboardContext } from "./DashboardContext";
import { BrandMark } from "@/components/BrandMark";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { LogOut } from "lucide-react";

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { session, role, loading, signOut } = useStaffSession();
  const router = useRouter();
  const { channelStatus } = useDashboardContext();

  useEffect(() => {
    if (!loading && !session) {
      router.push("/login"); // fallback or standard login route
    }
  }, [loading, session, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-cloud text-gray-500 font-medium">
        Loading workspace...
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect
  }

  if (session && !role) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-cloud p-4 text-center">
        <h1 className="text-2xl font-heading font-bold mb-4 text-ink">Access Denied</h1>
        <p className="mb-8 text-minor max-w-md">
          Your account has no access. Contact an administrator to assign a role in app_users.
        </p>
        <button 
          onClick={signOut} 
          className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-md hover:bg-navy/90 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-cloud text-ink">
      {/* Top Bar */}
      <header className="flex-none bg-white border-b border-mist px-4 py-3 flex items-center justify-between shadow-sm relative z-20">
        <div className="flex items-center gap-4">
          <BrandMark />
          <ConnectionBadge state={channelStatus} />
          <span className="text-sm font-medium text-teal capitalize px-2 py-0.5 bg-teal/10 rounded-md">
            {role}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <DemoModeBanner />
          <button 
            onClick={signOut} 
            className="text-sm text-minor hover:text-navy flex items-center gap-1 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline font-medium">Sign out</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative min-h-0">
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </DashboardProvider>
  );
}
