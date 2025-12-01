#!/usr/bin/env node

/**
 * Interactive Playwright MCP Test: Game Creation
 *
 * This script demonstrates how to use Playwright to test game creation
 * using intelligent element detection rather than hardcoded locators.
 */

const { chromium, firefox } = require('@playwright/test');

async function testGameCreation() {
  console.log('🎮 Testing Game Creation with Playwright MCP approach...\n');

  // Launch browser
  const browser = await firefox.launch({
    headless: true,   // Headless mode (no display needed)
    slowMo: 100       // Slight delay to ensure page loads
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: './test-results/mcp-session',
      size: { width: 1280, height: 720 }
    }
  });

  const page = await context.newPage();

  try {
    // Phase 1: Navigate and analyze page
    console.log('📍 Phase 1: Navigating to localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

    // Take screenshot for analysis
    await page.screenshot({
      path: './test-results/mcp-session/01-homepage.png',
      fullPage: true
    });
    console.log('   ✓ Page loaded, screenshot saved\n');

    // Analyze page structure using accessibility tree
    console.log('🔍 Phase 2: Analyzing page accessibility tree...');
    const snapshot = await page.accessibility.snapshot();
    console.log('   Page structure:', JSON.stringify(snapshot, null, 2).substring(0, 500) + '...\n');

    // Find "Create Game" button intelligently
    console.log('🎯 Phase 3: Finding "Create Game" button...');

    // Try multiple strategies (MCP-like approach)
    let createButton = null;

    // Strategy 1: Look for button with text "Create Game"
    createButton = await page.getByRole('button', { name: /create.*game/i }).first();

    if (await createButton.isVisible()) {
      console.log('   ✓ Found button using role and text matching');
      await createButton.click();
      console.log('   ✓ Clicked "Create Game" button\n');
    } else {
      throw new Error('Could not find Create Game button');
    }

    // Wait for navigation/transition
    await page.waitForTimeout(1000);
    await page.screenshot({ path: './test-results/mcp-session/02-after-create.png' });

    // Phase 4: Find and fill nickname input
    console.log('✏️  Phase 4: Finding nickname input...');

    // Look for input field intelligently
    const nicknameInput = await page.getByPlaceholder(/nickname|name/i).or(
      page.getByLabel(/nickname|name/i)
    ).or(
      page.locator('input[type="text"]').first()
    );

    if (await nicknameInput.isVisible()) {
      console.log('   ✓ Found nickname input field');
      await nicknameInput.fill('MCP Test Player');
      console.log('   ✓ Filled nickname: "MCP Test Player"\n');
    }

    await page.screenshot({ path: './test-results/mcp-session/03-nickname-filled.png' });

    // Phase 5: Submit/Continue
    console.log('▶️  Phase 5: Looking for submit/continue button...');

    const submitButton = await page.getByRole('button', { name: /submit|continue|next|join/i }).first();

    if (await submitButton.isVisible()) {
      console.log('   ✓ Found submit button');
      await submitButton.click();
      console.log('   ✓ Clicked submit button\n');
    }

    await page.waitForTimeout(1000);
    await page.screenshot({ path: './test-results/mcp-session/04-lobby.png', fullPage: true });

    // Phase 6: Verify we're in the lobby
    console.log('✅ Phase 6: Verifying lobby appearance...');

    // Look for room code or lobby indicators
    const roomCodeVisible = await page.getByText(/room.*code|code.*room/i).isVisible().catch(() => false);
    const lobbyVisible = await page.getByText(/lobby|waiting/i).isVisible().catch(() => false);

    if (roomCodeVisible || lobbyVisible) {
      console.log('   ✓ Lobby page detected');

      // Try to extract room code
      const pageText = await page.textContent('body');
      const roomCodeMatch = pageText.match(/room.*code[:\s]*([A-Z0-9]{4,6})/i);
      if (roomCodeMatch) {
        console.log(`   ✓ Room Code: ${roomCodeMatch[1]}`);
      }
    }

    // Get final page state
    const finalSnapshot = await page.accessibility.snapshot();
    console.log('\n📊 Final page state (accessibility tree):');
    console.log(JSON.stringify(finalSnapshot, null, 2).substring(0, 800) + '...\n');

    await page.screenshot({ path: './test-results/mcp-session/05-final.png', fullPage: true });

    console.log('\n✅ Test Complete!');
    console.log('\n📁 Artifacts saved to: ./test-results/mcp-session/');
    console.log('   - Screenshots: 01-homepage.png through 05-final.png');
    console.log('   - Video: video.webm (when closed)');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await page.screenshot({ path: './test-results/mcp-session/error.png', fullPage: true });
    console.log('   Error screenshot saved to: ./test-results/mcp-session/error.png');
  } finally {
    // Keep browser open for inspection
    console.log('\n⏳ Browser will close in 5 seconds...');
    await page.waitForTimeout(5000);
    await context.close();
    await browser.close();
  }
}

// Run the test
testGameCreation().catch(console.error);
