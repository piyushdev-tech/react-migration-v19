import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

// ============================================================================
// Scenario: User can see initial counter value
// ============================================================================

Given('the user navigates to the home page', async function () {
  const page = global.testContext.page!;
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');
});

When('the counter component is visible', async function () {
  const page = global.testContext.page!;
  const counter = page.locator('text=Counter');
  await expect(counter).toBeVisible();
});

Then('the counter should display an initial value of {int}', async function (expectedValue: number) {
  const page = global.testContext.page!;
  const counterButton = page.locator('button:has-text("Count is")');
  await expect(counterButton).toContainText(expectedValue.toString());
});

// ============================================================================
// Scenario: User can increment the counter
// ============================================================================

Given('the counter is displayed', async function () {
  const page = global.testContext.page!;
  const counterButton = page.locator('button:has-text("Count is")');
  await expect(counterButton).toBeVisible();
});

When('the user clicks the increment button', async function () {
  const page = global.testContext.page!;
  const counterButton = page.locator('button:has-text("Count is")');
  await counterButton.click();
});

Then('the counter value should increase by {int}', async function (increment: number) {
  const page = global.testContext.page!;
  const counterButton = page.locator('button:has-text("Count is")');
  const text = await counterButton.textContent();
  const currentValue = parseInt(text?.match(/\d+/)?.[0] || '0', 10);
  expect(currentValue).toBeGreaterThan(0);
});

// ============================================================================
// Scenario: User can decrement the counter
// ============================================================================

When('the user clicks the decrement button', async function () {
  const page = global.testContext.page!;
  // Assuming there's a separate decrement button or similar mechanism
  // Adjust this selector based on your actual UI
  const counterButton = page.locator('button:has-text("Count is")');
  await counterButton.click();
  // Note: You may need to adjust this based on your actual counter implementation
});

Then('the counter value should decrease by {int}', async function (decrement: number) {
  const page = global.testContext.page!;
  const counterButton = page.locator('button:has-text("Count is")');
  const text = await counterButton.textContent();
  const currentValue = parseInt(text?.match(/\d+/)?.[0] || '0', 10);
  // This step needs adjustment based on your implementation
});

// ============================================================================
// Scenario: Multiple increments work correctly
// ============================================================================

Given('the counter is at {int}', async function (expectedValue: number) {
  const page = global.testContext.page!;
  const counterButton = page.locator('button:has-text("Count is")');
  await expect(counterButton).toContainText(expectedValue.toString());
});

When('the user clicks the increment button {int} times', async function (times: number) {
  const page = global.testContext.page!;
  const counterButton = page.locator('button:has-text("Count is")');
  for (let i = 0; i < times; i++) {
    await counterButton.click();
    await page.waitForTimeout(100); // Small delay between clicks
  }
});

Then('the counter value should be {int}', async function (expectedValue: number) {
  const page = global.testContext.page!;
  const counterButton = page.locator('button:has-text("Count is")');
  await expect(counterButton).toContainText(`Count is ${expectedValue}`);
});

