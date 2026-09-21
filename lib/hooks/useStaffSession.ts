"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type AppUserRow = Database["public"]["Tables"]["app_users"]["Row"];

export function useStaffSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppUserRow["role"] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    let mounted = true;

    async function fetchSession() {
      setLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Error fetching session:", sessionError);
        if (mounted) setLoading(false);
        return;
      }

      if (session) {
        if (mounted) setSession(session);
        await fetchRole(session.user.id);
      } else {
        if (mounted) setLoading(false);
      }
    }

    async function fetchRole(userId: string) {
      const { data: userRow, error: roleError } = await supabase
        .from("app_users")
        .select("role")
        .eq("id", userId)
        .single();

      if (roleError) {
        console.error("Error fetching app_user role:", roleError);
      } else if (userRow && mounted) {
        setRole(userRow.role);
      }
      
      if (mounted) setLoading(false);
    }

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (mounted) {
        setSession(newSession);
        if (newSession) {
          await fetchRole(newSession.user.id);
        } else {
          setRole(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
  };

  return { session, role, loading, signOut };
}
