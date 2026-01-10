
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Log in
        print("Navigating to login...")
        page.goto("http://localhost:5173/login")
        page.fill('input[type="email"]', "admin@test.com")
        page.fill('input[type="password"]', "123456")

        print("Submitting login...")
        page.click('button[type="submit"]')

        # Wait for navigation or a success indicator
        print("Waiting for dashboard (Logout button)...")
        try:
            # Wait for the "Logout" button which confirms we are on the dashboard
            page.wait_for_selector('text=Logout', timeout=10000)
        except:
            print("Logout text not found, taking debug screenshot...")
            page.screenshot(path="/home/jules/verification/login_failed.png")
            raise

        print("Navigating to inventory...")
        page.goto("http://localhost:5173/inventory")

        # Take a screenshot of the inventory page before clicking anything
        print("Taking inventory page screenshot...")
        page.screenshot(path="/home/jules/verification/inventory_page.png")

        # Click Create New Product
        print("Clicking Create New Product...")
        # Use a broad text selector
        page.click("text=Create New Product")

        # Fill Product Form
        page.fill('input[name="name"]', "Test Product With Stock")
        page.fill('input[name="genericName"]', "Test Generic")
        page.fill('input[name="minStockLevel"]', "10")

        # Click "Add Initial Stock" checkbox
        print("Clicking Add Initial Stock checkbox...")
        page.click('input[name="addInitialStock"]')

        # Verify the batch fields appeared
        page.wait_for_selector('input[name="batchNumber"]')

        # Fill Batch Details
        print("Filling batch details...")
        page.fill('input[name="batchNumber"]', "BATCH001")
        page.fill('input[name="expiryDate"]', "2030-01-01")
        page.fill('input[name="quantity"]', "50")
        page.fill('input[name="mrp"]', "100")
        page.fill('input[name="costPrice"]', "50")

        # Take screenshot of the form filled out
        page.screenshot(path="/home/jules/verification/add_product_with_stock_form.png")

        # Submit
        print("Submitting product...")
        page.click('button:has-text("Create Product")')

        # Wait for success
        page.wait_for_selector('text=Product created successfully!')

        # Take screenshot of success
        page.screenshot(path="/home/jules/verification/product_created_success.png")

        # Reload to see the stock in table
        print("Reloading to check table...")
        page.reload()
        page.wait_for_selector('text=Test Product With Stock')

        # Take screenshot of the table showing the stock
        page.screenshot(path="/home/jules/verification/stock_table_result.png")
        print("Verification complete!")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
