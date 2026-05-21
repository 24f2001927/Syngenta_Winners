import InsightsDashboard from "../components/InsightsDashboard";
import ThreatPanel from "../components/ThreatPanel";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#C2B280] text-[#2a2a24]">
      <header className="border-b border-[#B8A878] bg-[#CDC098]/95 sticky top-0 z-40">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-[#1a2a1c]">
              Kisaan Kavach
            </h1>
            <p className="text-[9px] font-medium uppercase leading-none tracking-widest text-[#255531]/85">
              Intelligence Dashboard
            </p>
          </div>
          <Link
            href="/"
            className="rounded-xl border border-[#255531]/20 bg-[#255531] px-4 py-2 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[#326c43]"
          >
            Home
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        <section className="min-w-0">
          <InsightsDashboard />
        </section>
        <aside className="rounded-xl border border-[#B8A878] bg-[#CDC098] p-4 shadow-lg">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-[#1a2a1c]">
              Threat Detection
            </h2>
            <p className="text-xs text-[#2a3a2a]">
              Analyze crop disease reports against weather, trust, and historical risk signals.
            </p>
          </div>
          <ThreatPanel />
        </aside>
      </div>
    </main>
  );
}
