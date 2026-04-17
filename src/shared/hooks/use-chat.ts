import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { toModelId } from "@/lib/model-utils";
import type { ModelInfo } from "@/types/heaven";

interface ChatMessage {
  id: string;
  client_id: string;
  sender_type: string;
  content: string;
  created_at: string;
}

interface UseChatParams {
  slug: string;
  clientId: string | null;
  model: ModelInfo | null;
}

interface UseChatReturn {
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: React.Dispatch<React.SetStateAction<string>>;
  chatOpen: boolean;
  setChatOpen: React.Dispatch<React.SetStateAction<boolean>>;
  chatUnread: number;
  sendMessage: () => Promise<void>;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Manages chat messages: polling, sending, notification sounds, unread count.
 */
export function useChat({ slug, clientId, model }: UseChatParams): UseChatReturn {
  const modelId = toModelId(slug);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const seenMsgIdsRef = useRef<Set<string>>(new Set());
  const readMsgIdsRef = useRef<Set<string>>(new Set());

  // Chat sounds (Web Audio API)
  const playSound = useCallback((type: "receive" | "send") => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const playTone = (freq: number, startTime: number, duration: number, vol = 0.25) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      const t = ctx.currentTime;
      if (type === "receive") {
        playTone(880, t, 0.1, 0.2);
        playTone(1108.7, t + 0.1, 0.1, 0.25);
        playTone(1318.5, t + 0.2, 0.15, 0.3);
      } else {
        playTone(1318.5, t, 0.08, 0.15);
        playTone(1568, t + 0.07, 0.12, 0.2);
      }
    } catch { /* audio not available */ }
  }, []);

  // Poll messages + notification sound
  useEffect(() => {
    if (!clientId) return;
    let isFirst = true;
    const fetchChat = () => {
      fetch(`/api/messages?model=${modelId}&client_id=${clientId}`)
        .then(r => r.json())
        .then(d => {
          const msgs = ((d.messages || []) as ChatMessage[]).reverse();
          if (!isFirst) {
            const newModelMsgs = msgs.filter(
              m => m.sender_type === "model" && !seenMsgIdsRef.current.has(m.id)
            );
            if (newModelMsgs.length > 0) {
              playSound("receive");
            }
          }
          msgs.forEach(m => seenMsgIdsRef.current.add(m.id));
          isFirst = false;
          setChatMessages(msgs);
        })
        .catch(e => console.error("[Chat] poll error:", e));
    };
    fetchChat();
    const interval = chatOpen ? 5000 : 15000;
    const iv = setInterval(fetchChat, interval);
    return () => clearInterval(iv);
  }, [clientId, modelId, chatOpen, playSound]);

  // Unread = model messages not yet marked as read
  const chatUnread = useMemo(() => {
    return chatMessages.filter(m => m.sender_type === "model" && !readMsgIdsRef.current.has(m.id)).length;
  }, [chatMessages]);

  // Mark all model messages as read when chat is open
  useEffect(() => {
    if (chatOpen) {
      chatMessages.forEach(m => {
        if (m.sender_type === "model") readMsgIdsRef.current.add(m.id);
      });
    }
  }, [chatOpen, chatMessages]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Send message
  const sendMessage = useCallback(async () => {
    if (!chatInput.trim() || !clientId) return;
    const msgRes = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelId, client_id: clientId, sender_type: "client", content: chatInput.trim() }),
    });
    if (!msgRes.ok) {
      console.error("[Chat] send failed:", await msgRes.text());
      return;
    }
    setChatInput("");
    playSound("send");
    // Mark all as seen since user just interacted
    const res = await fetch(`/api/messages?model=${modelId}&client_id=${clientId}`);
    const d = await res.json();
    const msgs = ((d.messages || []) as ChatMessage[]).reverse();
    msgs.forEach(m => { seenMsgIdsRef.current.add(m.id); if (m.sender_type === "model") readMsgIdsRef.current.add(m.id); });
    setChatMessages(msgs);
  }, [chatInput, clientId, modelId, playSound]);

  return {
    chatMessages, chatInput, setChatInput,
    chatOpen, setChatOpen, chatUnread,
    sendMessage, chatEndRef,
  };
}
