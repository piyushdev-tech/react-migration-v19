import { BrowserContext, Page } from '@playwright/test';

export interface TestContext {
  page: Page;
  context: BrowserContext;
}
