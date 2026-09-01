#!/usr/bin/env python3
"""
Cypress vs Playwright Comparison PDF Generator
Generates a professional PDF comparison table
"""

import subprocess
import sys
from pathlib import Path

def generate_pdf_from_html():
    """Generate PDF from HTML file using wkhtmltopdf or similar"""
    
    html_file = Path(__file__).parent / "cypress-vs-playwright-comparison.html"
    pdf_file = Path(__file__).parent / "cypress-vs-playwright-comparison.pdf"
    
    if not html_file.exists():
        print(f"❌ Error: HTML file not found at {html_file}")
        return False
    
    # Try wkhtmltopdf (most reliable)
    try:
        print("🔄 Attempting to generate PDF using wkhtmltopdf...")
        subprocess.run(
            ["wkhtmltopdf", str(html_file), str(pdf_file)],
            check=True,
            capture_output=True
        )
        print(f"✅ PDF generated successfully: {pdf_file}")
        print(f"📄 File size: {pdf_file.stat().st_size / 1024 / 1024:.2f} MB")
        return True
    except FileNotFoundError:
        print("⚠️  wkhtmltopdf not found, trying puppeteer...")
    except subprocess.CalledProcessError as e:
        print(f"⚠️  wkhtmltopdf failed: {e}")
    
    # Try Puppeteer (Node.js based)
    try:
        print("🔄 Attempting to generate PDF using Puppeteer...")
        puppeteer_script = """
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('file://%s', {waitUntil: 'networkidle2'});
  await page.pdf({path: '%s', format: 'A4', margin: {top: '20px', right: '20px', bottom: '20px', left: '20px'}});
  await browser.close();
  console.log('✅ PDF generated successfully');
})();
        """ % (str(html_file), str(pdf_file))
        
        temp_script = Path(__file__).parent / "temp_pdf_generator.js"
        temp_script.write_text(puppeteer_script)
        
        subprocess.run(["node", str(temp_script)], check=True)
        temp_script.unlink()
        
        print(f"✅ PDF generated successfully: {pdf_file}")
        print(f"📄 File size: {pdf_file.stat().st_size / 1024 / 1024:.2f} MB")
        return True
    except (FileNotFoundError, subprocess.CalledProcessError) as e:
        print(f"⚠️  Puppeteer failed: {e}")
    
    print("\n❌ PDF generation failed!")
    print("\n📋 Manual alternatives:")
    print("1. Open the HTML file in a browser: cypress-vs-playwright-comparison.html")
    print("2. Use browser's Print → Save as PDF feature (Ctrl+P or Cmd+P)")
    print("3. Or install wkhtmltopdf: brew install wkhtmltopdf (macOS)")
    print("4. Or install Puppeteer: npm install puppeteer")
    
    return False

if __name__ == "__main__":
    success = generate_pdf_from_html()
    sys.exit(0 if success else 1)
