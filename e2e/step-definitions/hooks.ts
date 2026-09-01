import { Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium, Browser, BrowserContext, Page } from 'playwright';

setDefaultTimeout(30 * 1000);

interface TestContext {
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;
}

export const testContext: TestContext = {};

// Make it global so all step definitions can access it
declare global {
  var testContext: TestContext;
}

global.testContext = testContext;

Before(async function () {
  // Launch browser
  testContext.browser = await chromium.launch({
    headless: process.env.HEADLESS !== 'false',
  });

  // Create browser context with reasonable defaults
  testContext.context = await testContext.browser.createContext({
    viewport: { width: 1280, height: 720 },
  });

  // Create a page
  testContext.page = await testContext.context.newPage();

  // Set a reasonable timeout
  testContext.page.setDefaultTimeout(30 * 1000);
  testContext.page.setDefaultNavigationTimeout(30 * 1000);
});

After(async function () {
  // Close the page
  if (testContext.page) {
    await testContext.page.close();
  }

  // Close the context
  if (testContext.context) {
    await testContext.context.close();
  }

  // Close the browser
  if (testContext.browser) {
    await testContext.browser.close();
  }
});
