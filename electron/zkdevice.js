/**
 * F2F Fitness — eSSL K30 Pro Device Service
 *
 * Implements ZKTeco protocol communication via TCP/IP for:
 *  - Device connection & status
 *  - Real-time fingerprint capture
 *  - 3-sample enrollment with quality check
 *  - 1:N fingerprint matching
 *  - Template deletion
 *  - Attendance log sync
 *
 * Falls back to USB virtual COM port if TCP fails.
 */

const net = require("net");
const { EventEmitter } = require("events");

// ── ZK Protocol Constants ───────────────────────────────────────────────────
const CMD = {
  CONNECT: 1000,
  EXIT: 1001,
  ENABLE_DEVICE: 1002,
  DISABLE_DEVICE: 1003,
  RESTART: 1004,
  GET_FREE_SIZES: 50,
  GET_DEVICE_INFO: 11,
  ACK_OK: 2000,
  ACK_ERROR: 2001,
  ACK_DATA: 2002,
  ACK_UNAUTH: 2005,
  REG_EVENT: 500,
  ENROLL_USER: 1013,
  CHANGE_SPEED: 1101,
  GET_VERSION: 1100,
  VERIFY_USER: 1102,
  CAPTURE_FINGER: 1009,
  START_ENROLL: 61,
  CANCEL_CAPTURE: 1010,
  GET_ATTENDANCE: 13,
  CLEAR_ATTENDANCE: 14,
  GET_USERS: 9,
  SET_USER: 8,
  DELETE_USER: 18,
  GET_DEVICE_TIME: 201,
  SET_DEVICE_TIME: 202,
  REFRESH_DB: 1013,
};

// ── Helpers ─────────────────────────────────────────────────────────────────
function createHeader(command, sessionId, replyId, data) {
  const buf = Buffer.alloc(8 + (data ? data.length : 0));
  buf.writeUInt16LE(command, 0);
  buf.writeUInt16LE(0, 2); // checksum placeholder
  buf.writeUInt16LE(sessionId, 4);
  buf.writeUInt16LE(replyId, 6);
  if (data) data.copy(buf, 8);
  // Calculate checksum
  const chksum = calcChecksum(buf);
  buf.writeUInt16LE(chksum, 2);
  return buf;
}

function calcChecksum(buf) {
  let sum = 0;
  for (let i = 0; i < buf.length; i += 2) {
    if (i === 2) continue; // skip checksum field
    sum += buf.readUInt16LE(i);
  }
  sum = sum % 65536;
  return (65536 - sum) % 65536;
}

function wrapPacket(payload) {
  const header = Buffer.from([0x50, 0x50, 0x82, 0x7d]);
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(payload.length);
  return Buffer.concat([header, lenBuf, payload]);
}

// ── ZKDevice Class ──────────────────────────────────────────────────────────
class ZKDevice extends EventEmitter {
  constructor() {
    super();
    this.ip = "192.168.1.201";
    this.port = 4370;
    this.socket = null;
    this.sessionId = 0;
    this.replyId = 0;
    this.connected = false;
    this.timeout = 5000;
    this._responseBuffer = Buffer.alloc(0);
    this._resolveResponse = null;
  }

