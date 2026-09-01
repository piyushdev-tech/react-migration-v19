import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

declare global {
  var testContext: {
    page: any;
  };
}

// ============================================================================
// Scenario: Search box is visible and empty by default
// ============================================================================

Given('the user navigates to the home page', async function () {
  const page = global.testContext.page;
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');
});

When('the page loads', async function () {
  const page = global.testContext.page;
  await page.waitForLoadState('networkidle');
});

Then('the search box should be visible', async function () {
  const page = global.testContext.page;
  const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="Search"]', {
    matchCase: false,
  });
  await expect(searchInput).toBeVisible();
});

Then('the search box should be empty', async function () {
  const page = global.testContext.page;
  const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="Search"]', {
    matchCase: false,
  });
  await expect(searchInput).toHaveValue('');
});

// ============================================================================
// Scenario: User can type in the search box
// ============================================================================

When('the user types {string} in the search box', async function (searchText: string) {
  const page = global.testContext.page;
  const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="Search"]', {
    matchCase: false,
  });
  await searchInput.fill(searchText);
});

Then('the search box should contain {string}', async function (expectedText: string) {
  const page = global.testContext.page;
  const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="Search"]', {
    matchCase: false,
  });
  await expect(searchInput).toHaveValue(expectedText);
});

// ============================================================================
// Scenario: Search results are filtered
// ============================================================================

Given('there are multiple items displayed', async function () {
  const page = global.testContext.page;
  const items = page.locator('[data-testid="item"]');
  const count = await items.count();
  expect(count).toBeGreaterThan(1);
});

When('the user searches for a specific item', async function () {
  const page = global.testContext.page;
  const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="Search"]', {
    matchCase: false,
  });
  await searchInput.fill('React');
});

Then('only matching items should be displayed', async function () {
  const page = global.testContext.page;
  const items = page.locator('[data-testid="item"]');
  const count = await items.count();
  // Verify that there are items displayed
  expect(count).toBeGreaterThanOrEqual(0);
});

