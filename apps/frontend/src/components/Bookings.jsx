import { useEffect, useState } from "react";
import { api } from "../lib/api";

const TABS = [
  { key: "whatsapp", label: "Whatsapp" },
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
];

function formatDate(isoString) {
  if (!isoString) return "—";
  const withZ = isoString.endsWith("Z") ? isoString : isoString + "Z";
  return new Date(withZ).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function Bookings() {
  const [tab, setTab] = useState("whatsapp");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .listBookings(tab)
      .then(setBookings)
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="font-display text-xl font-semibold mb-1">Bookings</h1>
      <p className="text-ink-muted text-sm mb-6">
        Customer details captured when a booking is made, organised by channel.
      </p>

      <div className="flex border-b border-line mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm border-b-2 transition ${
              tab === t.key
                ? "border-ink text-ink font-medium"
                : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 text-ink-muted text-sm">
          No bookings yet on this channel. Once the agent captures one during a
          conversation, it'll show up here.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-muted border-b border-line">
                <th className="font-medium px-4 py-2.5">Name</th>
                <th className="font-medium px-4 py-2.5">Contact</th>
                <th className="font-medium px-4 py-2.5">Preferred time</th>
                <th className="font-medium px-4 py-2.5">Notes</th>
                <th className="font-medium px-4 py-2.5">Captured</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-3 font-medium">{b.name || "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">{b.contact || "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">{b.preferred_time || "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">{b.notes || "—"}</td>
                  <td className="px-4 py-3 text-ink-muted whitespace-nowrap">{formatDate(b.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
