"use client";

import React, { useState } from "react";
import { apiUrl } from "@/lib/api";

interface ThreatResult {
  risk_level: string;
  posterior_probability: number;
  suitability_index: number;
  likelihood: number;
  prior_probability: number;
  source_trust: number;
  prescription: {
    action: string;
    message?: string;
    llm_generated?: boolean;
    specific_product?: string;
    application_instructions?: string;
    preventive_measures?: string;
  };
  crop: string | null;
  pathogen: string | null;
  region: string | null;
}

const RISK_COLORS: Record<string, string> = {
  CRITICAL: "from-[#8a3030] to-[#5a2020]",
  HIGH: "from-[#c08060] to-[#8a6040]",
  MODERATE: "from-[#d1a15a] to-[#b8893a]",
  LOW: "from-[#6c8b72] to-[#4a6a52]",
};

const RISK_BADGE: Record<string, string> = {
  CRITICAL: "bg-[#8a3030] text-white",
  HIGH: "bg-[#c08060] text-white",
  MODERATE: "bg-[#d1a15a] text-white",
  LOW: "bg-[#6c8b72] text-white",
};

export default function ThreatPanel() {
  const [rawText, setRawText] = useState("");
  const [result, setResult] = useState<ThreatResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const checkThreat = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(apiUrl("/api/v1/threat/check"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: rawText, source_trust: 0.8 }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Failed to check threat");
    } finally {
      setLoading(false);
    }
  };

  const riskLevel = result?.risk_level || "LOW";
  const confidence = result ? (result.posterior_probability * 100).toFixed(0) : "0";

  return (
    <div className="space-y-4">
      <div className="relative">
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="e.g., Wheat rust reported in Punjab fields with high humidity"
          className="w-full bg-[#D5C8A0] border border-[#B8A878] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#255531] resize-none h-20 placeholder-[#4a5a4a] text-[#2a2a24]"
        />
      </div>

      <button
        onClick={checkThreat}
        disabled={loading || !rawText.trim()}
        className="w-full py-3 bg-gradient-to-r from-[#255531] to-[#1a4425] hover:from-[#326c43] hover:to-[#255531] text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Analyzing...
          </span>
        ) : (
          "Analyze Threat"
        )}
      </button>

      {error && (
        <div className="p-3 bg-[#f5e0d8] border border-[#d1b0a0] rounded-xl text-xs text-[#5a2010]">
          {error}
        </div>
      )}

      {result && (
        <div className={`bg-gradient-to-br ${RISK_COLORS[riskLevel] || RISK_COLORS.LOW} rounded-xl p-4 border border-white/10 space-y-3`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${RISK_BADGE[riskLevel] || RISK_BADGE.LOW}`}>
              {riskLevel}
            </span>
            <span className="text-xs text-white/80">{confidence}% confidence</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-white">
            {result.crop && (
              <div>
                <span className="text-white/70">Crop</span>
                <p className="font-medium capitalize">{result.crop}</p>
              </div>
            )}
            {result.pathogen && (
              <div>
                <span className="text-white/70">Pathogen</span>
                <p className="font-medium capitalize">{result.pathogen}</p>
              </div>
            )}
            {result.region && (
              <div>
                <span className="text-white/70">Region</span>
                <p className="font-medium capitalize">{result.region}</p>
              </div>
            )}
            <div>
              <span className="text-white/70">Action</span>
              <p className="font-medium capitalize">{result.prescription?.action?.replace("_", " ") || "N/A"}</p>
            </div>
          </div>

          {result.prescription?.message && (
            <div className="bg-black/20 rounded-lg p-3 text-xs leading-relaxed text-white">
              {result.prescription.message}
            </div>
          )}

          {result.prescription?.specific_product && (
            <div className="bg-black/20 rounded-lg p-2 text-xs text-white">
              <span className="text-white/70">Recommended: </span>
              <span className="font-medium">{result.prescription.specific_product}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/10 text-center">
            <div>
              <p className="text-xs font-bold text-white">{result.suitability_index.toFixed(2)}</p>
              <p className="text-[9px] text-white/70">Suitability</p>
            </div>
            <div>
              <p className="text-xs font-bold text-white">{result.likelihood.toFixed(2)}</p>
              <p className="text-[9px] text-white/70">Likelihood</p>
            </div>
            <div>
              <p className="text-xs font-bold text-white">{result.prior_probability.toFixed(2)}</p>
              <p className="text-[9px] text-white/70">Prior</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
