/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useReducer, useState, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { SortableIncident } from "../incidents/sort";

export interface DashboardData {
  incidents: SortableIncident[];
  events: any[];
  duplicates: any[];
  responders: any[];
  loading: boolean;
  error: string | null;
  channelStatus: "online" | "offline" | "error";
}

type Action =
  | { type: "INIT"; incidents: SortableIncident[]; events: any[]; duplicates: any[]; responders: any[] }
  | { type: "INCIDENT_UPDATE"; payload: SortableIncident }
  | { type: "EVENT_INSERT"; payload: any }
  | { type: "DUPLICATE_INSERT"; payload: any }
  | { type: "RESPONDER_UPDATE"; payload: any }
  | { type: "ERROR"; error: string };

function dedupeAndSort(items: any[], newItem: any, idKey = "id", dateKey = "updated_at") {
  const existing = items.find((i) => i[idKey] === newItem[idKey]);
  if (!existing) return [...items, newItem];
  // Ignore stale update
  if (newItem[dateKey] && existing[dateKey] && new Date(newItem[dateKey]) < new Date(existing[dateKey])) {
    return items;
  }
  return items.map((i) => (i[idKey] === newItem[idKey] ? newItem : i));
}

function dataReducer(state: DashboardData, action: Action): DashboardData {
  switch (action.type) {
    case "INIT":
      return {
        ...state,
        incidents: action.incidents,
        events: action.events,
        duplicates: action.duplicates,
        responders: action.responders,
        loading: false,
        error: null,
      };
    case "INCIDENT_UPDATE":
      return {
        ...state,
        incidents: dedupeAndSort(state.incidents, action.payload),
      };
    case "EVENT_INSERT":
      return {
        ...state,
        events: dedupeAndSort(state.events, action.payload, "id", "created_at"),
      };
    case "DUPLICATE_INSERT":
      return {
        ...state,
        duplicates: dedupeAndSort(state.duplicates, action.payload, "id", "created_at"),
      };
    case "RESPONDER_UPDATE":
      return {
        ...state,
        responders: dedupeAndSort(state.responders, action.payload),
      };
    case "ERROR":
      return { ...state, error: action.error, loading: false };
    default:
      return state;
  }
}

export function useDashboardData(): DashboardData {
  const [state, dispatch] = useReducer(dataReducer, {
    incidents: [],
    events: [],
    duplicates: [],
    responders: [],
    loading: true,
    error: null,
    channelStatus: "offline",
  });

  const [channelStatus, setChannelStatus] = useState<"online" | "offline" | "error">("offline");
  const isPollingRef = useRef(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let mounted = true;

    async function fetchData() {
      if (isPollingRef.current) return;
      isPollingRef.current = true;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Fetch incidents via API per F3a requirements
        const apiRes = await fetch("/api/incidents?limit=100", {
          headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
        });
        
        let incidentsData = [];
        if (apiRes.ok) {
          const json = await apiRes.json();
          incidentsData = json.data || [];
        } else {
           // Fallback to direct query if API fails (e.g. if we get 401 but we think we are logged in, though useStaffSession should prevent this)
           const { data } = await supabase.from("incidents").select("*").limit(100).order("created_at", { ascending: false });
           incidentsData = data || [];
        }

        const [
          { data: evData },
          { data: dupData },
          { data: resData }
        ] = await Promise.all([
          supabase.from("incident_events").select("*").limit(500).order("created_at", { ascending: false }),
          supabase.from("incident_duplicates").select("*").is("resolution", null).limit(100),
          supabase.from("responders").select("*").limit(100)
        ]);

        if (mounted) {
          dispatch({
            type: "INIT",
            incidents: incidentsData,
            events: evData || [],
            duplicates: dupData || [],
            responders: resData || [],
          });
        }
      } catch (err) {
        if (mounted) dispatch({ type: "ERROR", error: "Failed to load data" });
      } finally {
        isPollingRef.current = false;
      }
    }

    fetchData();

    // Setup Realtime Subscription
    const channel = supabase
      .channel("dashboard_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, (payload) => {
        if (mounted && payload.new) dispatch({ type: "INCIDENT_UPDATE", payload: payload.new as SortableIncident });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "incident_events" }, (payload) => {
        if (mounted && payload.new) dispatch({ type: "EVENT_INSERT", payload: payload.new });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "incident_duplicates" }, (payload) => {
        if (mounted && payload.new) dispatch({ type: "DUPLICATE_INSERT", payload: payload.new });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "responders" }, (payload) => {
        if (mounted && payload.new) dispatch({ type: "RESPONDER_UPDATE", payload: payload.new });
      })
      .subscribe((status) => {
        if (mounted) {
          if (status === "SUBSCRIBED") {
            setChannelStatus("online");
          } else if (status === "TIMED_OUT" || status === "CHANNEL_ERROR") {
            setChannelStatus("error");
          } else {
            setChannelStatus("offline");
          }
        }
      });

    // Setup polling fallback when channel drops
    const pollInterval = setInterval(() => {
      if (channelStatus !== "online") {
        fetchData(); // fetchData has isPollingRef to prevent overlap
      }
    }, 15000);

    return () => {
      mounted = false;
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [channelStatus]);

  // Expose state and channel status together
  return { ...state, channelStatus };
}
