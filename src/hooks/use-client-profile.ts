"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface ParsedOrder {
  id: string;
  status: "pending" | "accepted" | "refused";
  item: string;
  amount: number;
  created_at: string;
}

interface UseClientProfileProps {
  slug: string;
  clientId: string | null;
  visitorHandle: string;
  enabled: boolean;
}

interface UseClientProfileReturn {
  badgeGrade: string;
  visitCount: number;
  orders: ParsedOrder[];
  newNotifications: number;
  clearNotifications: () => void;
  ordersLoading: boolean;
}

export function useClientProfile({ slug, clientId, visitorHandle, enabled }: UseClientProfileProps): UseClientProfileReturn {
  const [badgeGrade, setBadgeGrade] = useState("nouveau");
  const [visitCount, setVisitCount] = useState(0);
  const [orders, setOrders] = useState<ParsedOrder[]>([]);
  const [newNotifications, setNewNotifications] = useState(0);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const prevOrdersRef = useRef<string>("");

  // Track visit on mount (debounced: 30 min cooldown)
  useEffect(() => {
    if (!enabled || !clientId || !slug) return;
    const key = `heaven_last_visit_${slug}`;
    const last = localStorage.getItem(key);
    const now = Date.now();
    if (last && now - Number(last) < 1800000) return; // 30 min cooldown

    localStorage.setItem(key, String(now));
    fetch("/api/clients/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: slug, client_id: clientId }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.badge_grade) setBadgeGrade(d.badge_grade);
        if (d.visit_count) setVisitCount(d.visit_count);
      })
      .catch(() => {});
  }, [enabled, clientId, slug]);

  // Poll orders every 15s
  const fetchOrders = useCallback(() => {
    if (!enabled || !visitorHandle || !slug) return;
    setOrdersLoading(true);
    fetch(`/api/clients/orders?model=${slug}&handle=${encodeURIComponent(visitorHandle)}`)
      .then(r => r.json())
      .then(d => {
        const fetched: ParsedOrder[] = d.orders || [];
        setOrders(fetched);

        // Detect new status changes
        const snapshot = JSON.stringify(fetched.map(o => `${o.id}:${o.status}`));
        if (prevOrdersRef.current && prevOrdersRef.current !== snapshot) {
          // Count orders that changed from pending to accepted/refused
          const prev = JSON.parse(prevOrdersRef.current) as string[];
          const changes = fetched.filter(o => {
            const prevEntry = prev.find((p: string) => p.startsWith(o.id + ":"));
            return prevEntry && !prevEntry.endsWith(o.status);
          });
          if (changes.length > 0) {
            setNewNotifications(n => n + changes.length);
          }
        }
        prevOrdersRef.current = snapshot;
      })
      .catch(() => {})
      .finally(() => setOrdersLoading(false));
  }, [enabled, visitorHandle, slug]);

  useEffect(() => {
    fetchOrders();
    const iv = setInterval(fetchOrders, 15000);
    return () => clearInterval(iv);
  }, [fetchOrders]);

  // Load cached badge from localStorage
  useEffect(() => {
    if (!slug) return;
    const cached = localStorage.getItem(`heaven_badge_${slug}`);
    if (cached) {
      try {
        const d = JSON.parse(cached);
        if (d.badge_grade) setBadgeGrade(d.badge_grade);
      } catch {}
    }
  }, [slug]);

  // Cache badge updates
  useEffect(() => {
    if (badgeGrade && slug) {
      localStorage.setItem(`heaven_badge_${slug}`, JSON.stringify({ badge_grade: badgeGrade }));
    }
  }, [badgeGrade, slug]);

  const clearNotifications = useCallback(() => setNewNotifications(0), []);

  return { badgeGrade, visitCount, orders, newNotifications, clearNotifications, ordersLoading };
}
