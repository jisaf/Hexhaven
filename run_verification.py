
import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Enable console logging
        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

        try:
            print("Navigating to the game lobby...")
            await page.goto("http://localhost:5173")

            # Wait for the main lobby heading to be visible
            print("Waiting for lobby to load...")
            await expect(page.locator("h1:has-text('Hexhaven')")).to_be_visible(timeout=20000)
            print("Lobby loaded.")

            # Click the "+" button to create a room
            print("Creating a new room...")
            await page.locator("button:has-text('+')").click()

            # Wait for the nickname prompt to appear and enter a nickname
            print("Entering nickname...")
            await expect(page.locator("h2:has-text('Enter Your Nickname')")).to_be_visible(timeout=10000)
            await page.locator("input[placeholder='Enter your nickname']").fill("Jules")
            await page.locator("button:has-text('Continue')").click()
            print("Nickname confirmed.")

            # Wait for the character selection component to be visible
            print("Waiting for character selection...")
            await expect(page.locator('[data-testid="character-select"]')).to_be_visible(timeout=10000)
            print("Character selection is visible.")

            # Select the Brute character
            await page.locator('[data-testid="character-card-Brute"]').click()
            print("Character selected.")

            # Start the game
            print("Starting the game...")
            await page.locator("button:has-text('Start Game')").click()

            # Wait for the "Select Your Actions" panel to appear
            print("Waiting for the action selection panel...")
            await expect(page.locator("h3:has-text('Select Your Actions')")).to_be_visible(timeout=30000)
            print("Action selection panel is visible.")

            # Select the TOP action of the first card and the BOTTOM action of the second card
            print("Selecting card actions...")
            await page.locator(".ability-card:first-child .card-section.top").click()
            await page.locator(".ability-card:nth-child(2) .card-section.bottom").click()
            print("Card actions selected.")

            # Confirm the selection
            print("Confirming action selection...")
            await page.locator("button:has-text('CONFIRM')").click()

            # Wait for the game board to be ready (e.g., for the HUD to show player info)
            print("Waiting for game to start...")
            await expect(page.locator('[data-testid="game-hud"]')).to_be_visible(timeout=20000)
            print("Game started. HUD is visible.")

            # --- Movement Test ---
            # 1. Click on the player character
            print("Selecting character to move...")
            # Using a data-testid for the character sprite is ideal. Assuming it's 'character-sprite-1'
            await page.locator('[data-testid="character-sprite-Brute"]').click()
            print("Character selected.")

            # 2. Click on a highlighted hex to move
            print("Selecting destination hex...")
            # This selector assumes the highlighted hexes have a specific class or attribute
            await page.locator(".hex-tile.highlight").first.click()
            print("Destination hex clicked.")

            # 3. Verify the character has moved
            print("Verifying movement...")
            # Add a small delay to allow for animation and state updates
            await page.wait_for_timeout(2000)

            # Take a screenshot to visually confirm the new state
            screenshot_path = "/home/jules/verification/movement_verification.png"
            await page.screenshot(path=screenshot_path)
            print("Movement verification screenshot saved to {screenshot_path}")

        except Exception as e:
            print(f"An error occurred: {e}")
            await page.screenshot(path="/home/jules/verification/error_screenshot.png")
            print("Error screenshot saved.")
        finally:
            await browser.close()
            print("Browser closed.")

if __name__ == "__main__":
    asyncio.run(main())
