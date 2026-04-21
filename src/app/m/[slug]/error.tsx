"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--bg)" }}
    >
      <div
        className="max-w-md p-8 rounded-2xl"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <h2 className="text-lg font-bold mb-2">Une erreur est survenue</h2>
        <p className="text-sm opacity-60 mb-4">{error.message}</p>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-rose-500 text-white text-sm font-semibold"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
