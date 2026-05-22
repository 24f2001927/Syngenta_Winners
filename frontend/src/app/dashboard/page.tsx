"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import InsightsDashboard from "../components/InsightsDashboard";
import ThreatPanel from "../components/ThreatPanel";

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-[#CDC098] rounded-2xl border border-[#B8A878] shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-[#B8A878]">
          <h3 className="text-base font-semibold tracking-tight text-[#2a2a24]">{title}</h3>
          <button onClick={onClose} className="text-[#4a5a4a] hover:text-[#2a2a24] transition-colors p-1 hover:bg-[#C2B280] rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="overflow-y-auto p-5 flex-1">{children}</div>
      </div>
    </div>
  );
}

export default function MarketingDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [growers, setGrowers] = useState<any[]>([]);
  const [receptivityScores, setReceptivityScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGrowers, setSelectedGrowers] = useState<Set<string>>(new Set());
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [products, setProducts] = useState<string[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [genLanguage, setGenLanguage] = useState("");
  const [generatedResults, setGeneratedResults] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [pushResult, setPushResult] = useState("");
  const [genError, setGenError] = useState("");
  const [filters, setFilters] = useState({ state: "", language: "" });
  const [showCampaignsModal, setShowCampaignsModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showScoresModal, setShowScoresModal] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [showThreatModal, setShowThreatModal] = useState(false);
  const [showNewCampaignForm, setShowNewCampaignForm] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: "", product: "", target_crop: "", goal: "" });
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [newCampaignError, setNewCampaignError] = useState("");

  const API_URL = "http://localhost:8000";

  useEffect(() => {
    fetchStats();
    fetchGrowers();
    fetchCampaigns();
    fetchProducts();
  }, []);

  const fetchStats = async () => {
    try { const res = await fetch(`${API_URL}/stats`); const data = await res.json(); setStats(data); } catch (e) { console.error(e); }
  };
  const fetchCampaigns = async () => {
    try { const res = await fetch(`${API_URL}/campaigns`); const data = await res.json(); setCampaigns(data); } catch (e) { console.error(e); }
  };
  const fetchProducts = async () => {
    try { const res = await fetch(`${API_URL}/products`); const data = await res.json(); setProducts(data); } catch (e) { console.error(e); }
  };

  const fetchGrowers = async (f = filters) => {
    setLoading(true);
    setReceptivityScores([]);
    try {
      const query = new URLSearchParams(f as any).toString();
      const res = await fetch(`${API_URL}/growers?${query}`);
      const data = await res.json();
      setGrowers(data);
      setSelectedGrowers(new Set());
      setGeneratedResults([]);
      setGenError("");
      setPushResult("");
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchReceptivity = async () => {
    if (!selectedCampaign || selectedGrowers.size === 0) return;
    const targetGrowers = growers.filter(g => selectedGrowers.has(g.grower_id));
    try {
      const res = await fetch(`${API_URL}/predict-receptivity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          growers: targetGrowers,
          campaign_product: selectedProduct || selectedCampaign.product,
          campaign_crop: selectedCampaign.target_crop,
        }),
      });
      const data = await res.json();
      setReceptivityScores(data.scores || []);
    } catch (e) { console.error(e); }
  };

  const toggleGrower = (id: string) => {
    setSelectedGrowers(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const toggleSelectAll = () => {
    if (selectedGrowers.size === growers.length) setSelectedGrowers(new Set());
    else setSelectedGrowers(new Set(growers.map(g => g.grower_id)));
  };
  const handleCampaignChange = (campId: string) => {
    const camp = campaigns.find(c => c.id === campId);
    setSelectedCampaign(camp || null);
    if (camp) setSelectedProduct(camp.product);
  };

  const handleGenerate = async () => {
    const campaign = selectedCampaign;
    if (!campaign) return;
    const targetGrowers = growers.filter(g => selectedGrowers.has(g.grower_id));
    if (targetGrowers.length === 0) return;
    setIsGenerating(true); setGenError(""); setGeneratedResults([]); setReceptivityScores([]);
    try {
      const res = await fetch(`${API_URL}/generate-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          growers: targetGrowers,
          campaign_goal: campaign.goal,
          product_name: selectedProduct || campaign.product,
          language: genLanguage || undefined,
        }),
      });
      const data = await res.json();
      if (data.results) { setGeneratedResults(data.results); setShowResultsModal(true); fetchReceptivity(); }
      else setGenError("No results returned");
    } catch (error: any) { setGenError(error.message || "Failed to connect"); }
    finally { setIsGenerating(false); }
  };

  const handlePushAll = async () => {
    if (generatedResults.length === 0) return;
    setIsPushing(true); setPushResult("");
    try {
      const messages = generatedResults.map(r => ({
        grower_id: r.grower_id,
        channel: r.recommended_channel?.channel || "WhatsApp",
        content: r.content || "",
      }));
      const res = await fetch(`${API_URL}/push-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      const data = await res.json();
      setPushResult(`Pushed ${data.pushed} of ${data.total} messages`);
    } catch (error: any) { setPushResult(`Push failed: ${error.message}`); }
    finally { setIsPushing(false); }
  };

  const handlePushOne = async (result: any) => {
    setIsPushing(true);
    try {
      await fetch(`${API_URL}/push-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ grower_id: result.grower_id, channel: result.recommended_channel?.channel || "WhatsApp", content: result.content }],
        }),
      });
    } catch (e) { console.error(e); }
    finally { setIsPushing(false); }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaign.name.trim()) return;
    setCreatingCampaign(true);
    setNewCampaignError("");
    try {
      const res = await fetch(`${API_URL}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCampaign),
      });
      if (!res.ok) throw new Error("Failed to create campaign");
      await res.json();
      await fetchCampaigns();
      await fetchProducts();
      setShowNewCampaignForm(false);
      setNewCampaign({ name: "", product: "", target_crop: "", goal: "" });
    } catch (e: any) {
      setNewCampaignError(e.message || "Failed to create campaign");
    } finally {
      setCreatingCampaign(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/campaigns/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      await fetchCampaigns();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen text-[#2a2a24] font-sans" style={{ background: '#C2B280' }}>
      {/* TOP BAR */}
      <header className="border-b border-[#B8A878] bg-[#CDC098]/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#255531] to-[#1a4425] flex items-center justify-center shadow-lg shadow-[#255531]/20 ring-1 ring-[#255531]/20">
                <svg className="w-5 h-5 text-[#d1a15a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#1a2a1c] tracking-tight">Kisaan Kavach</h1>
                <p className="text-[9px] text-[#255531]/60 leading-none tracking-widest uppercase font-medium">AI Shield for Indian Agriculture</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowInsightsModal(true)}
                className="px-3 py-2 bg-[#D5C8A0] hover:bg-white border border-[#B8A878] rounded-xl text-xs font-medium transition-all hover:border-[#d1a15a]/50 text-[#1a2a1c]"
              >
                Insights
              </button>
              <button
                onClick={() => setShowThreatModal(true)}
                className="px-3 py-2 bg-[#faf5f0]/80 hover:bg-[#faf0e8] border border-[#d1c0b0]/60 rounded-xl text-xs font-medium transition-all hover:border-[#c08060]/50 text-[#5a2010]"
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
                  Threat Scan
                </span>
              </button>
              <div className="hidden sm:flex items-center gap-2 ml-2 pl-2 border-l border-[#B8A878]">
                <div className="bg-[#D5C8A0] px-3 py-2 rounded-xl border border-[#B8A878]">
                  <p className="text-[10px] text-[#4a5a4a]">Growers</p>
                  <p className="text-sm font-bold text-[#255531]">{stats?.total_growers || "---"}</p>
                </div>
                <button className="bg-[#D5C8A0] px-3 py-2 rounded-xl border border-[#B8A878] hover:bg-white transition-all cursor-pointer text-left" onClick={() => setShowCampaignsModal(true)}>
                  <p className="text-[10px] text-[#4a5a4a]">Campaigns</p>
                  <p className="text-sm font-bold text-[#255531]">{campaigns.length}</p>
                </button>
              </div>
              <Link
                href="/"
                className="ml-1 px-3 py-2 bg-[#255531] hover:bg-[#326c43] text-white rounded-xl text-xs font-medium transition-all"
              >
                Home
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* LEFT COLUMN - Grower Segments */}
          <div className="col-span-12 lg:col-span-7 space-y-6">
            <div className="bg-[#CDC098] rounded-2xl border border-[#B8A878] shadow-lg overflow-hidden">
              <div className="p-5 border-b border-[#B8A878]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#1a3a2a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    <h2 className="text-base font-semibold tracking-tight text-[#2a2a24]">Grower Segments</h2>
                  </div>
                  <div className="flex gap-2">
                    <select className="bg-[#D5C8A0] border border-[#B8A878] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#255531] transition-colors text-[#2a2a24]"
                      onChange={(e) => { const nf = { ...filters, state: e.target.value }; setFilters(nf); fetchGrowers(nf); }}>
                      <option value="">All States</option>{stats?.states.map((s: string) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select className="bg-[#D5C8A0] border border-[#B8A878] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#255531] transition-colors text-[#2a2a24]"
                      onChange={(e) => { const nf = { ...filters, language: e.target.value }; setFilters(nf); fetchGrowers(nf); }}>
                      <option value="">All Languages</option>{stats?.languages.map((l: string) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-3">
                <div className="flex items-center gap-2 px-2 mb-2">
                  <button className="flex items-center gap-1.5 text-xs text-[#1a3a2a] hover:text-[#255531] transition-colors" onClick={toggleSelectAll}>
                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${selectedGrowers.size === growers.length && growers.length > 0 ? "bg-[#255531] border-[#255531]" : "border-[#b8c8b8]"}`}>
                      {selectedGrowers.size === growers.length && growers.length > 0 && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      )}
                    </span>
                    <span>{selectedGrowers.size === growers.length ? "Deselect All" : "Select All"}</span>
                  </button>
                  <span className="text-[10px] text-[#5a6a5a]">({selectedGrowers.size}/{growers.length})</span>
                  {receptivityScores.length > 0 && (
                    <button className="ml-auto text-[10px] text-[#255531] hover:text-[#1a4425] font-medium" onClick={() => setShowScoresModal(true)}>
                      View Predictions
                    </button>
                  )}
                </div>
                <div className="overflow-hidden rounded-xl border border-[#B8A878]">
                  <div className="max-h-[400px] overflow-y-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[#C2B280]/90 sticky top-0">
                        <tr>
                          <th className="p-3 text-[10px] font-medium text-[#4a5a4a] uppercase w-8"></th>
                          <th className="p-3 text-[10px] font-medium text-[#4a5a4a] uppercase">Grower</th>
                          <th className="p-3 text-[10px] font-medium text-[#4a5a4a] uppercase">Language</th>
                          <th className="p-3 text-[10px] font-medium text-[#4a5a4a] uppercase">Device</th>
                          {receptivityScores.length > 0 && <th className="p-3 text-[10px] font-medium text-[#4a5a4a] uppercase">Score</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e0e0d5]">
                        {loading ? (
                          <tr><td colSpan={5} className="p-10 text-center">
                            <div className="w-6 h-6 border-2 border-[#255531] border-t-transparent rounded-full animate-spin mx-auto" />
                          </td></tr>
                        ) : growers.length === 0 ? (
                          <tr><td colSpan={5} className="p-10 text-center text-[#5a6a5a] text-xs">No growers found</td></tr>
                        ) : growers.map((grower) => {
                          const score = receptivityScores.find(s => s.grower_id === grower.grower_id);
                          return (
                            <tr key={grower.grower_id}
                              className={`hover:bg-[#C2B280] transition-colors cursor-pointer ${selectedGrowers.has(grower.grower_id) ? "bg-[#e8f0e8]" : ""}`}
                              onClick={() => toggleGrower(grower.grower_id)}>
                              <td className="p-3" onClick={e => e.stopPropagation()}>
                                <button onClick={() => toggleGrower(grower.grower_id)} className="flex items-center justify-center">
                                  <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${selectedGrowers.has(grower.grower_id) ? "bg-[#255531] border-[#255531]" : "border-[#b8c8b8]"}`}>
                                    {selectedGrowers.has(grower.grower_id) && (
                                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    )}
                                  </span>
                                </button>
                              </td>
                              <td className="p-3"><div className="text-[11px] font-mono text-[#2a2a24]">{grower.grower_id}</div><div className="text-[10px] text-[#4a5a4a]">{grower.district}, {grower.state}</div></td>
                              <td className="p-3 text-xs capitalize text-[#1a2a1c]">{grower.language}</td>
                              <td className="p-3 text-xs capitalize text-[#1a2a1c]">{grower.device_type}</td>
                              {receptivityScores.length > 0 && (
                                <td className="p-3">{score ? <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${score.receptivity_score >= 70 ? 'bg-[#e0f0e0] text-[#255531]' : score.receptivity_score >= 40 ? 'bg-[#f5f0d0] text-[#5a4510]' : 'bg-[#f5e0d8] text-[#5a2010]'}`}>{score.receptivity_score}</span> : <span className="text-[10px] text-[#5a6a5a]">--</span>}</td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - Campaign Generator */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            <div className="bg-[#CDC098] p-5 rounded-2xl border border-[#B8A878] shadow-lg">
              <div className="flex items-center gap-2 mb-5">
                <svg className="w-4 h-4 text-[#255531]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                <h2 className="text-base font-semibold tracking-tight text-[#2a2a24]">Campaign Generator</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-[#4a5a4a] uppercase tracking-wider block mb-1.5 font-medium">Campaign</label>
                  <select className="w-full bg-[#D5C8A0] border border-[#B8A878] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#255531] transition-colors text-[#2a2a24]"
                    value={selectedCampaign?.id || ""} onChange={(e) => handleCampaignChange(e.target.value)}>
                    <option value="">Choose a campaign</option>
                    {campaigns.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>
                {selectedCampaign && (
                  <div className="p-3 bg-[#D5C8A0] rounded-xl border border-[#B8A878]">
                    <p className="text-xs text-[#1a2a1c] mb-2 leading-relaxed">{selectedCampaign.goal}</p>
                    <div className="flex gap-2">
                      <span className="text-[10px] bg-[#e8f0e8] text-[#255531] px-2 py-0.5 rounded font-medium">{selectedCampaign.product}</span>
                      <span className="text-[10px] bg-[#e8f0e8] text-[#255531] px-2 py-0.5 rounded font-medium">{selectedCampaign.target_crop}</span>
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-[10px] text-[#4a5a4a] uppercase tracking-wider block mb-1.5 font-medium">Product Override</label>
                  <select className="w-full bg-[#D5C8A0] border border-[#B8A878] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#255531] transition-colors text-[#2a2a24]"
                    value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
                    <option value="">Default</option>
                    {products.map((p) => (<option key={p} value={p}>{p}</option>))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[#4a5a4a] uppercase tracking-wider block mb-1.5 font-medium">Language</label>
                  <select className="w-full bg-[#D5C8A0] border border-[#B8A878] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#255531] transition-colors text-[#2a2a24]"
                    value={genLanguage} onChange={(e) => setGenLanguage(e.target.value)}>
                    <option value="">Grower's Language</option>
                    {stats?.languages.map((l: string) => (<option key={l} value={l}>{l}</option>))}
                  </select>
                </div>
                <button
                  className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
                    isGenerating || !selectedCampaign || selectedGrowers.size === 0
                      ? "bg-[#e8e8e0] text-[#5a5a4a] cursor-not-allowed border border-[#B8A878]"
                      : "bg-gradient-to-r from-[#255531] to-[#1a4425] hover:from-[#326c43] hover:to-[#255531] text-white shadow-lg border border-[#255531]/20"
                  }`}
                  onClick={handleGenerate}
                  disabled={isGenerating || !selectedCampaign || selectedGrowers.size === 0}
                >
                  {isGenerating ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </span>
                  ) : selectedGrowers.size === 0
                    ? "Select growers first"
                    : `Generate for ${selectedGrowers.size} grower${selectedGrowers.size > 1 ? "s" : ""}`}
                </button>

                {genError && <div className="p-3 bg-[#fdf0ea] border border-[#e8c8b8] rounded-xl text-xs text-[#5a2010]">{genError}</div>}

                {pushResult && <div className="p-3 bg-[#eaf5ea] border border-[#c8d8c8] rounded-xl text-xs text-[#255531]">{pushResult}</div>}

                {generatedResults.length > 0 && (
                  <div className="pt-1 space-y-2">
                    <button className="w-full py-2.5 bg-gradient-to-r from-[#255531] to-[#1a4425] hover:from-[#326c43] hover:to-[#255531] text-white rounded-xl font-medium text-xs transition-all shadow-lg border border-[#255531]/20"
                      onClick={() => setShowResultsModal(true)}>
                      View Content ({generatedResults.length})
                    </button>
                    <button
                      className={`w-full py-2.5 rounded-xl font-medium text-xs transition-all ${
                        isPushing
                          ? "bg-[#e8e8e0] text-[#5a5a4a] cursor-not-allowed border border-[#B8A878]"
                          : "bg-gradient-to-r from-[#d1a15a] to-[#b8893a] hover:from-[#caa266] hover:to-[#d1a15a] text-white shadow-lg border border-[#d1a15a]/30 font-bold"
                      }`}
                      onClick={handlePushAll} disabled={isPushing}>
                      {isPushing ? "Pushing..." : `Push All (${generatedResults.length})`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* INSIGHTS MODAL */}
      <Modal open={showInsightsModal} onClose={() => setShowInsightsModal(false)} title="Analytics Dashboard">
        <InsightsDashboard />
      </Modal>

      {/* THREAT MODAL */}
      <Modal open={showThreatModal} onClose={() => setShowThreatModal(false)} title="Real-Time Crop Threat Detection">
        <ThreatPanel />
      </Modal>

      {/* CAMPAIGNS MODAL */}
      <Modal open={showCampaignsModal} onClose={() => setShowCampaignsModal(false)} title={
        <div className="flex items-center justify-between w-full pr-4">
          <span>Active Campaigns</span>
          <button
            onClick={(e) => { e.stopPropagation(); setShowNewCampaignForm(true); }}
            className="w-7 h-7 rounded-lg bg-[#255531] hover:bg-[#326c43] text-white flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>
      }>
        {showNewCampaignForm ? (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-[#255531]">New Campaign</h4>
            <div>
              <label className="text-[10px] text-[#4a5a4a] uppercase tracking-wider block mb-1">Name</label>
              <input value={newCampaign.name} onChange={e => setNewCampaign(p => ({...p, name: e.target.value}))}
                className="w-full bg-[#D5C8A0] border border-[#B8A878] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#255531] transition-colors text-[#2a2a24]" placeholder="e.g. Wheat Blast Prevention" />
            </div>
            <div>
              <label className="text-[10px] text-[#4a5a4a] uppercase tracking-wider block mb-1">Product</label>
              <input value={newCampaign.product} onChange={e => setNewCampaign(p => ({...p, product: e.target.value}))}
                list="product-suggestions"
                className="w-full bg-[#D5C8A0] border border-[#B8A878] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#255531] transition-colors text-[#2a2a24]" placeholder="Type or select a product" />
              <datalist id="product-suggestions">
                {products.map(p => <option key={p} value={p} />)}
              </datalist>
            </div>
            <div>
              <label className="text-[10px] text-[#4a5a4a] uppercase tracking-wider block mb-1">Target Crop</label>
              <input value={newCampaign.target_crop} onChange={e => setNewCampaign(p => ({...p, target_crop: e.target.value}))}
                className="w-full bg-[#D5C8A0] border border-[#B8A878] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#255531] transition-colors text-[#2a2a24]" placeholder="e.g. wheat" />
            </div>
            <div>
              <label className="text-[10px] text-[#4a5a4a] uppercase tracking-wider block mb-1">Goal</label>
              <textarea value={newCampaign.goal} onChange={e => setNewCampaign(p => ({...p, goal: e.target.value}))}
                className="w-full bg-[#D5C8A0] border border-[#B8A878] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#255531] transition-colors resize-none h-20 text-[#2a2a24]" placeholder="Campaign goal description..." />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowNewCampaignForm(false)}
                className="flex-1 py-2.5 bg-[#C2B280] hover:bg-[#e0e0d5] rounded-xl text-sm font-medium transition-colors border border-[#B8A878] text-[#1a2a1c]">Cancel</button>
              <button onClick={handleCreateCampaign} disabled={!newCampaign.name.trim() || creatingCampaign}
                className="flex-1 py-2.5 bg-gradient-to-r from-[#255531] to-[#1a4425] hover:from-[#326c43] hover:to-[#255531] text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-[#255531]/20">
                {creatingCampaign ? "Creating..." : "Create"}
              </button>
            </div>
            {newCampaignError && <p className="text-xs text-[#5a2010]">{newCampaignError}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.length === 0 ? (
              <p className="text-center text-sm text-[#5a6a5a] py-8">No campaigns yet. Click + to create one.</p>
            ) : (
              campaigns.map((c) => (
              <div key={c.id} className="p-4 bg-[#D5C8A0] rounded-xl border border-[#B8A878] hover:border-[#b8c8b8] transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-sm text-[#255531]">{c.name}</h4>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] bg-[#e8f0e8] text-[#255531] px-2 py-0.5 rounded font-medium">{c.product}</span>
                    <button onClick={() => handleDeleteCampaign(c.id)}
                      className="p-1 rounded hover:bg-[#f5e0d8] text-[#4a5a4a] hover:text-[#5a2010] transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
                <p className="text-xs text-[#1a2a1c] mb-1">{c.goal}</p>
                <span className="text-[10px] text-[#4a5a4a]">Crop: {c.target_crop}</span>
              </div>
            )))}
          </div>
        )}
      </Modal>

      {/* RESULTS MODAL */}
      <Modal open={showResultsModal} onClose={() => setShowResultsModal(false)} title={`Generated Content (${generatedResults.length})`}>
        <div className="space-y-4">
          {generatedResults.map((result) => (
            <div key={result.grower_id} className="p-4 bg-[#D5C8A0] rounded-xl border border-[#B8A878]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[#255531] uppercase">{result.grower_id}</span>
                <div className="flex gap-2">
                  {result.recommended_channel && (
                    <span className="text-[10px] bg-[#e8f0e8] text-[#255531] px-2 py-0.5 rounded font-medium">{result.recommended_channel.channel}</span>
                  )}
                  {result.recommended_timing && (
                    <span className="text-[10px] bg-[#f5f0d0] text-[#5a4510] px-2 py-0.5 rounded font-medium">{result.recommended_timing.time}</span>
                  )}
                </div>
              </div>
              <div className="text-xs whitespace-pre-wrap leading-relaxed text-[#1a2a1c]">
                {result.content || <span className="text-[#5a2010]">No content</span>}
              </div>
              <button
                className="w-full mt-3 py-2 bg-gradient-to-r from-[#d1a15a] to-[#b8893a] hover:from-[#caa266] hover:to-[#d1a15a] text-white rounded-xl font-medium text-xs transition-all shadow-lg border border-[#d1a15a]/30 font-bold"
                onClick={() => handlePushOne(result)} disabled={isPushing}>
                Push
              </button>
            </div>
          ))}
          {generatedResults.length > 0 && (
            <button
              className={`w-full py-2.5 rounded-xl font-medium text-xs transition-all ${
                isPushing
                  ? "bg-[#e8e8e0] text-[#5a5a4a] cursor-not-allowed border border-[#B8A878]"
                  : "bg-gradient-to-r from-[#255531] to-[#1a4425] hover:from-[#326c43] hover:to-[#255531] text-white shadow-lg border border-[#255531]/20"
              }`}
              onClick={handlePushAll} disabled={isPushing}>
              {isPushing ? "Pushing..." : `Push All (${generatedResults.length})`}
            </button>
          )}
        </div>
      </Modal>

      {/* RECEPTIVITY MODAL */}
      <Modal open={showScoresModal} onClose={() => setShowScoresModal(false)} title="Receptivity Predictions">
        <div className="space-y-3">
          <p className="text-[10px] text-[#4a5a4a] mb-3 leading-relaxed">
            Predicted engagement scores based on historical data, grower profile, and product-crop fit.
          </p>
          {receptivityScores.map((s) => (
            <div key={s.grower_id} className="p-4 bg-[#D5C8A0] rounded-xl border border-[#B8A878]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-[#2a2a24]">{s.grower_id}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${s.receptivity_score >= 70 ? 'bg-[#e0f0e0] text-[#255531]' : s.receptivity_score >= 40 ? 'bg-[#f5f0d0] text-[#5a4510]' : 'bg-[#f5e0d8] text-[#5a2010]'}`}>
                  {s.receptivity_score}/100
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div><span className="text-[#4a5a4a]">Open Rate:</span> <span className="text-[#1a2a1c]">{(s.predicted_open_rate * 100).toFixed(1)}%</span></div>
                <div><span className="text-[#4a5a4a]">Click Rate:</span> <span className="text-[#1a2a1c]">{(s.predicted_click_rate * 100).toFixed(1)}%</span></div>
                <div><span className="text-[#4a5a4a]">Language:</span> <span className="text-[#1a2a1c] capitalize">{s.language}</span></div>
                <div><span className="text-[#4a5a4a]">Device:</span> <span className="text-[#1a2a1c] capitalize">{s.device}</span></div>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
