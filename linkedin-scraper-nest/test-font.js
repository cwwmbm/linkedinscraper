const fs = require('fs');
const path = require('path');

let cachedFontFace = null;

function getEmbeddedFontFace() {
  if (cachedFontFace) {
    return cachedFontFace;
  }

  const fontFamily = 'EmbeddedUbuntu';
  const fontPath = path.resolve(__dirname, 'fonts', 'UbuntuMonoVar.ttf');
  const fontBuffer = fs.readFileSync(fontPath);
  const fontBase64 = fontBuffer.toString('base64');

  cachedFontFace = `
@font-face {
  font-family: '${fontFamily}';
  font-style: normal;
  font-weight: 400;
  src: url('data:font/truetype;charset=utf-8;base64,${fontBase64}') format('truetype');
}
`;

  return cachedFontFace;
}

module.exports = {
  getEmbeddedFontFace,
};
