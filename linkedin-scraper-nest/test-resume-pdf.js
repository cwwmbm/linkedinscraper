const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Copy of the markdownToHtml function from the service
function markdownToHtml(text) {
  if (!text) return '<p>No content available</p>';

  let html = text;

  // Headers (must come before other replacements)
  html = html.replace(/^### (.*)$/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*)$/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*)$/gim, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Unordered lists (bullet points)
  html = html.replace(/^\* (.*)$/gim, '<li>$1</li>');
  html = html.replace(/^- (.*)$/gim, '<li>$1</li>');

  // Wrap consecutive list items in <ul>
  html = html.replace(/(<li>.*?<\/li>\s*)+/gs, (match) => '<ul>' + match + '</ul>');

  // Convert double line breaks to paragraph breaks
  html = html.replace(/\n\n+/g, '</p><p>');

  // Convert single line breaks to <br>
  html = html.replace(/\n/g, '<br>');

  // Wrap everything in paragraphs if not already wrapped
  if (!html.includes('<h1>') && !html.includes('<h2>') && !html.includes('<h3>')) {
    html = '<p>' + html + '</p>';
  }

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}

function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

async function testResumeFromDb() {
  console.log('Testing resume PDF generation with real data...\n');

  const db = new sqlite3.Database('./data/my_database.db.backup_2025-10-22_211444180Z', sqlite3.OPEN_READONLY);

  // Get a job with a resume
  const job = await new Promise((resolve, reject) => {
    db.get(
      'SELECT id, title, company, location, resume FROM jobs WHERE resume IS NOT NULL LIMIT 1',
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  db.close();

  if (!job) {
    console.log('❌ No jobs with resumes found in database');
    return;
  }

  console.log('Found job:');
  console.log('- ID:', job.id);
  console.log('- Title:', job.title);
  console.log('- Company:', job.company);
  console.log('- Resume length:', job.resume ? job.resume.length : 0, 'characters');
  console.log('\nFirst 500 characters of resume:');
  console.log('---');
  console.log(job.resume.substring(0, 500));
  console.log('---\n');

  // Convert resume to HTML
  const resumeHtml = markdownToHtml(job.resume);

  console.log('Converted HTML (first 500 characters):');
  console.log('---');
  console.log(resumeHtml.substring(0, 500));
  console.log('---\n');

  // Save HTML for inspection
  fs.writeFileSync('./test-resume-raw.txt', job.resume);
  fs.writeFileSync('./test-resume-converted.html', resumeHtml);
  console.log('Saved raw resume to: test-resume-raw.txt');
  console.log('Saved converted HTML to: test-resume-converted.html\n');

  // Create full HTML document
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume - ${job.title} at ${job.company}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #fff;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      border-bottom: 3px solid #2c3e50;
      padding-bottom: 15px;
      margin-bottom: 25px;
    }

    .header h1 {
      color: #2c3e50;
      font-size: 28px;
      margin-bottom: 8px;
    }

    .job-info {
      color: #555;
      font-size: 14px;
      font-style: italic;
    }

    .job-info strong {
      color: #2c3e50;
    }

    .content {
      font-size: 11pt;
      line-height: 1.7;
      color: #333;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .content h1, .content h2, .content h3 {
      color: #2c3e50;
      margin-top: 18px;
      margin-bottom: 10px;
      font-weight: 600;
    }

    .content h1 {
      font-size: 20px;
      border-bottom: 2px solid #ecf0f1;
      padding-bottom: 5px;
    }

    .content h2 {
      font-size: 18px;
      border-bottom: 1px solid #ecf0f1;
      padding-bottom: 3px;
    }

    .content h3 {
      font-size: 16px;
    }

    .content p {
      margin-bottom: 12px;
      line-height: 1.6;
    }

    .content ul {
      margin-left: 25px;
      margin-bottom: 12px;
      list-style-type: disc;
    }

    .content li {
      margin-bottom: 6px;
    }

    .content strong {
      color: #2c3e50;
      font-weight: 600;
    }

    .footer {
      margin-top: 40px;
      padding-top: 15px;
      border-top: 1px solid #ecf0f1;
      text-align: center;
      color: #95a5a6;
      font-size: 10px;
    }

    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Tailored Resume</h1>
      <div class="job-info">
        <strong>Position:</strong> ${escapeHtml(job.title)} at ${escapeHtml(job.company)}
        ${job.location ? `<br><strong>Location:</strong> ${escapeHtml(job.location)}` : ''}
      </div>
    </div>

    <div class="content">
      ${resumeHtml}
    </div>

    <div class="footer">
      Generated on ${new Date().toLocaleDateString()} | Tailored for ${escapeHtml(job.title)}
    </div>
  </div>
</body>
</html>
  `.trim();

  // Save full HTML for inspection
  fs.writeFileSync('./test-resume-full.html', html);
  console.log('Saved full HTML to: test-resume-full.html\n');

  // Generate PDF
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

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

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

    fs.writeFileSync('./test-resume-output.pdf', pdf);
    console.log('✅ PDF generated successfully!');
    console.log('PDF size:', pdf.length, 'bytes');
    console.log('Saved to: test-resume-output.pdf\n');
    console.log('Please check the PDF to see if content is visible.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (browser) await browser.close();
  }
}

testResumeFromDb()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
