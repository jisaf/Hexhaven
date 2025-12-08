/**
 * Bug Reporter - Standardized Bug Reporting
 *
 * Provides consistent bug reporting across all tests:
 * - Bug interface definition
 * - Write to bugs.md file
 * - Duplicate detection
 * - Screenshot attachment
 * - Structured bug format
 *
 * Part of Phase 3 - Test Helper Modules
 */

import * as fs from 'fs';
import * as path from 'path';
import { Page } from '@playwright/test';

/**
 * Bug severity levels
 */
export type BugSeverity = 'P0' | 'P1' | 'P2' | 'P3';

/**
 * Bug interface
 */
export interface Bug {
  title: string;
  explanation: string;
  stepsToRecreate: string[];
  expectedBehavior: string;
  actualBehavior?: string;
  screenshot?: string;
  severity?: BugSeverity;
  branch?: string;
  testFile?: string;
  relatedFiles?: string[];
  additionalContext?: Record<string, any>;
}

/**
 * Bug reporter configuration
 */
const CONFIG = {
  bugsFilePath: path.join(__dirname, '../bugs.md'),
  screenshotDir: path.join(__dirname, '../../public/test-videos'),
};

/**
 * Report bug to bugs.md file
 * Automatically checks for duplicates
 */
export async function reportBug(bug: Bug): Promise<void> {
  console.log(`[bugReporter] Reporting bug: ${bug.title}`);

  // Read existing bugs file
  let existingContent = '';
  try {
    existingContent = fs.readFileSync(CONFIG.bugsFilePath, 'utf-8');
  } catch {
    // File doesn't exist, create header
    existingContent =
      '# Known Bugs\n\n' +
      'This file tracks bugs found during testing.\n\n' +
      '## Legend\n' +
      '- **P0**: Critical - Blocks testing or core functionality\n' +
      '- **P1**: High - Major feature broken\n' +
      '- **P2**: Medium - Minor feature issue\n' +
      '- **P3**: Low - Cosmetic or edge case\n\n';
  }

  // Check for duplicate
  if (existingContent.includes(bug.title)) {
    console.log(`[bugReporter] Bug already reported: ${bug.title}`);
    return;
  }

  // Format bug entry
  const bugEntry = formatBugEntry(bug);

  // Append to file
  fs.appendFileSync(CONFIG.bugsFilePath, bugEntry);

  console.log(`[bugReporter] ✗ Bug reported: ${bug.title}`);
}

/**
 * Format bug as markdown entry
 */
function formatBugEntry(bug: Bug): string {
  const severity = bug.severity || 'P2';
  const branch = bug.branch || 'unknown';
  const timestamp = new Date().toISOString();

  let entry = `\n## - [ ] [${severity}] ${bug.title}\n\n`;

  entry += `**Explanation:** ${bug.explanation}\n\n`;

  entry += `**Steps to Recreate:**\n`;
  entry += bug.stepsToRecreate.map((step, i) => `${i + 1}. ${step}`).join('\n');
  entry += '\n\n';

  entry += `**Expected Behavior:** ${bug.expectedBehavior}\n\n`;

  if (bug.actualBehavior) {
    entry += `**Actual Behavior:** ${bug.actualBehavior}\n\n`;
  }

  if (bug.screenshot) {
    entry += `**Screenshot:** \`${bug.screenshot}\`\n\n`;
  }

  if (bug.testFile) {
    entry += `**Test File:** \`${bug.testFile}\`\n\n`;
  }

  if (bug.relatedFiles && bug.relatedFiles.length > 0) {
    entry += `**Related Files:**\n`;
    entry += bug.relatedFiles.map((file) => `- \`${file}\``).join('\n');
    entry += '\n\n';
  }

  if (bug.additionalContext) {
    entry += `**Additional Context:**\n`;
    entry += '```json\n';
    entry += JSON.stringify(bug.additionalContext, null, 2);
    entry += '\n```\n\n';
  }

  entry += `**Branch:** ${branch}\n`;
  entry += `**Reported:** ${timestamp}\n`;

  entry += '\n---\n';

  return entry;
}

/**
 * Report bug with automatic screenshot
 * Takes screenshot and includes in bug report
 */
export async function reportBugWithScreenshot(
  page: Page,
  bug: Omit<Bug, 'screenshot'>,
  screenshotName?: string
): Promise<void> {
  // Generate screenshot filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = screenshotName || `bug-${timestamp}.png`;
  const filepath = path.join(CONFIG.screenshotDir, filename);

  // Take screenshot
  await page.screenshot({
    path: filepath,
    fullPage: true,
  });

  console.log(`[bugReporter] Screenshot saved: ${filename}`);

  // Report bug with screenshot
  await reportBug({
    ...bug,
    screenshot: filename,
  });
}

/**
 * Report bug with game state context
 * Captures current game state and includes in report
 */
