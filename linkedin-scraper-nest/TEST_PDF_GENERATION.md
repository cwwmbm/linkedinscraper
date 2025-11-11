# PDF Generation Testing Scripts

This directory contains two test scripts to debug PDF generation issues.

## Test Scripts

### 1. `test-pdf.js` - Basic PDF Generation Test

Tests if Puppeteer and Chromium are working correctly with a simple HTML document.

**Purpose**: Verify that the PDF generation infrastructure (Puppeteer + Chromium) is functional.

**Usage**:
```bash
node test-pdf.js
```

**Expected Output**:
- Console messages showing browser launch and PDF generation
- `test-output.pdf` file (should be ~37KB with visible content)

**What it tests**:
- Puppeteer can launch
- Chromium executable is accessible
- Basic HTML → PDF conversion works
- CSS styling is applied correctly

---

### 2. `test-resume-pdf.js` - Real Resume Data Test

Tests PDF generation using actual resume data from the database with the same code as the NestJS service.

**Purpose**: Test the complete PDF generation pipeline with real data to identify where content might be lost.

**Usage**:
```bash
node test-resume-pdf.js
```

**Expected Output**:
- Console showing resume data being loaded
- First 500 characters of raw resume text
- First 500 characters of converted HTML
- Multiple output files:
  - `test-resume-raw.txt` - Raw resume text from database
  - `test-resume-converted.html` - HTML after markdown conversion
  - `test-resume-full.html` - Complete HTML document sent to Puppeteer
  - `test-resume-output.pdf` - Final PDF (should be ~83KB with visible content)

**What it tests**:
- Database connection and data retrieval
- Markdown to HTML conversion
- Full HTML document generation
- PDF generation with actual resume content
- The exact same `markdownToHtml()` function used in the service

---

## Debugging Workflow

### If both tests produce blank PDFs:
The issue is likely in the markdown conversion or HTML structure.

**Steps**:
1. Open `test-resume-full.html` in a browser
2. Check if content is visible in the browser
3. If visible in browser but not in PDF → Issue with Puppeteer rendering
4. If not visible in browser → Issue with HTML generation

### If test-pdf.js works but test-resume-pdf.js produces blank PDF:
The issue is specific to resume content processing.

**Steps**:
1. Check `test-resume-raw.txt` to see the original resume format
2. Check `test-resume-converted.html` to see the markdown conversion result
3. Look for malformed HTML (unclosed tags, nested paragraphs, etc.)
4. Open `test-resume-full.html` in a browser to verify styling

### If tests work but NestJS service produces blank PDF:
The issue is in how the NestJS service calls the PDF generator.

**Steps**:
1. Add logging to `PdfGeneratorService.generateResumePdf()`
2. Log the HTML being generated before sending to Puppeteer
3. Compare with the HTML in `test-resume-full.html`
4. Check if the job data is being retrieved correctly

---

## Common Issues

### Issue: `SQLITE_CANTOPEN` error
**Solution**: The database path in `test-resume-pdf.js` needs to be updated to point to your actual database file.

Current line:
```javascript
const db = new sqlite3.Database('./data/my_database.db.backup_2025-10-22_211444180Z', sqlite3.OPEN_READONLY);
```

Update to your database path (check `.env` for `DB_PATH`).

### Issue: "No jobs with resumes found"
**Solution**: Generate a resume for at least one job first using the API:
```bash
curl -X POST http://localhost:3000/api/jobs/1/resume
```

### Issue: PDF is generated but blank
**Possible causes**:
1. **Malformed HTML** - Check `test-resume-converted.html` for syntax errors
2. **CSS issues** - Check if `printBackground: true` is set in PDF options
3. **Font issues** - Fallback fonts might not be loading
4. **Content visibility** - Text might be white on white background

---

## Expected File Sizes

For reference, successful test runs should produce files around these sizes:

- `test-output.pdf`: ~37 KB (simple test)
- `test-resume-output.pdf`: ~80-100 KB (with full resume content)
- `test-resume-raw.txt`: ~2-5 KB (raw resume text)
- `test-resume-converted.html`: ~5-10 KB (HTML markup)
- `test-resume-full.html`: ~10-15 KB (complete document with CSS)

If PDF files are significantly smaller (<10 KB), they likely contain only the header/footer without content.

---

## Dependencies

Both scripts require:
- `puppeteer-core` - Headless browser control
- `@sparticuz/chromium` - Chromium binary for serverless environments
- `sqlite3` - Database access (only for test-resume-pdf.js)

These are already in `package.json` if you installed the NestJS dependencies.

---

## Next Steps After Testing

1. **If tests pass**: The issue is in the NestJS service integration
   - Check `PdfGeneratorService.generateResumePdf()`
   - Verify job data is being loaded correctly
   - Add debug logging to see what HTML is being generated

2. **If tests fail**: The issue is in the PDF generation code itself
   - Review the `markdownToHtml()` function
   - Check HTML structure in generated files
   - Test with simpler content to isolate the issue

3. **For blank PDFs**: Open `test-resume-full.html` in multiple browsers
   - Chrome/Edge - to see what Puppeteer should render
   - Firefox/Safari - to check for browser-specific issues
   - If content is visible in browser, issue is with Puppeteer rendering settings
