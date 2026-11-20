# Preserved TestDPC QR generator

This fork preserves [Sanrax's TestDPC QR generator](https://github.com/sanrax/testdpc-qr) at commit `4e2153b0ebb3282dea7b8fcea19b65181f8e5fbb`, captured November 20, 2026. The browser interface and enrollment behavior follow that revision. The default APK URL points to this fork's archived copy of the same official Google APK. The APK is byte-identical to Google's TestDPC 9.0.12 release.

Open [the generator](https://kdoggmdf.github.io/testdpc-qr/). Wi-Fi fields are optional and handled locally in the browser. Generate QR codes containing Wi-Fi passwords privately. The default QR contains the APK URL, full-file checksum, and TestDPC receiver component.

## Archive contents

The pinned [November 20 archive release](https://github.com/kdoggmdf/testdpc-qr/releases/tag/archive-2026-11-20) contains the official APK, its Apache 2.0 license, the original unmodified generator source ZIP, provenance, and SHA-256 checksums. The original generator commit and its MIT license remain in this fork's Git history. The vendored QR encoder retains its own MIT notice.

The original default QR downloads Google's release. This fork's default QR downloads the archived release here. Their APK bytes, checksum, provisioning receiver, and Android setup choices match. The different download URL produces a different QR image.

## Local use

The static site is in `dist`. Open `dist/index.html` directly or serve that directory with a local static server. Generating a QR works offline. A phone performing first-time setup still needs network access to download the APK from the HTTPS URL embedded in the QR.

With Node.js 22 or newer, run `npm test` or `node --test tests/payload.test.cjs`. Generate the default SVG and JSON with `node scripts/generate.cjs --out output`. Dependencies are already vendored.

## Setup choices

On a compatible phone at its initial Welcome screen, tap six times, scan the QR, and select **Use for work & personal** in TestDPC. After setup, open the briefcase-badged TestDPC and confirm it is the profile owner of an organization-owned device. Use **Data wipe → Remove work profile** to relinquish management. The upstream generator recommends leaving the additional wipe options unchecked. **Factory reset device** erases the entire phone.

Physical acceptance depends on the handset and installed firmware. This archive does not establish compatibility with every carrier build. The generator creates a standard Android Enterprise provisioning payload and the APK remains unmodified.
