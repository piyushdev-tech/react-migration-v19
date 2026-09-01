# E2E Testing with Playwright & Cucumber BDD

This project uses Playwright 1.62.1 with Cucumber to write End-to-End tests in BDD (Behavior-Driven Development) format using GIVEN, WHEN, THEN steps.

## Setup

The E2E testing framework is already configured. The following files have been created:

### Configuration Files
- **`playwright.config.ts`** - Playwright configuration with browser settings, test runner options, and dev server integration
- **`cucumber.js`** - Cucumber configuration for BDD test execution

### Test Structure
```
e2e/
├── features/                 # Feature files written in Gherkin syntax
│   ├── counter.feature      # Counter component BDD scenarios
│   └── search.feature       # Search box component BDD scenarios
├── step-definitions/        # Step implementation files
│   ├── hooks.ts             # Browser lifecycle management
│   ├── counter.steps.ts     # Step definitions for counter feature
│   └── search.steps.ts      # Step definitions for search feature
└── support/
    └── types.ts             # TypeScript type definitions
```

## Running E2E Tests

### Prerequisites
Ensure your dev server runs on `http://localhost:5173` (default Vite port)

### Commands

1. **Run all E2E tests with Cucumber:**
   ```bash
   npm run e2e
   ```

2. **Run Playwright tests with UI mode:**
   ```bash
   npm run e2e:ui
   ```

3. **Run Playwright tests in debug mode:**
   ```bash
   npm run e2e:debug
   ```

4. **Start dev server (in another terminal):**
   ```bash
   npm run dev
   ```

## Writing BDD Tests

### Feature Files (`.feature`)

Feature files are written in Gherkin syntax with GIVEN-WHEN-THEN format:

```gherkin
Feature: Counter Component
  As a user
  I want to interact with a counter component
  So that I can increase and decrease the counter value

  Scenario: User can increment the counter
    Given the user navigates to the home page
    And the counter is displayed
    When the user clicks the increment button
    Then the counter value should increase by 1
```

### Step Definitions (`.ts` files)

Step definitions map Gherkin steps to actual code:

```typescript
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

Given('the user navigates to the home page', async function () {
  const page = global.testContext.page!;
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');
});

When('the user clicks the increment button', async function () {
  const page = global.testContext.page!;
  const button = page.locator('button:has-text("Count is")');
  await button.click();
});

Then('the counter value should increase by {int}', async function (increment: number) {
  const page = global.testContext.page!;
  const button = page.locator('button:has-text("Count is")');
  const text = await button.textContent();
  const value = parseInt(text?.match(/\d+/)?.[0] || '0', 10);
  expect(value).toBeGreaterThan(0);
});
```

## Accessing the Test Context

All step definitions have access to `global.testContext` which contains:
- `page` - Playwright Page object
- `context` - Playwright BrowserContext object
- `browser` - Playwright Browser object

Example:
```typescript
const page = global.testContext.page!;
await page.goto('http://localhost:5173/');
```

## Browser Support

The tests run against multiple browsers by default:
- Chromium (Desktop)
- Firefox (Desktop)
- WebKit/Safari (Desktop)
- Chrome Mobile (Pixel 5)
- Safari Mobile (iPhone 12)

To run tests on specific browsers, modify `playwright.config.ts`.

## Test Reports

Test results are generated in:
- **Playwright Report**: `playwright-report/index.html`
- **Cucumber Report**: `test-results/cucumber-report.html`
- **Cucumber JSON**: `test-results/cucumber-report.json`

Open HTML reports in a browser:
```bash
# After running tests
open playwright-report/index.html
# or
open test-results/cucumber-report.html
```

## Best Practices

1. **Keep steps reusable** - Write steps that can be used across multiple scenarios
2. **Use meaningful step names** - Steps should clearly describe what they do
3. **Avoid technical details in features** - Focus on behavior, not implementation
4. **Use data tables for complex scenarios:**
   ```gherkin
   Scenario: User can search multiple items
     Given the following items exist:
       | name        | price |
       | Apple       | 1.00  |
       | Banana      | 0.50  |
     When the user searches for "Apple"
     Then the result should show "Apple" with price "1.00"
   ```

5. **Tag scenarios for organization:**
   ```gherkin
   @smoke @critical
   Scenario: Critical user flow
     ...
   ```

## Common Locator Patterns

```typescript
// By text
page.locator('text=Click me')

// By role
page.locator('[role="button"]')

// By data test id
page.locator('[data-testid="submit-btn"]')

// By placeholder
page.locator('input[placeholder="Search"]')

// Complex selectors
page.locator('button:has-text("Count is")')
```

## Debugging Tests

1. **Use debug mode:**
   ```bash
   npm run e2e:debug
   ```

2. **Use UI mode to step through tests:**
   ```bash
   npm run e2e:ui
   ```

3. **Add pauses in code:**
   ```typescript
   await page.pause(); // Opens debugger
   ```

4. **Use waitFor to debug timing issues:**
   ```typescript
   await page.waitForSelector('.my-element');
   ```

## Troubleshooting

### Tests can't find elements
- Ensure dev server is running (`npm run dev`)
- Check that base URL in `playwright.config.ts` matches your server URL
- Verify CSS selectors and element locators

### Timeout errors
- Increase timeout in `hooks.ts` if needed
- Use `waitForLoadState('networkidle')` after navigation
- Check network tab for slow requests

### Browser issues
- Clear browser cache: `rm -rf ~/Library/Caches/Playwright`
- Reinstall browsers: `npx playwright install`

## Next Steps

1. Create feature files for all your components
2. Implement corresponding step definitions
3. Run tests: `npm run e2e`
4. Add tests to your CI/CD pipeline
5. View reports and iterate

Happy testing! 🎭
