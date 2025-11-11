import * as fs from 'fs';
import * as path from 'path';

const FONT_FAMILY = 'EmbeddedUbuntu';
const DEFAULT_FONT_PATH = path.resolve(
  process.cwd(),
  'fonts',
  'UbuntuMonoVar.ttf',
);

let cachedFontFace: string | null = null;

export const EMBEDDED_FONT_FAMILY = FONT_FAMILY;

export function getEmbeddedFontFace(): string {
  if (cachedFontFace) {
    return cachedFontFace;
  }

  const fontPath = process.env.PDF_EMBED_FONT_PATH || DEFAULT_FONT_PATH;

  try {
    const fontBuffer = fs.readFileSync(fontPath);
    const fontBase64 = fontBuffer.toString('base64');

    cachedFontFace = `
@font-face {
  font-family: '${FONT_FAMILY}';
  font-style: normal;
  font-weight: 400;
  src: url('data:font/truetype;charset=utf-8;base64,${fontBase64}') format('truetype');
}
    `.trim();
  } catch (error) {
    // If embedding fails, fall back to browser defaults but avoid repeated I/O
    cachedFontFace = '';
    console.warn(
      `[PdfGenerator] Failed to load embedded font from ${fontPath}:`,
      error,
    );
  }

  return cachedFontFace;
}
