const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const fs = require('fs');

async function generateTestPdf() {
  console.log('Starting PDF generation test...');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Test PDF</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 40px;
      color: #333;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    p {
      line-height: 1.6;
      margin: 20px 0;
    }
    .box {
      background: #f0f0f0;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <h1>PDF Generation Test</h1>

  <p>This is a simple test to verify that Puppeteer and Chromium are working correctly.</p>

  <div class="box">
    <h2>Test Content</h2>
    <p><strong>Bold text</strong> and <em>italic text</em> should be visible.</p>
    <ul>
      <li>First bullet point</li>
      <li>Second bullet point</li>
      <li>Third bullet point</li>
    </ul>
  </div>

  <p>If you can see this text in the PDF, then Puppeteer is working correctly!</p>

  <p>Sample resume text:</p>
  <p>
    John Doe<br>
    Software Engineer<br>
    john.doe@example.com<br>
    <br>
    EXPERIENCE<br>
    Senior Developer at Tech Corp (2020-2023)<br>
    - Led team of 5 developers<br>
    - Implemented microservices architecture<br>
    - Improved system performance by 40%
  </p>
</body>
</html>
  `;

  let browser;

  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: {
        width: 1280,
        height: 720,
      },
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    console.log('Browser launched successfully');

    const page = await browser.newPage();
    console.log('New page created');

    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });
    console.log('HTML content set');

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '15mm',
        right: '15mm',
      },
    });

    console.log('PDF generated, size:', pdf.length, 'bytes');

    // Save to file
    fs.writeFileSync('./test-output.pdf', pdf);
    console.log('PDF saved to ./test-output.pdf');
    console.log('✅ Success! Check the test-output.pdf file.');

  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
  }
}

generateTestPdf()
  .then(() => {
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
