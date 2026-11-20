'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const core = require('../dist/core.js');
const qrcode = require('../dist/vendor/qrcode.js');
const manifest = require('../archive-manifest.json');
const prefix = 'android.app.extra.PROVISIONING_';

test('default QR uses the pinned backup APK with the official full-file checksum', () => {
  const payload = core.buildPayload();
  assert.equal(payload[prefix + 'DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION'], manifest.apk.backupUrl);
  assert.equal(core.DEFAULTS.sha256, manifest.apk.sha256);
  assert.equal(payload[prefix + 'DEVICE_ADMIN_PACKAGE_CHECKSUM'], 'qtOMH2CLHHKJQFxOhml39dIxUCZDzi4kAafDBYCPnAA');
  assert.equal(payload[prefix + 'DEVICE_ADMIN_COMPONENT_NAME'], 'com.afwsamples.testdpc/com.afwsamples.testdpc.DeviceAdminReceiver');
  assert.equal(Object.keys(payload).length, 3);
});

test('default payload has no Wi-Fi credentials, MDM tenant, or forced management mode', () => {
  const payload = core.buildPayload();
  assert.ok(Object.keys(payload).every(key => key.startsWith(prefix)));
  assert.ok(!JSON.stringify(payload).includes('WIFI'));
  assert.ok(!JSON.stringify(payload).includes('ENROLLMENT_TOKEN'));
  assert.ok(!JSON.stringify(payload).includes('PROVISIONING_MODE'));
});

test('private Wi-Fi options stay in the payload and are excluded when disabled', () => {
  const wifi = { enabled: true, ssid: 'Test network', security: 'WPA', password: 'test-fixture-only', hidden: true };
  const payload = core.buildPayload({ wifi });
  assert.equal(payload[prefix + 'WIFI_SSID'], wifi.ssid);
  assert.equal(payload[prefix + 'WIFI_PASSWORD'], wifi.password);
  assert.equal(payload[prefix + 'WIFI_HIDDEN'], true);
  assert.equal(Object.keys(core.buildPayload({ wifi: { ...wifi, enabled: false } })).length, 3);
});

test('invalid URLs, checksums, and Wi-Fi input are rejected', () => {
  for (const apkUrl of ['http://host/test.apk', 'https://name:password@host/test.apk', 'https://host/test.apk#part']) {
    assert.throws(() => core.buildPayload({ apkUrl }));
  }
  assert.throws(() => core.buildPayload({ checksum: 'incorrect' }));
  assert.throws(() => core.buildPayload({ wifi: { enabled: true, ssid: '', security: 'NONE' } }));
  assert.throws(() => core.buildPayload({ wifi: { enabled: true, ssid: 'Test', security: 'WPA', password: 'short' } }));
});

test('SVG encodes both original and mirror payloads with a quiet zone', () => {
  for (const apkUrl of [manifest.apk.originalUrl, manifest.apk.backupUrl]) {
    const payload = core.buildPayload({ apkUrl });
    const { qr, text } = core.makeQr(payload, qrcode);
    assert.deepEqual(JSON.parse(text), payload);
    const svg = core.toSvg(qr);
    assert.match(svg, /shape-rendering="crispEdges"/);
    assert.ok(svg.includes(`viewBox="0 0 ${qr.getModuleCount() + 8} ${qr.getModuleCount() + 8}"`));
  }
});

test('static scripts are local and the site blocks network submissions', () => {
  const html = fs.readFileSync(require('node:path').join(__dirname, '../dist/index.html'), 'utf8');
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /form-action 'none'/);
  for (const match of html.matchAll(/<script\b[^>]*src="([^"]+)"/g)) assert.ok(!match[1].includes('://'));
});

test('displayed removal choices follow the owner-confirmed Reddit procedure', () => {
  const html = fs.readFileSync(require('node:path').join(__dirname, '../dist/index.html'), 'utf8');
  assert.match(html, /select <strong>External storage<\/strong> and <strong>Factory reset protection<\/strong>/);
  assert.match(html, /work-profile TestDPC → Data wipe → Remove work profile/);
});
