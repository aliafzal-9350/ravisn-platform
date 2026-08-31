require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sessionManager = require("./sessionManager");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.get("/health", (req, res) => {
  res.json({ status: "ok", mock_mode: sessionManager.MOCK_MODE });
});

app.post("/sessions/:tenantId/start", async (req, res) => {
  try {
    const entry = await sessionManager.startSession(req.params.tenantId);
    res.json({ status: entry.status, qr: entry.qr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/sessions/:tenantId/status", (req, res) => {
  res.json(sessionManager.getStatus(req.params.tenantId));
});

app.post("/sessions/:tenantId/send", async (req, res) => {
  try {
    const { to, body } = req.body;
    await sessionManager.sendMessage(req.params.tenantId, to, body);
    res.json({ status: "sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/sessions/:tenantId", async (req, res) => {
  await sessionManager.disconnectSession(req.params.tenantId);
  res.json({ status: "disconnected" });
});

// dev/testing only - lets you simulate a customer's message without a real
// phone, useful for trying out the pipeline before going live
app.post("/sessions/:tenantId/simulate-incoming", async (req, res) => {
  const { sender, name, text } = req.body;
  if (!sender || !text) {
    return res.status(400).json({ error: "sender and text are required" });
  }
  await sessionManager.forwardMessage(req.params.tenantId, sender, name || null, text);
  res.json({ status: "forwarded" });
});

app.listen(PORT, () => {
  console.log(`whatsapp-qr-service listening on ${PORT} (mock mode: ${sessionManager.MOCK_MODE})`);
});
