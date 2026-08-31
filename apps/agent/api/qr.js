const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");
const os = require("os");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const tenantId = req.query.tenant_id || "default";
  const tmpDir = os.tmpdir();
  const sessionPath = path.join(tmpDir, "wa-sessions", tenantId);

  try {
    fs.mkdirSync(sessionPath, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const sock = makeWASocket({ auth: state, printQRInTerminal: false });
    sock.ev.on("creds.update", saveCreds);

    const result = await new Promise((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({ status: "error", error: "Timeout waiting for WhatsApp Web QR code" });
        }
      }, 7000);

      sock.ev.on("connection.update", async (update) => {
        const { qr } = update;
        if (qr && !resolved) {
          resolved = true;
          clearTimeout(timeout);
          try {
            const dataUrl = await QRCode.toDataURL(qr);
            resolve({ status: "qr_pending", qr: dataUrl });
          } catch (err) {
            resolve({ status: "error", error: err.message });
          }
        }
      });
    });

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ status: "error", error: err.message });
  }
};
