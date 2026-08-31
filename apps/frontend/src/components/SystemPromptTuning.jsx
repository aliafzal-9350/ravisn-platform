import { useEffect, useState } from "react";
import { Sliders, Save, RotateCcw, Send, Sparkles, CheckCircle2, AlertCircle, Bot } from "lucide-react";
import { api } from "../lib/api";

export default function SystemPromptTuning() {
  const [prompt, setPrompt] = useState("");
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState("");
  const [error, setError] = useState("");

  // Live Simulator state
  const [testMessage, setTestMessage] = useState("Hi! What are your business hours and how can I book?");
  const [testing, setTesting] = useState(false);
  const [simulatedReply, setSimulatedReply] = useState(null);

  useEffect(() => {
    loadPrompt();
  }, []);

  async function loadPrompt() {
    setLoading(true);
    try {
      const res = await api.getSystemPrompt();
      setTemplates(res.default_templates || []);
      if (res.system_prompt) {
        setPrompt(res.system_prompt);
      } else if (res.default_templates && res.default_templates.length > 0) {
        setPrompt(res.default_templates[0].prompt);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    if (e) e.preventDefault();
    setSaving(true);
    setError("");
    setSavedSuccess("");

    try {
      const res = await api.saveSystemPrompt(prompt);
      setSavedSuccess(res.message || "Custom System Prompt saved successfully!");
      if (res.system_prompt) setPrompt(res.system_prompt);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleTestPrompt(e) {
    e.preventDefault();
    if (!testMessage.trim()) return;
    setTesting(true);
    setSimulatedReply(null);
    try {
      const res = await api.testSystemPrompt(prompt, testMessage);
      setSimulatedReply(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setTesting(false);
    }
  }

  function applyTemplate(templatePrompt) {
    setPrompt(templatePrompt);
    setSavedSuccess("Template applied! Click 'Save System Prompt' to activate it.");
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent-soft text-accent">
            <Sliders size={22} />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold">System Prompt Tuning</h1>
            <p className="text-ink-muted text-sm mt-0.5">
              Control your AI agent's personality, tone of voice, booking behavior, and customer rules.
            </p>
          </div>
        </div>
      </div>

      {savedSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 p-4 flex items-center gap-3 text-sm">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          <span>{savedSuccess}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-4 flex items-center justify-between gap-3 text-sm font-medium">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => { setError(""); loadPrompt(); }}
            className="text-xs bg-red-100 text-red-800 hover:bg-red-200 px-3 py-1.5 rounded-lg transition font-medium border border-red-300 shrink-0"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Preset Templates */}
      <div>
        <h2 className="text-sm font-medium text-ink mb-3 flex items-center gap-2">
          <Sparkles size={16} className="text-accent" />
          Quick Preset Templates
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              onClick={() => applyTemplate(tpl.prompt)}
              className="rounded-xl border border-line bg-surface p-4 hover:border-accent hover:shadow-sm cursor-pointer transition flex flex-col justify-between group"
            >
              <div>
                <h3 className="font-medium text-sm text-ink group-hover:text-accent transition">{tpl.name}</h3>
                <p className="text-xs text-ink-muted mt-1 leading-relaxed">{tpl.description}</p>
              </div>
              <button
                type="button"
                className="mt-3 text-xs font-medium text-accent hover:underline text-left"
              >
                Use this template →
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Prompt Editor */}
      <form onSubmit={handleSave} className="rounded-xl border border-line bg-surface p-5 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">Custom System Prompt & Instructions</label>
            <span className="text-xs text-ink-muted">Use <code className="bg-bg px-1.5 py-0.5 rounded text-accent font-mono">{"{tenant_name}"}</code> as company name placeholder</span>
          </div>
          <textarea
            required
            rows={10}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition font-mono text-sm leading-relaxed"
            placeholder="Type your system rules, persona, tone of voice, and guidelines here..."
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              if (templates.length > 0) setPrompt(templates[0].prompt);
            }}
            className="flex items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-ink-muted hover:bg-bg transition"
          >
            <RotateCcw size={15} />
            Reset Default
          </button>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-accent text-white text-sm font-medium px-5 py-2.5 hover:opacity-90 transition disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? "Saving Changes…" : "Save System Prompt"}
          </button>
        </div>
      </form>

      {/* Live Prompt Simulator */}
      <div className="rounded-xl border border-line bg-surface p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
            <Bot size={18} className="text-accent" />
            Live Prompt Simulator
          </h2>
          <p className="text-xs text-ink-muted mt-1">
            Test how your AI agent will respond using your custom system prompt and Knowledge Base before saving!
          </p>
        </div>

        <form onSubmit={handleTestPrompt} className="flex gap-2">
          <input
            type="text"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Type a sample customer question..."
            className="flex-1 rounded-lg border border-line px-3.5 py-2.5 outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft text-sm transition"
          />
          <button
            type="submit"
            disabled={testing || !testMessage.trim()}
            className="flex items-center gap-2 rounded-lg bg-accent text-white text-sm font-medium px-4 py-2.5 hover:opacity-90 transition disabled:opacity-60"
          >
            <Send size={15} />
            {testing ? "Testing…" : "Test Prompt"}
          </button>
        </form>

        {simulatedReply && (
          <div className="rounded-xl border border-accent/20 bg-accent-soft/30 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-ink-muted font-medium border-b border-line pb-2">
              <span>Simulated AI Response</span>
              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                Active Custom Prompt
              </span>
            </div>
            <p className="text-sm text-ink font-medium leading-relaxed">{simulatedReply.reply}</p>

            {simulatedReply.booking_ready && (
              <div className="text-xs bg-surface border border-line rounded-lg p-3 text-ink space-y-1 mt-2">
                <span className="font-semibold text-accent block">📅 Booking Intent Detected:</span>
                <p>Name: {simulatedReply.booking_info?.name || "Not provided"}</p>
                <p>Contact: {simulatedReply.booking_info?.contact || "Not provided"}</p>
                <p>Preferred Time: {simulatedReply.booking_info?.preferred_time || "Not provided"}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
