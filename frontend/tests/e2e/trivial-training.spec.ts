import { test } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test.describe('Trivial Training Campaign Flow', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('should complete full campaign progression', async ({ page }) => {
    // Step 1: Navigate to homepage and check if login is needed
    console.log('Step 1: Navigating to homepage...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-screenshots/trivial-training/01-homepage.png', fullPage: true });
    
    // Step 2: Check if we need to login
    console.log('Step 2: Checking for login requirement...');
    const loginLink = page.locator('a[href="/login"]').or(page.getByRole('link', { name: /login|sign.*in/i }));
    if (await loginLink.count() > 0) {
      console.log('Login required, navigating to login page...');
      await loginLink.first().click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-screenshots/trivial-training/02a-login-page.png', fullPage: true });
      
      // Fill in login form
      await page.fill('input[name="username"]', 'foo');
      await page.fill('input[type="password"]', 'foobarbaz123');
      await page.getByRole('button', { name: /login|sign.*in/i }).click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-screenshots/trivial-training/02b-after-login.png', fullPage: true });
    }
    
    // Step 3: Navigate to Campaigns tab
    console.log('Step 3: Clicking Campaigns tab...');
    
    // First, take a screenshot to see current state
    await page.screenshot({ path: 'test-screenshots/trivial-training/03a-before-campaigns.png', fullPage: true });
    
    // Try different selectors for the campaigns tab
    const campaignsTab = page.locator('text=Campaigns').first().or(
      page.getByRole('tab', { name: /campaigns/i })
    );
    
    const tabCount = await campaignsTab.count();
    console.log('Campaigns tab count:', tabCount);
    
    if (tabCount > 0) {
      await campaignsTab.click();
      await page.waitForTimeout(2000); // Wait for campaign data to load
      await page.screenshot({ path: 'test-screenshots/trivial-training/03b-campaigns-tab.png', fullPage: true });
      
      // Step 4: Check for campaign templates
      console.log('Step 4: Looking for campaign templates...');
      const pageText = await page.textContent('body');
      console.log('Page includes "Trivial Training":', pageText?.includes('Trivial Training'));
      console.log('Page includes "Not authenticated":', pageText?.includes('Not authenticated'));
      console.log('Page includes "No campaign templates":', pageText?.includes('No campaign templates'));
      
      // Look for Trivial Training template
      const trivialTrainingTemplate = page.locator('text=Trivial Training').first();
      const templateCount = await trivialTrainingTemplate.count();
      console.log('Trivial Training template count:', templateCount);
      
      if (templateCount > 0) {
        console.log('Step 5: Found Trivial Training template, clicking...');
        await trivialTrainingTemplate.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'test-screenshots/trivial-training/04-template-selected.png', fullPage: true });
        
        // Fill in campaign name and create
        const nameInput = page.locator('input[type="text"]').first();
        await nameInput.fill('Test Trivial Campaign');
        
        const startButton = page.getByRole('button', { name: /start.*campaign/i });
        await startButton.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'test-screenshots/trivial-training/05-campaign-created.png', fullPage: true });
        
        console.log('Campaign creation flow completed!');
      } else {
        console.log('WARNING: Trivial Training template not found!');
        await page.screenshot({ path: 'test-screenshots/trivial-training/error-no-template.png', fullPage: true });
      }
    } else {
      console.log('ERROR: Campaigns tab not found!');
      await page.screenshot({ path: 'test-screenshots/trivial-training/error-no-tab.png', fullPage: true });
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'test-screenshots/trivial-training/final-state.png', fullPage: true });
  });
});
