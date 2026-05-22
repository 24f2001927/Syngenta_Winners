"use client";

import React, { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface AnalysisData {
  grower_devices?: { device_type: string; count: number }[];
  grower_devices_total?: number;
  grower_segments?: { farm_segment: string; count: number }[];
  marketing_funnel?: {
    campaign_crop: string;
    total_impressions: number;
    total_visits: number;
    total_leads: number;
    avg_visit_rate: number;
    avg_lead_rate: number;
  }[];
  funnel_totals?: {
    total_impressions: number;
    total_visits: number;
    total_leads: number;
  };
  rep_activity?: {
    total_reps: number;
    total_visits: number;
    avg_visits: number;
    max_visits: number;
    min_visits: number;
  };
  supply_chain?: {
    sku_name: string;
    sku_qty: number;
    sales_velocity: number;
    stockout_risk: number;
  }[];
  supply_summary?: {
    total_sku_qty: number;
    avg_sales_velocity: number;
    avg_stockout_risk: number;
    highest_stockout: string;
  };
  territory_balance?: {
    total_territories: number;
    total_retailers: number;
    avg_retailers_per_territory: number;
    max_retailers: number;
    min_retailers: number;
  };
  whatsapp_sales?: {
    campaign_product: string;
    total_clicks: number;
    total_sales: number;
    transaction_count: number;
  }[];
  whatsapp_totals?: {
    total_sales: number;
    total_transactions: number;
    total_clicks: number;
  };
}

function HorizontalBar({ data, valueKey, labelKey, color, maxWidth = 280 }: {
  data: any[];
  valueKey: string;
  labelKey: string;
  color: string;
  maxWidth?: number;
}) {
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#1a2a1c] capitalize">{d[labelKey]}</span>
            <span className="text-[#2a3a2a]">{d[valueKey]}</span>
          </div>
          <div className="h-2 bg-[#C2B280] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(d[valueKey] / max) * 100}%`,
                background: color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data, valueKey, labelKey, size = 160 }: {
  data: any[];
  valueKey: string;
  labelKey: string;
  size?: number;
}) {
  const total = data.reduce((s, d) => s + d[valueKey], 0) || 1;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.35;
  const strokeW = size * 0.12;
  const colors = ["#255531", "#d1a15a", "#6c8b72", "#8a7530", "#c08060", "#5a7a5a", "#B8A878"];

  let cum = 0;
  const slices = data.map((d, i) => {
    const pct = d[valueKey] / total;
    const angle = pct * 360;
    const start = cum;
    cum += angle;
    const startRad = ((start - 90) * Math.PI) / 180;
    const endRad = ((cum - 90) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const large = angle > 180 ? 1 : 0;
    return { path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`, color: colors[i % colors.length], label: d[labelKey], val: d[valueKey] };
  });

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} opacity="0.85" />
        ))}
        <circle cx={cx} cy={cy} r={r * 0.55} fill="#CDC098" />
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#2a2a24" fontSize="13" fontWeight="bold">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#6a7a6a" fontSize="9">Total</text>
      </svg>
      <div className="flex flex-wrap gap-3 mt-2 justify-center">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-1 text-xs">
            <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
            <span className="text-[#1a2a1c]">{s.label}</span>
            <span className="text-[#2a3a2a]">{s.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FunnelChart({ data }: {
  data: { campaign_crop: string; total_impressions: number; total_visits: number; total_leads: number }[];
}) {
  const maxImp = Math.max(...data.map(d => d.total_impressions), 1);
  return (
    <div className="space-y-4">
      {data.map((d, i) => {
        const w1 = (d.total_impressions / maxImp) * 100;
        const w2 = (d.total_visits / maxImp) * 100;
        const w3 = (d.total_leads / maxImp) * 100;
        return (
          <div key={i}>
            <p className="text-xs text-[#1a2a1c] mb-1 capitalize font-medium">{d.campaign_crop}</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-2.5 rounded-l-full" style={{ width: `${w1}%`, background: "linear-gradient(90deg, #255531, #6c8b72)", opacity: 0.7 }} />
                <span className="text-[10px] text-[#2a3a2a] w-16">{d.total_impressions.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5" style={{ width: `${w2}%`, background: "linear-gradient(90deg, #d1a15a, #caa266)", opacity: 0.7 }} />
                <span className="text-[10px] text-[#2a3a2a] w-16">{d.total_visits.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 rounded-r-full" style={{ width: `${w3}%`, background: "linear-gradient(90deg, #8a7530, #b89840)", opacity: 0.7 }} />
                <span className="text-[10px] text-[#2a3a2a] w-16">{d.total_leads.toLocaleString()}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function InsightsDashboard() {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log(`Fetching from: ${API_URL}/analysis`);
        
        const response = await fetch(`${API_URL}/analysis`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(`Failed to connect to backend: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#255531] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 font-semibold">Connection Error</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <p className="text-red-600 text-sm mt-2">API URL: {API_URL}</p>
      </div>
    );
  }

  if (!data) {
    return <div className="text-[#2a3a2a] text-center py-10">Failed to load insights.</div>;
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "growers", label: "Growers" },
    { id: "marketing", label: "Marketing" },
    { id: "supply", label: "Supply Chain" },
    { id: "territory", label: "Territory" },
    { id: "sales", label: "WhatsApp Sales" },
  ];

  return (
    <div className="space-y-5">
      {/* Tab Navigation */}
      <div className="flex gap-1 bg-[#D5C8A0] rounded-xl p-1 border border-[#B8A878] overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === t.id ? "bg-[#255531] text-white" : "text-[#1a2a1c] hover:text-[#2a2a24]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Growers" value={data.grower_devices_total?.toLocaleString() || "---"} color="from-[#255531] to-[#1a4425]" />
            <StatCard label="Total Rep Visits" value={data.rep_activity?.total_visits?.toLocaleString() || "---"} color="from-[#6c8b72] to-[#4a6a52]" />
            <StatCard label="Marketing Leads" value={data.funnel_totals?.total_leads?.toLocaleString() || "---"} color="from-[#d1a15a] to-[#b8893a]" />
            <StatCard label="WhatsApp Sales" value={`₹${(data.whatsapp_totals?.total_sales || 0).toLocaleString()}`} color="from-[#8a7530] to-[#6a5520]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#CDC098] rounded-xl p-4 border border-[#B8A878]">
              <h4 className="text-sm font-semibold mb-3 text-[#2a2a24]">Grower Device Distribution</h4>
              {data.grower_devices && data.grower_devices.length > 0 ? (
                <DonutChart data={data.grower_devices} valueKey="count" labelKey="device_type" size={180} />
              ) : (
                <p className="text-xs text-[#2a3a2a]">No data</p>
              )}
            </div>
            <div className="bg-[#CDC098] rounded-xl p-4 border border-[#B8A878]">
              <h4 className="text-sm font-semibold mb-3 text-[#2a2a24]">Rep Activity</h4>
              {data.rep_activity ? (
                <div className="grid grid-cols-2 gap-3 text-center">
                  <MetricBox value={data.rep_activity.total_reps.toString()} label="Total Reps" />
                  <MetricBox value={data.rep_activity.avg_visits.toString()} label="Avg Visits" />
                  <MetricBox value={data.rep_activity.max_visits.toString()} label="Max Visits" />
                  <MetricBox value={data.rep_activity.min_visits.toString()} label="Min Visits" />
                </div>
              ) : (
                <p className="text-xs text-[#2a3a2a]">No data</p>
              )}
            </div>
          </div>

          {data.supply_summary && (
            <div className="bg-[#CDC098] rounded-xl p-4 border border-[#B8A878]">
              <h4 className="text-sm font-semibold mb-3 text-[#2a2a24]">Supply Chain Snapshot</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricBox value={data.supply_summary.total_sku_qty.toString()} label="Total SKU Qty" unit="" />
                <MetricBox value={data.supply_summary.avg_sales_velocity.toString()} label="Avg Velocity" />
                <MetricBox value={data.supply_summary.avg_stockout_risk.toString()} label="Avg Stockout Risk" />
                <MetricBox value={data.supply_summary.highest_stockout} label="Highest Risk SKU" small />
              </div>
            </div>
          )}
        </div>
      )}

      {/* GROWERS TAB */}
      {activeTab === "growers" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#CDC098] rounded-xl p-4 border border-[#B8A878]">
              <h4 className="text-sm font-semibold mb-3 text-[#2a2a24]">Device Types</h4>
              {data.grower_devices && data.grower_devices.length > 0 ? (
                <DonutChart data={data.grower_devices} valueKey="count" labelKey="device_type" size={180} />
              ) : (
                <p className="text-xs text-[#2a3a2a]">No data</p>
              )}
            </div>
            <div className="bg-[#CDC098] rounded-xl p-4 border border-[#B8A878]">
              <h4 className="text-sm font-semibold mb-3 text-[#2a2a24]">Farm Segments</h4>
              {data.grower_segments && data.grower_segments.length > 0 ? (
                <HorizontalBar
                  data={data.grower_segments}
                  valueKey="count"
                  labelKey="farm_segment"
                  color="linear-gradient(90deg, #255531, #6c8b72)"
                />
              ) : (
                <p className="text-xs text-[#2a3a2a]">No data</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MARKETING TAB */}
      {activeTab === "marketing" && (
        <div className="space-y-4">
          {data.funnel_totals && (
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Total Impressions" value={data.funnel_totals.total_impressions.toLocaleString()} color="from-[#255531] to-[#1a4425]" />
              <StatCard label="Total Visits" value={data.funnel_totals.total_visits.toLocaleString()} color="from-[#6c8b72] to-[#4a6a52]" />
              <StatCard label="Total Leads" value={data.funnel_totals.total_leads.toLocaleString()} color="from-[#d1a15a] to-[#b8893a]" />
            </div>
          )}
          <div className="bg-[#CDC098] rounded-xl p-4 border border-[#B8A878]">
            <h4 className="text-sm font-semibold mb-3 text-[#2a2a24]">Campaign Funnel by Crop</h4>
            {data.marketing_funnel && data.marketing_funnel.length > 0 ? (
              <FunnelChart data={data.marketing_funnel} />
            ) : (
              <p className="text-xs text-[#2a3a2a]">No data</p>
            )}
          </div>
        </div>
      )}

      {/* SUPPLY CHAIN TAB */}
      {activeTab === "supply" && (
        <div className="space-y-4">
          {data.supply_summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricBox value={data.supply_summary.total_sku_qty.toString()} label="Total SKU Qty" />
              <MetricBox value={data.supply_summary.avg_sales_velocity.toString()} label="Avg Sales Velocity" />
              <MetricBox value={data.supply_summary.avg_stockout_risk.toString()} label="Avg Stockout Risk" />
              <MetricBox value={data.supply_summary.highest_stockout} label="Highest Risk" small />
            </div>
          )}
          <div className="bg-[#CDC098] rounded-xl p-4 border border-[#B8A878]">
            <h4 className="text-sm font-semibold mb-3 text-[#2a2a24]">Stockout Risk by Product</h4>
            {data.supply_chain && data.supply_chain.length > 0 ? (
              <div className="space-y-2">
                {data.supply_chain.map((s, i) => {
                  const maxRisk = Math.max(...data.supply_chain!.map(x => x.stockout_risk), 1);
                  const pct = (s.stockout_risk / maxRisk) * 100;
                  const color = pct > 80 ? "#c08060" : pct > 60 ? "#d1a15a" : "#6c8b72";
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-[#1a2a1c]">{s.sku_name}</span>
                        <span className="text-[#2a3a2a]">{s.stockout_risk}</span>
                      </div>
                      <div className="h-2 bg-[#C2B280] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[#2a3a2a]">No data</p>
            )}
          </div>
        </div>
      )}

      {/* TERRITORY TAB */}
      {activeTab === "territory" && data.territory_balance && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricBox value={data.territory_balance.total_territories.toString()} label="Total Territories" />
            <MetricBox value={data.territory_balance.total_retailers.toString()} label="Total Retailers" />
            <MetricBox value={data.territory_balance.avg_retailers_per_territory.toString()} label="Avg Retailers/Territory" />
            <MetricBox value={data.territory_balance.max_retailers.toString()} label="Max Retailers" />
          </div>
        </div>
      )}

      {/* WHATSAPP SALES TAB */}
      {activeTab === "sales" && (
        <div className="space-y-4">
          {data.whatsapp_totals && (
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Total Sales" value={`₹${data.whatsapp_totals.total_sales.toLocaleString()}`} color="from-[#8a7530] to-[#6a5520]" />
              <StatCard label="Transactions" value={data.whatsapp_totals.total_transactions.toLocaleString()} color="from-[#255531] to-[#1a4425]" />
              <StatCard label="Total Clicks" value={data.whatsapp_totals.total_clicks.toLocaleString()} color="from-[#6c8b72] to-[#4a6a52]" />
            </div>
          )}
          <div className="bg-[#CDC098] rounded-xl p-4 border border-[#B8A878]">
            <h4 className="text-sm font-semibold mb-3 text-[#2a2a24]">Sales by Product</h4>
            {data.whatsapp_sales && data.whatsapp_sales.length > 0 ? (
              <HorizontalBar
                data={data.whatsapp_sales}
                valueKey="total_sales"
                labelKey="campaign_product"
                color="linear-gradient(90deg, #8a7530, #b89840)"
              />
            ) : (
              <p className="text-xs text-[#2a3a2a]">No data</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-xl p-4 border border-white/10`}>
      <p className="text-[10px] uppercase tracking-wider opacity-80 mb-1 text-white">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function MetricBox({ value, label, small, unit }: { value: string; label: string; small?: boolean; unit?: string }) {
  return (
    <div className="bg-[#D5C8A0] rounded-lg p-3 border border-[#B8A878]">
      <p className={`font-bold text-[#2a2a24] ${small ? "text-xs truncate" : "text-lg"}`}>{value}{unit || ""}</p>
      <p className="text-[10px] text-[#2a3a2a] uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}
