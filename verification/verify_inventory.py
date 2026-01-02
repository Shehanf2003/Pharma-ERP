from playwright.sync_api import sync_playwright, expect
import time

def verify_inventory(page):
    print("Navigating to login...")
    page.goto("http://localhost:5173/login", timeout=60000)

    print("Filling login form...")
    page.fill('input[type="email"]', "admin@test.com")
    page.fill('input[type="password"]', "123456")
    page.click('button[type="submit"]')

    print("Waiting for dashboard url...")
    # Wait for dashboard
    page.wait_for_url("http://localhost:5173/", timeout=60000)

    print("Navigating to inventory...")
    # 2. Navigate to Inventory
    page.goto("http://localhost:5173/inventory", timeout=60000)

    print("Waiting for Inventory text...")
    # Wait for the Inventory Dashboard to load
    page.wait_for_selector("text=Inventory Management", timeout=60000)

    # 3. Take screenshot
    print("Taking screenshot...")
    page.screenshot(path="/home/jules/verification/inventory_dashboard.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        print("Launching browser...")
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_inventory(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
        finally:
            browser.close()
