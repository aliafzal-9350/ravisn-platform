import { useState, useEffect } from "react";
import { api } from "../lib/api";
import WhatsAppQrConnect from "./WhatsAppQrConnect";

function ChannelCard({ badge, badgeColor, title, statusNote, onDisconnect, children }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm"
            style={{ backgroundColor: `color-mix(in srgb, ${badgeColor} 12%, transparent)`, color: badgeColor }}
          >
            {badge}
          </div>
          <div>
            <p className="font-medium text-sm">{title}</p>
            {statusNote && <p className="text-xs text-ink-muted mt-0.5">{statusNote}</p>}
          </div>
        </div>
        {onDisconnect && (
          <button
            type="button"
            onClick={onDisconnect}
            className="text-xs text-red-600 font-medium hover:underline border border-line px-2.5 py-1 rounded-lg hover:bg-red-50 transition"
          >
            Disconnect
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function ManualConnectForm({ fields, onConnect, connected }) {
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onConnect(values);
      setValues({});
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" autoComplete="off">
      {/* Hidden dummy inputs to prevent browser password managers from autofilling user credentials */}
      <input type="text" name="prevent_autofill" style={{ display: "none" }} tabIndex={-1} />
      <input type="password" name="prevent_autofill_pass" style={{ display: "none" }} tabIndex={-1} />
      {fields.map((f) => (
        <div key={f.key}>
          <label className="block text-xs font-medium text-ink-muted mb-1">{f.label}</label>
          <input
            name={`token_${f.key}`}
            id={`token_${f.key}`}
            required={f.required !== false}
            type={f.type || "text"}
            autoComplete="off"
            value={values[f.key] || ""}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition font-mono"
            placeholder={f.placeholder}
          />
        </div>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-accent text-white text-sm font-medium px-4 py-2 hover:opacity-90 transition disabled:opacity-60"
      >
        {saving ? "Connecting…" : connected ? "Reconnect" : "Connect"}
      </button>
    </form>
  );
}

export default function Connect() {
  const [waOfficial, setWaOfficial] = useState(null);
  const [fb, setFb] = useState(null);
  const [ig, setIg] = useState(null);

  useEffect(() => {
    async function loadConnections() {
      try {
        const conns = await api.listChannels();
        for (const c of conns) {
          if (c.status === "connected") {
            if (c.channel === "whatsapp" && c.connection_method === "official_api") {
              setWaOfficial(c);
            } else if (c.channel === "facebook") {
              setFb(c);
            } else if (c.channel === "instagram") {
              setIg(c);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load channel connections:", err);
      }
    }
    loadConnections();
  }, []);

  async function handleDisconnectChannel(conn, setConnState) {
    if (!conn || !conn.id) return;
    try {
      await api.disconnectChannel(conn.id);
      setConnState(null);
    } catch (err) {
      console.error("Failed to disconnect channel:", err);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="font-display text-xl font-semibold mb-1">Connect</h1>
      <p className="text-ink-muted text-sm mb-6">Link your messaging channels.</p>

      <ChannelCard
        badge="W"
        badgeColor="#0f9d74"
        title="Whatsapp — official cloud api"
        statusNote={waOfficial ? `Connected · ${waOfficial.external_account_id}` : "Not connected"}
        onDisconnect={waOfficial ? () => handleDisconnectChannel(waOfficial, setWaOfficial) : null}
      >
        <ManualConnectForm
          fields={[
            { key: "phone_number_id", label: "Phone number id", placeholder: "From your Meta app → WhatsApp → API setup" },
            { key: "access_token", label: "Access token", type: "password", placeholder: "Temporary or permanent token" },
            { key: "waba_id", label: "Waba id (optional)", required: false },
          ]}
          connected={waOfficial}
          onConnect={async (values) => setWaOfficial(await api.connectWhatsAppOfficial(values))}
        />
        <p className="text-xs text-ink-muted mt-3">
          One-click setup (embedded signup) needs RAVISN's Meta Tech Provider approval first.
          Until then, paste these values from your Meta app dashboard to test.
        </p>
      </ChannelCard>

      <ChannelCard badge="W" badgeColor="#0f9d74" title="Whatsapp — qr code">
        <WhatsAppQrConnect />
      </ChannelCard>

      <ChannelCard
        badge="F"
        badgeColor="#3b6fe0"
        title="Facebook"
        statusNote={fb ? `Connected · page ${fb.external_account_id}` : "Not connected"}
        onDisconnect={fb ? () => handleDisconnectChannel(fb, setFb) : null}
      >
        <ManualConnectForm
          fields={[
            { key: "page_id", label: "Page id", placeholder: "From your Meta app → Messenger → API setup" },
            { key: "access_token", label: "Page access token", type: "password" },
          ]}
          connected={fb}
          onConnect={async (values) => setFb(await api.connectFacebook(values))}
        />
        <p className="text-xs text-ink-muted mt-3">
          Until RAVISN's app has passed App Review for page messaging, this only works
          for pages where you've been added as an admin or tester on the app.
        </p>
      </ChannelCard>

      <ChannelCard
        badge="I"
        badgeColor="#d14d72"
        title="Instagram"
        statusNote={ig ? `Connected · ${ig.external_account_id}` : "Not connected"}
        onDisconnect={ig ? () => handleDisconnectChannel(ig, setIg) : null}
      >
        <ManualConnectForm
          fields={[
            { key: "ig_business_account_id", label: "Instagram business account id", placeholder: "From your Meta app → Instagram → API setup" },
            { key: "access_token", label: "Access token", type: "password" },
          ]}
          connected={ig}
          onConnect={async (values) => setIg(await api.connectInstagram(values))}
        />
      </ChannelCard>
    </div>
  );
}