export async function reportBugWithGameState(
  page: Page,
  bug: Omit<Bug, 'additionalContext'>,
  options?: { includeScreenshot?: boolean }
): Promise<void> {
  // Get game state
  const gameState = await page.evaluate(() => {
    const state = (window as any).gameStateManager?.getState();
    return state || null;
  });

  // Get WebSocket state
  const wsConnected = await page.evaluate(() => {
    const ws = (window as any).socket;
    return ws ? ws.connected : null;
  });

  // Get localStorage
  const localStorage = await page.evaluate(() => {
    const keys = [
      'hexhaven_player_uuid',
      'hexhaven_player_nickname',
      'hexhaven_last_room_code',
    ];

    const data: Record<string, string | null> = {};
    keys.forEach((key) => {
      data[key] = window.localStorage.getItem(key);
    });

    return data;
  });

  // Build context
  const additionalContext = {
    gameState,
    wsConnected,
    localStorage,
    url: page.url(),
    timestamp: new Date().toISOString(),
  };

  // Report with or without screenshot
  if (options?.includeScreenshot) {
    await reportBugWithScreenshot(page, {
      ...bug,
      additionalContext,
    });
  } else {
    await reportBug({
      ...bug,
      additionalContext,
    });
  }
}

/**
 * Report test failure as bug
 * Converts test error into bug report
 */
export async function reportTestFailure(
  page: Page,
  testName: string,
  error: Error,
  options?: {
    severity?: BugSeverity;
    includeScreenshot?: boolean;
    includeGameState?: boolean;
  }
): Promise<void> {
  const bug: Bug = {
    title: `Test failure: ${testName}`,
    explanation: `Test "${testName}" failed with error: ${error.message}`,
    stepsToRecreate: [
      'Run the test',
      `Test file: ${testName}`,
      'Observe failure',
    ],
    expectedBehavior: 'Test should pass',
    actualBehavior: `Test failed with error: ${error.message}\n\nStack:\n${error.stack}`,
    severity: options?.severity || 'P1',
    testFile: testName,
  };

  if (options?.includeGameState) {
    await reportBugWithGameState(page, bug, {
      includeScreenshot: options?.includeScreenshot,
    });
  } else if (options?.includeScreenshot) {
    await reportBugWithScreenshot(page, bug);
  } else {
    await reportBug(bug);
  }
}

/**
 * Create bug from assertion failure
 */
export function createAssertionBug(
  testName: string,
  assertion: string,
  expectedValue: any,
  actualValue: any,
  options?: {
    severity?: BugSeverity;
    additionalSteps?: string[];
  }
): Bug {
  return {
    title: `Assertion failed: ${assertion}`,
    explanation: `In test "${testName}", assertion "${assertion}" failed`,
    stepsToRecreate: [
      'Run the test',
      `Test file: ${testName}`,
      ...(options?.additionalSteps || []),
      'Observe assertion failure',
    ],
    expectedBehavior: `${assertion} should be ${JSON.stringify(expectedValue)}`,
    actualBehavior: `Got ${JSON.stringify(actualValue)}`,
    severity: options?.severity || 'P1',
    testFile: testName,
  };
}

/**
 * Batch report multiple bugs
 */
export async function reportMultipleBugs(bugs: Bug[]): Promise<void> {
  console.log(`[bugReporter] Reporting ${bugs.length} bugs...`);

  for (const bug of bugs) {
    await reportBug(bug);
  }

  console.log(`[bugReporter] ✗ Reported ${bugs.length} bugs`);
}

/**
 * Clear bugs file (use with caution!)
 */
export function clearBugsFile(): void {
  if (fs.existsSync(CONFIG.bugsFilePath)) {
    fs.unlinkSync(CONFIG.bugsFilePath);
    console.log('[bugReporter] Bugs file cleared');
  }
}

/**
 * Get bug count from file
 */
export function getBugCount(): number {
  try {
    const content = fs.readFileSync(CONFIG.bugsFilePath, 'utf-8');
    const matches = content.match(/^## - \[( |x)\]/gm);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Get bug list from file
 */
export function getBugTitles(): string[] {
  try {
    const content = fs.readFileSync(CONFIG.bugsFilePath, 'utf-8');
    const matches = content.match(/^## - \[( |x)\] (.+)$/gm);

    if (!matches) return [];

    return matches.map((match) => {
      const titleMatch = match.match(/^## - \[( |x)\] (.+)$/);
      return titleMatch ? titleMatch[2] : '';
    });
  } catch {
    return [];
  }
}

/**
 * Check if specific bug was reported
 */
export function wasBugReported(bugTitle: string): boolean {
  try {
    const content = fs.readFileSync(CONFIG.bugsFilePath, 'utf-8');
    return content.includes(bugTitle);
  } catch {
    return false;
  }
}

/**
 * Helper: Create P0 (critical) bug
 */
export function createP0Bug(
  title: string,
  explanation: string,
  steps: string[],
  expected: string,
  actual?: string
): Bug {
  return {
    title,
    explanation,
    stepsToRecreate: steps,
    expectedBehavior: expected,
    actualBehavior: actual,
    severity: 'P0',
  };
}

/**
 * Helper: Create P1 (high) bug
 */
export function createP1Bug(
  title: string,
  explanation: string,
  steps: string[],
  expected: string,
  actual?: string
): Bug {
  return {
    title,
    explanation,
    stepsToRecreate: steps,
    expectedBehavior: expected,
    actualBehavior: actual,
    severity: 'P1',
  };
}
