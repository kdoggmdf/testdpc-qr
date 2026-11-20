/* Shared provisioning and QR logic. Works in a browser or Node.js. */
(function (root) {
  'use strict';
  const PREFIX = 'android.app.extra.PROVISIONING_';
  const DEFAULTS = Object.freeze({
    version: '9.0.12',
    component: 'com.afwsamples.testdpc/com.afwsamples.testdpc.DeviceAdminReceiver',
    apkUrl: 'https://github.com/kdoggmdf/testdpc-qr/releases/download/archive-2026-11-20/TestDPC_9.0.12.apk',
    // SHA-256 of the complete, unmodified release APK (not its signing certificate).
    sha256: 'aad38c1f608b1c7289405c4e866977f5d231502643ce2e2401a7c305808f9c00'
  });

  function checksumFromHex(hex) {
    if (!/^[a-f\d]{64}$/i.test(hex)) throw new Error('Enter a SHA-256 checksum: 64 hex characters.');
    const bytes = hex.match(/../g).map(pair => parseInt(pair, 16));
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function normalizeChecksum(value) {
    const clean = String(value || '').trim();
    if (/^[a-f\d]{64}$/i.test(clean)) return checksumFromHex(clean);
    if (!/^[A-Za-z\d_-]{43}=?$/.test(clean)) {
      throw new Error('Use a SHA-256 checksum in hex or URL-safe Base64 format.');
    }
    const raw = atob(clean.replace(/-/g, '+').replace(/_/g, '/') + (clean.endsWith('=') ? '' : '='));
    const hex = Array.from(raw, char => char.charCodeAt(0).toString(16).padStart(2, '0')).join('');
    const normalized = checksumFromHex(hex);
    if (normalized !== clean.replace(/=+$/, '')) throw new Error('The checksum is not valid URL-safe Base64.');
    return normalized;
  }

  function buildPayload(options = {}) {
    const apkUrl = String(options.apkUrl ?? DEFAULTS.apkUrl).trim();
    let url;
    try { url = new URL(apkUrl); } catch { throw new Error('Enter a valid HTTPS download URL for the APK.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.hash) {
      throw new Error('Use an HTTPS APK URL without login credentials or a fragment.');
    }
    const checksum = normalizeChecksum(options.checksum ?? DEFAULTS.sha256);
    const payload = {
      [PREFIX + 'DEVICE_ADMIN_COMPONENT_NAME']: DEFAULTS.component,
      [PREFIX + 'DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION']: apkUrl,
      [PREFIX + 'DEVICE_ADMIN_PACKAGE_CHECKSUM']: checksum
    };
    if (options.wifi?.enabled) {
      const { ssid, security, password = '', hidden = false } = options.wifi;
      const ssidBytes = new TextEncoder().encode(ssid || '').length;
      if (ssidBytes < 1 || ssidBytes > 32) throw new Error('The Wi-Fi name must be between 1 and 32 UTF-8 bytes.');
      if (!['WPA', 'NONE'].includes(security)) throw new Error('Choose WPA/WPA2 Personal or an open network.');
      if (security === 'WPA') {
        const length = new TextEncoder().encode(password).length;
        if (!((length >= 8 && length <= 63) || /^[a-f\d]{64}$/i.test(password))) {
          throw new Error('A WPA password needs 8–63 UTF-8 bytes, or a 64-character hex key.');
        }
      }
      payload[PREFIX + 'WIFI_SSID'] = ssid;
      payload[PREFIX + 'WIFI_SECURITY_TYPE'] = security;
      if (security !== 'NONE') payload[PREFIX + 'WIFI_PASSWORD'] = password;
      if (hidden) payload[PREFIX + 'WIFI_HIDDEN'] = true;
    }
    // The DPC chooses the provisioning mode in ACTION_GET_PROVISIONING_MODE.
    // A QR extra cannot force stock TestDPC to choose COPE. The user selects
    // "Use for work & personal" during the setup-wizard flow.
    return payload;
  }

  function makeQr(payload, encoder) {
    const factory = encoder || root.qrcode;
    if (!factory) throw new Error('The QR encoder could not load. Reload the page.');
    factory.stringToBytes = text => Array.from(new TextEncoder().encode(text));
    const text = JSON.stringify(payload);
    const qr = factory(0, 'M');
    try {
      qr.addData(text, 'Byte');
      qr.make();
    } catch {
      throw new Error('This payload is too large for a QR code. Shorten the APK URL or omit Wi-Fi.');
    }
    return { qr, text };
  }

  function toSvg(qr) {
    const modules = qr.getModuleCount();
    const side = modules + 8; // Four-module quiet zone on every side.
    const path = [];
    for (let row = 0; row < modules; row++) {
      for (let col = 0; col < modules; col++) {
        if (qr.isDark(row, col)) path.push(`M${col + 4} ${row + 4}h1v1h-1z`);
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${side * 6}" height="${side * 6}" viewBox="0 0 ${side} ${side}" shape-rendering="crispEdges" role="img" aria-label="TestDPC enrollment QR code"><rect width="${side}" height="${side}" fill="white"/><path d="${path.join('')}" fill="black"/></svg>`;
  }

  const api = { DEFAULTS, buildPayload, normalizeChecksum, checksumFromHex, makeQr, toSvg };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CopeQR = api;
})(typeof globalThis === 'undefined' ? this : globalThis);