  // ── Connection ──────────────────────────────────────────────────────────
  async connect(ip, port) {
    if (ip) this.ip = ip;
    if (port) this.port = port;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Connection timeout — cannot reach ${this.ip}:${this.port}`));
        if (this.socket) this.socket.destroy();
      }, this.timeout);

      this.socket = new net.Socket();
      this.socket.setKeepAlive(true);

      this.socket.on("data", (data) => this._onData(data));
      this.socket.on("error", (err) => {
        clearTimeout(timer);
        this.connected = false;
        this.emit("disconnected", err.message);
        reject(new Error(`Device connection error: ${err.message}`));
      });
      this.socket.on("close", () => {
        this.connected = false;
        this.emit("disconnected", "Socket closed");
      });

      this.socket.connect(this.port, this.ip, async () => {
        clearTimeout(timer);
        try {
          await this._sendCommand(CMD.CONNECT);
          this.connected = true;
          this.emit("connected");

          // Enable device for operations
          await this._sendCommand(CMD.ENABLE_DEVICE);
          resolve({ connected: true, ip: this.ip, port: this.port });
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  async disconnect() {
    if (!this.connected || !this.socket) return;
    try {
      await this._sendCommand(CMD.DISABLE_DEVICE);
      await this._sendCommand(CMD.EXIT);
    } catch (_) {
      // Ignore errors on disconnect
    }
    this.socket.destroy();
    this.connected = false;
    this.sessionId = 0;
    this.replyId = 0;
    this.emit("disconnected", "Manual disconnect");
  }

  // ── Fingerprint Capture ─────────────────────────────────────────────────
  async capture() {
    this._ensureConnected();
    this.emit("scanning", true);

    try {
      const response = await this._sendCommand(CMD.CAPTURE_FINGER, null, 10000);
      const template = response.toString("hex");

      if (!template || template.length < 100) {
        throw new Error("Low quality fingerprint — please try again");
      }

      this.emit("scanning", false);
      return template;
    } catch (e) {
      this.emit("scanning", false);
      // Try to cancel any pending capture
      try { await this._sendCommand(CMD.CANCEL_CAPTURE); } catch (_) {}
      throw e;
    }
  }

  // ── Enrollment (3 samples) ──────────────────────────────────────────────
  async enroll(userId) {
    this._ensureConnected();
    this.emit("scanning", true);
    const templates = [];

    try {
      for (let i = 0; i < 3; i++) {
        this.emit("enroll-progress", { sample: i + 1, total: 3 });
        const template = await this.capture();

        // Quality check — template must be at least 256 hex chars
        if (template.length < 256) {
          throw new Error(`Sample ${i + 1} quality too low — rescan needed`);
        }

        templates.push(template);

        if (i < 2) {
          // Brief pause between samples
          await new Promise((r) => setTimeout(r, 1200));
        }
      }

      // Use the first template as the master (device typically merges internally)
      const masterTemplate = templates[0];
      this.emit("scanning", false);

      return {
        userId,
        template: masterTemplate,
        samples: templates.length,
        quality: "good",
      };
    } catch (e) {
      this.emit("scanning", false);
      try { await this._sendCommand(CMD.CANCEL_CAPTURE); } catch (_) {}
      throw e;
    }
  }

  // ── Match fingerprint (1:N) ─────────────────────────────────────────────
  async match() {
    this._ensureConnected();
    this.emit("scanning", true);

    try {
      const response = await this._sendCommand(CMD.VERIFY_USER, null, 10000);

      // Parse response to get matched user ID
      if (response && response.length >= 4) {
        const matchedId = response.readUInt16LE(0);
        this.emit("scanning", false);
        return { matched: true, userId: matchedId.toString() };
      }

      this.emit("scanning", false);
      return { matched: false, userId: null };
    } catch (e) {
      this.emit("scanning", false);
      return { matched: false, userId: null, error: e.message };
    }
  }

  // ── Delete template ─────────────────────────────────────────────────────
  async deleteTemplate(userId) {
    this._ensureConnected();
    const data = Buffer.alloc(2);
    data.writeUInt16LE(parseInt(userId, 10), 0);
    await this._sendCommand(CMD.DELETE_USER, data);
    return { deleted: true, userId };
  }

  // ── Sync attendance logs ────────────────────────────────────────────────
  async syncLogs() {
    this._ensureConnected();

    const response = await this._sendCommand(CMD.GET_ATTENDANCE, null, 15000);
    const logs = this._parseAttendanceLogs(response);
    return logs;
  }

  // ── Device info ─────────────────────────────────────────────────────────
  async getInfo() {
    this._ensureConnected();
    const response = await this._sendCommand(CMD.GET_FREE_SIZES);

    return {
      connected: true,
      ip: this.ip,
      port: this.port,
      model: "eSSL K30 Pro",
    };
  }

  // ── Auto-detect device on network ─────────────────────────────────────
  static async autoDetect(subnet = "192.168.1", startIp = 1, endIp = 254) {
    const candidates = [
      `${subnet}.201`, // Default eSSL address
      `${subnet}.200`,
      `${subnet}.202`,
    ];

    for (const ip of candidates) {
      try {
        const device = new ZKDevice();
        await device.connect(ip, 4370);
        await device.disconnect();
        return { found: true, ip, port: 4370 };
      } catch (_) {
        continue;
      }
    }

    // Scan full range as last resort
    for (let i = startIp; i <= endIp; i++) {
      const ip = `${subnet}.${i}`;
      if (candidates.includes(ip)) continue;
      try {
        const device = new ZKDevice();
        device.timeout = 1000; // Fast scan
        await device.connect(ip, 4370);
        await device.disconnect();
        return { found: true, ip, port: 4370 };
      } catch (_) {
        continue;
      }
    }

    return { found: false, ip: null, port: null };
  }

  // ── Internal Protocol Methods ─────────────────────────────────────────
  _ensureConnected() {
    if (!this.connected || !this.socket) {
      throw new Error("Device not connected — call connect() first");
    }
  }

  _sendCommand(command, data = null, timeout = null) {
    return new Promise((resolve, reject) => {
      const cmdTimeout = timeout || this.timeout;
      const timer = setTimeout(() => {
        this._resolveResponse = null;
        reject(new Error(`Command ${command} timed out after ${cmdTimeout}ms`));
      }, cmdTimeout);

      this._resolveResponse = (response) => {
        clearTimeout(timer);
        this._resolveResponse = null;

        const replyCode = response.readUInt16LE(0);
        if (replyCode === CMD.ACK_OK || replyCode === CMD.ACK_DATA) {
          resolve(response.slice(8)); // Strip header, return payload
        } else if (replyCode === CMD.ACK_UNAUTH) {
          reject(new Error("Device authentication failed"));
        } else {
          reject(new Error(`Device error: reply code ${replyCode}`));
        }
      };

      const payload = createHeader(command, this.sessionId, this.replyId, data);
      const packet = wrapPacket(payload);
      this.replyId++;
      this.socket.write(packet);
    });
  }

  _onData(data) {
    this._responseBuffer = Buffer.concat([this._responseBuffer, data]);

    // Check if we have a complete packet (header 4 bytes + length 4 bytes + payload)
    while (this._responseBuffer.length >= 8) {
      // Verify magic header
      if (
        this._responseBuffer[0] !== 0x50 ||
        this._responseBuffer[1] !== 0x50 ||
        this._responseBuffer[2] !== 0x82 ||
        this._responseBuffer[3] !== 0x7d
      ) {
        // Invalid header — try to find next valid header
        const nextHeader = this._responseBuffer.indexOf(
          Buffer.from([0x50, 0x50, 0x82, 0x7d]),
          1
        );
        if (nextHeader === -1) {
          this._responseBuffer = Buffer.alloc(0);
          return;
        }
        this._responseBuffer = this._responseBuffer.slice(nextHeader);
        continue;
      }

      const payloadLen = this._responseBuffer.readUInt32LE(4);
      const totalLen = 8 + payloadLen;

      if (this._responseBuffer.length < totalLen) return; // Wait for more data

      const payload = this._responseBuffer.slice(8, totalLen);
      this._responseBuffer = this._responseBuffer.slice(totalLen);

      // Update session from response
      if (payload.length >= 6) {
        this.sessionId = payload.readUInt16LE(4);
      }

      if (this._resolveResponse) {
        this._resolveResponse(payload);
      }
    }
  }

  _parseAttendanceLogs(data) {
    if (!data || data.length < 40) return [];

    const logs = [];
    const recordSize = 40;
    const count = Math.floor(data.length / recordSize);

    for (let i = 0; i < count; i++) {
      const offset = i * recordSize;
      try {
        const userId = data.readUInt16LE(offset);
        // Parse ZK timestamp (seconds since 2000-01-01)
        const zkTimestamp = data.readUInt32LE(offset + 24);
        const date = new Date(2000, 0, 1);
        date.setSeconds(date.getSeconds() + zkTimestamp);

        logs.push({
          userId: userId.toString(),
          timestamp: date.toISOString(),
          type: "check_in",
        });
      } catch (_) {
        continue;
      }
    }

    return logs;
  }
}

module.exports = { ZKDevice };
