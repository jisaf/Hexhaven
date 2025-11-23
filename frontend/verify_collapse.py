
import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    # Ensure the verification directory exists
    os.makedirs("/home/jules/verification", exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Listen for console logs
        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

        try:
            # Navigate to the test page
            await page.goto("http://localhost:5174/card-test")
            print("Navigated to http://localhost:5174/card-test")

            # Wait for the panel to be visible
            await page.wait_for_selector(".card-selection-panel")
            print("Card selection panel is visible.")

            # Expanded state screenshot
            await asyncio.sleep(1) # wait for animations
            await page.screenshot(path="/home/jules/verification/card-panel-expanded.png")
            print("Saved screenshot: card-panel-expanded.png")

            # Find and click the collapse toggle button
            collapse_button = page.locator(".collapse-toggle")
            await collapse_button.click()
            print("Clicked collapse toggle button.")

            # Collapsed state screenshot
            await asyncio.sleep(1) # wait for animations
            await page.screenshot(path="/home/jules/verification/card-panel-collapsed.png")
            print("Saved screenshot: card-panel-collapsed.png")

            # Click again to expand
            await collapse_button.click()
            print("Clicked collapse toggle button again to expand.")

            # Re-expanded state screenshot
            await asyncio.sleep(1) # wait for animations
            await page.screenshot(path="/home/jules/verification/card-panel-re-expanded.png")
            print("Saved screenshot: card-panel-re-expanded.png")

        except Exception as e:
            print(f"An error occurred: {e}")
            await page.screenshot(path="/home/jules/verification/error.png")

        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
