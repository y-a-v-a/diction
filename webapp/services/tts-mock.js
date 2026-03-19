import fs from 'fs';

// Minimal valid MP3: ID3v2 header + one silent MPEG frame
// This is enough for <audio> elements to load without errors
const SILENT_MP3 = Buffer.from([
  // ID3v2.3 header
  0x49, 0x44, 0x33, 0x03, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,
  // MPEG1 Layer3 frame header: 44100Hz, 128kbps, stereo
  0xFF, 0xFB, 0x90, 0x00,
  // 413 bytes of silence (frame payload for 128kbps)
  ...new Array(413).fill(0x00)
]);

export async function generateSpeech(text, outputPath) {
  fs.writeFileSync(outputPath, SILENT_MP3);
}

export function delay(ms) {
  // No-op in test mode
}
