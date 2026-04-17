"use client";

import { ChevronDown, X } from "lucide-react";

// ── Types ──

interface NewGoal {
  title: string;
  category: string;
  target_value: string;
  unit: string;
  deadline: string;
}

// ── Props ──

interface AddGoalModalProps {
  show: boolean;
  onClose: () => void;
  newGoal: NewGoal;
  setNewGoal: React.Dispatch<React.SetStateAction<NewGoal>>;
  onCreate: () => void;
}

// ── Component ──

export function AddGoalModal({ show, onClose, newGoal, setNewGoal, onCreate }: AddGoalModalProps) {
  if (!show) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed inset-x-4 top-[15%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[400px] z-50 rounded-2xl p-5"
        style={{ background: "var(--bg3)", border: "1px solid var(--border2)", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>Nouvel objectif</h3>
          <button onClick={onClose} className="cursor-pointer" style={{ color: "var(--text-muted)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>Titre</label>
            <input
              type="text"
              value={newGoal.title}
              onChange={(e) => setNewGoal((p) => ({ ...p, title: e.target.value }))}
              placeholder="Ex: 1000 abonnes OnlyFans"
              className="w-full px-3 py-2 rounded-lg text-xs outline-none"
              style={{ background: "var(--bg)", border: "1px solid var(--border2)", color: "var(--text)" }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>Categorie</label>
              <div className="relative">
                <select
                  value={newGoal.category}
                  onChange={(e) => setNewGoal((p) => ({ ...p, category: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none appearance-none cursor-pointer"
                  style={{ background: "var(--bg)", border: "1px solid var(--border2)", color: "var(--text)" }}
                >
                  <option value="revenue">Revenue</option>
                  <option value="subscribers">Abonnes</option>
                  <option value="content">Contenu</option>
                  <option value="engagement">Engagement</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "var(--text-muted)" }} />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>Unite</label>
              <div className="relative">
                <select
                  value={newGoal.unit}
                  onChange={(e) => setNewGoal((p) => ({ ...p, unit: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none appearance-none cursor-pointer"
                  style={{ background: "var(--bg)", border: "1px solid var(--border2)", color: "var(--text)" }}
                >
                  <option value="EUR">EUR</option>
                  <option value="count">Nombre</option>
                  <option value="percent">%</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "var(--text-muted)" }} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>Objectif</label>
              <input
                type="number"
                value={newGoal.target_value}
                onChange={(e) => setNewGoal((p) => ({ ...p, target_value: e.target.value }))}
                placeholder="1000"
                className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                style={{ background: "var(--bg)", border: "1px solid var(--border2)", color: "var(--text)" }}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>Deadline</label>
              <input
                type="date"
                value={newGoal.deadline}
                onChange={(e) => setNewGoal((p) => ({ ...p, deadline: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                style={{ background: "var(--bg)", border: "1px solid var(--border2)", color: "var(--text)" }}
              />
            </div>
          </div>
          <button
            onClick={onCreate}
            disabled={!newGoal.title.trim()}
            className="w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, var(--rose), var(--accent))", color: "#fff" }}
          >
            Creer objectif
          </button>
        </div>
      </div>
    </>
  );
}
