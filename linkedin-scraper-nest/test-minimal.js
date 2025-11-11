const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const fs = require('fs');

async function testMinimalPdf() {
  console.log('Testing minimal PDF with no CSS...');

  // Absolutely minimal HTML - no CSS at all
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body>
  <h1>TEST HEADING</h1>
  <p>This is plain text with no CSS styling at all.</p>
  <p>If you cannot see this text in the PDF, there is a fundamental Puppeteer/Chromium issue.</p>
  <div>Another test div with text</div>
  <span>Test span text</span>
  <table border="1">
    <tr>
      <td>Cell 1</td>
      <td>Cell 2</td>
    </tr>
  </table>
</body>
</html>
  `;

  let browser;
  try {
    console.log('Launching browser with args:', chromium.args);
    console.log('Executable path:', await chromium.executablePath());

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    console.log('Browser launched');

    const page = await browser.newPage();

    // Set content
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    console.log('Content set');

    // Take a screenshot first to see if content is visible
    const screenshot = await page.screenshot({ fullPage: true });
    fs.writeFileSync('./test-screenshot.png', screenshot);
    console.log('Screenshot saved to test-screenshot.png');

    // Generate PDF
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
    });

    fs.writeFileSync('./test-minimal.pdf', pdf);
    console.log('✅ PDF saved to test-minimal.pdf');
    console.log('PDF size:', pdf.length, 'bytes');

    console.log('\nPlease check:');
    console.log('1. test-screenshot.png - Does it show text?');
    console.log('2. test-minimal.pdf - Does it show text?');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testMinimalPdf()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
