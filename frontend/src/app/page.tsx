"use client";

import React from "react";
import Link from "next/link";

export default function HomePage() {
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
                <p className="text-[9px] text-[#255531]/85 leading-none tracking-widest uppercase font-medium">AI Shield for Indian Agriculture</p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-gradient-to-r from-[#255531] to-[#1a4425] hover:from-[#326c43] hover:to-[#255531] text-white rounded-xl text-sm font-semibold transition-all shadow-lg border border-[#255531]/20"
            >
              Launch Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center max-w-3xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#255531] to-[#1a4425] flex items-center justify-center shadow-xl shadow-[#255531]/30 ring-1 ring-[#d1a15a]/20 mx-auto mb-6">
              <svg className="w-8 h-8 text-[#d1a15a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-[#1a2a1c] tracking-tight mb-4">
              Kisaan Kavach
            </h2>
            <p className="text-lg md:text-xl text-[#1a2a1c] mb-2">
              AI Shield for Indian Agriculture
            </p>
            <p className="text-sm text-[#2a3a2a] max-w-xl mx-auto leading-relaxed">
              A scalable, AI-powered agricultural marketing and threat intelligence platform for Syngenta India.
              Combines a LangGraph Bayesian threat detection pipeline with a personalized campaign engine.
            </p>
          </div>
        </section>

        {/* FEATURES */}
        <section className="border-t border-[#B8A878] py-12">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="text-xl font-bold text-[#1a2a1c] text-center mb-10">Platform Capabilities</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeatureCard
                icon={
                  <svg className="w-6 h-6 text-[#d1a15a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                }
                title="Real-Time Threat Detection"
                description="9-node LangGraph Bayesian pipeline that ingests field reports, extracts crop-disease entities via NVIDIA LLM, cross-verifies against live weather data, and outputs probabilistic risk maps with automated mitigation prescriptions."
              />
              <FeatureCard
                icon={
                  <svg className="w-6 h-6 text-[#d1a15a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>
                }
                title="Personalized Campaign Engine"
                description="LLM-powered message generation across WhatsApp, SMS, and Voice in regional languages. Each message is tailored to the grower's crop, farm size, device type, and active pest threats."
              />
              <FeatureCard
                icon={
                  <svg className="w-6 h-6 text-[#d1a15a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                }
                title="Analytics & Insights"
                description="6-tab analytics dashboard with SVG charts covering grower device distribution, farm segments, marketing funnel, supply chain stockout risk, territory balance, and WhatsApp sales impact."
              />
            </div>
          </div>
        </section>

        {/* KEY METRICS */}
        <section className="border-t border-[#B8A878] py-12">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="text-xl font-bold text-[#1a2a1c] text-center mb-10">Impact by the Numbers</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <MetricBig value="6,000+" label="Growers Reached" />
              <MetricBig value="10" label="States Covered" />
              <MetricBig value="6" label="Languages Supported" />
              <MetricBig value="9" label="Threat Detection Nodes" />
            </div>
          </div>
        </section>

        {/* CONTACT / SYNGENTA INFO */}
        <section className="border-t border-[#B8A878] py-12">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-[#CDC098] rounded-2xl border border-[#B8A878] shadow-lg p-8 max-w-2xl mx-auto text-center">
              <h3 className="text-xl font-bold text-[#1a2a1c] mb-4">Powered by Syngenta India</h3>
              <p className="text-sm text-[#1a2a1c] mb-6 leading-relaxed">
                Syngenta India is a leading agricultural technology company committed to improving food security
                through innovative crop protection solutions, seeds, and digital farming technologies.
                Kisaan Kavach is a hackathon project built for the Syngenta IITM Hackathon 2026.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                <div className="bg-[#D5C8A0] rounded-xl p-4 border border-[#B8A878]">
                  <p className="text-[10px] text-[#2a3a2a] uppercase tracking-wider font-medium mb-1">Contact</p>
                  <p className="text-sm font-medium text-[#255531]">Ayush Verma</p>
                  <p className="text-xs text-[#1a2a1c]">Syngenta India</p>
                </div>
                <div className="bg-[#D5C8A0] rounded-xl p-4 border border-[#B8A878]">
                  <p className="text-[10px] text-[#2a3a2a] uppercase tracking-wider font-medium mb-1">Email</p>
                  <p className="text-sm font-medium text-[#255531]">Ayush.Verma</p>
                  <p className="text-xs text-[#1a2a1c]">@syngenta.com</p>
                </div>
                <div className="bg-[#D5C8A0] rounded-xl p-4 border border-[#B8A878]">
                  <p className="text-[10px] text-[#2a3a2a] uppercase tracking-wider font-medium mb-1">Event</p>
                  <p className="text-sm font-medium text-[#255531]">IITM Hackathon</p>
                  <p className="text-xs text-[#1a2a1c]">Season: Rabi 2025-26</p>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-[#B8A878]">
                <Link
                  href="/dashboard"
                  className="inline-flex px-6 py-3 bg-gradient-to-r from-[#255531] to-[#1a4425] hover:from-[#326c43] hover:to-[#255531] text-white rounded-xl text-sm font-semibold transition-all shadow-lg border border-[#255531]/20"
                >
                  Launch Dashboard
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-[#B8A878] py-6 mt-6">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-xs text-[#2a3a2a]">
              Kisaan Kavach — Syngenta IITM Hackathon 2026. Confidential dataset. All data © Syngenta India.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-[#CDC098] rounded-2xl border border-[#B8A878] shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div className="w-10 h-10 rounded-xl bg-[#255531]/20 flex items-center justify-center mb-3">
        {icon}
      </div>
      <h4 className="text-base font-semibold text-[#1a2a1c] mb-2">{title}</h4>
      <p className="text-xs text-[#1a2a1c] leading-relaxed">{description}</p>
    </div>
  );
}

function MetricBig({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-[#CDC098] rounded-2xl border border-[#B8A878] shadow-lg p-6 text-center">
      <p className="text-2xl md:text-3xl font-bold text-[#255531]">{value}</p>
      <p className="text-xs text-[#2a3a2a] mt-1 uppercase tracking-wider">{label}</p>
    </div>
  );
}
