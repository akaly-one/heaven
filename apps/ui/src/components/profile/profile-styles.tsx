"use client";

export function ProfileStyles() {
  return (
    <style>{`
      img { -webkit-touch-callout: none; -webkit-user-select: none; pointer-events: none; }
      img[data-clickable] { pointer-events: auto; }
      @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes heroFadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes chevronBounce { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(6px); opacity: 0.8; } }
      @keyframes countUp { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
      @keyframes chatBubbleGlow {
        0%, 100% { box-shadow: 0 0 8px rgba(230,51,41,0.5), 0 0 20px rgba(16,185,129,0.3), 0 0 40px rgba(16,185,129,0.1); transform: scale(1); }
        50% { box-shadow: 0 0 12px rgba(230,51,41,0.6), 0 0 30px rgba(16,185,129,0.5), 0 0 60px rgba(16,185,129,0.2); transform: scale(1.06); }
      }
      .profile-stagger-1 { animation: heroFadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both; }
      .profile-stagger-2 { animation: heroFadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both; }
      .profile-stagger-3 { animation: heroFadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both; }
      .profile-stagger-4 { animation: heroFadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.55s both; }
      .stat-pop { animation: countUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s both; }
      .scrollbar-hide::-webkit-scrollbar { display: none; }
      .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      .post-hover { transition: transform 0.2s ease, box-shadow 0.2s ease; }
      .post-hover:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
      @media (max-width: 768px) { .post-hover:hover { transform: none; box-shadow: none; } }
      .gallery-item { transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease; }
      .heaven-grid-overlay {
        background-image:
          linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
        background-size: 24px 24px;
        mask-image: linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 60%, transparent 100%);
        -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 60%, transparent 100%);
      }
      .gallery-item:hover { transform: scale(1.02); box-shadow: var(--shadow-xl); }
    `}</style>
  );
}
