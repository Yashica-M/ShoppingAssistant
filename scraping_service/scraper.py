import sys
import json
import re
import time
import random
from thefuzz import fuzz
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException
from webdriver_manager.chrome import ChromeDriverManager

# --- SELECTOR CONFIGURATION ---
# Define multiple selectors for resilience. The script will try them in order.
SELECTORS = {
    'Amazon.in': {
        'search_result_link': [
            "div[data-component-type='s-search-result'] a.a-link-normal.s-no-outline",
            "div.s-result-item a.a-link-normal.s-no-outline",
            "a.a-link-normal.s-underline-text.s-underline-link-text.s-link-style.a-text-normal"
        ],
        'price': [
            "//*[@id='corePriceDisplay_desktop_feature_div']//span[contains(@class, 'a-price-whole')]", # XPath Stable ID
            "//*[@id='corePrice_feature_div']//span[contains(@class, 'a-price-whole')]",              # XPath Stable ID variant
            "div#corePriceDisplay_desktop_feature_div span.a-offscreen", # New Stable ID
            "div#corePrice_feature_div span.a-offscreen",              # Another Stable ID variant
            "span.a-price span.a-offscreen",           # Primary: Hidden accessible price
            "span#priceblock_ourprice",                # Old standard
            "span#priceblock_dealprice",               # Deal price
            "span.a-price-whole",                      # Visible price part
            "div[data-csa-c-content-id='price']"       # Data attribute fallback
        ],
        'title': [
            "#productTitle",                           # Standard ID
            "h1#title",                                # Alternative ID
            "span#productTitle",                       # Span variant
            "h1"                                       # Generic fallback (last resort)
        ]
    },
    'Flipkart': {
        'search_result_link': [
            "a._1fQZEK",
            "a.CGtC98",
            "div._1AtVbE a[rel='noopener noreferrer']"
        ],
        'price': [
            "div._30jeq3._16Jk6d",                     # Common class combo
            "div._30jeq3",                             # Base class
            "div.Nx9bqj",                              # Newer class (2024/2025)
            "div.CxhGGd",                              # Another variant
            "div[class*='_30jeq3']",                   # Partial match
            "div[class*='Nx9bqj']"                     # Partial match new
        ],
        'title': [
            "span.B_NuCI",                             # Common span class
            "h1.yhB1nd",                               # H1 variant
            "span[class*='B_NuCI']",                   # Partial match
            "h1"                                       # Generic fallback
        ]
    }
}

def initialize_driver():
    """Initializes a stable, anti-detection Selenium Chrome driver."""
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--disable-blink-features=AutomationControlled") # Hides selenium flag
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)
    
    try:
        driver = webdriver.Chrome(
            service=ChromeService(ChromeDriverManager().install()),
            options=options
        )
        return driver
    except Exception as e:
        print(f"Driver initialization failed: {e}", file=sys.stderr)
        return None

def find_resilient_element(driver, selectors, timeout=5):
    """
    Tries a list of selectors until one is found and present in the DOM.
    Returns the element if found, otherwise raises TimeoutException.
    Supports both CSS Selectors and XPath.
    """
    for selector in selectors:
        try:
            wait = WebDriverWait(driver, timeout)
            # Detect XPath (starts with / or parenthesis) vs CSS
            if selector.startswith('/') or selector.startswith('('):
                locator = (By.XPATH, selector)
            else:
                locator = (By.CSS_SELECTOR, selector)
                
            # Use presence_of_element_located instead of visibility to handle hidden elements like a-offscreen
            element = wait.until(EC.presence_of_element_located(locator))
            # print(f"DEBUG: Found element with selector: {selector}", file=sys.stderr) # Uncomment for debugging
            return element
        except TimeoutException:
            continue
            
    # If we exhaust the list without finding anything
    raise TimeoutException(f"All specified selectors failed. Tried: {selectors}")

def clean_title_for_matching(title):
    """
    Removes common noise phrases from product titles to improve fuzzy matching accuracy.
    """
    if not title:
        return ""
    # Remove "with MS Office", "MSO'24", "Backlit KB", etc.
    noise_pattern = r"(MSO\'\d+|with MS Office|Backlit KB|Anti-Glare|FHD|Display|Windows \d+|Win \d+|Home|Student)"
    return re.sub(noise_pattern, "", title, flags=re.IGNORECASE).strip()

def scrape_amazon_search_page(driver, query):
    """
    Scrapes price directly from Amazon search results page to avoid bot detection on product pages.
    """
    # 1. Split the query into Brand and Product
    query_parts = query.split(maxsplit=1)
    
    if len(query_parts) < 2:
        # Handle generic query like "laptop"
        brand = None
    else:
        brand = query_parts[0].lower() # e.g., 'dell'
    
    # 2. Construct Search URL with mandatory brand filtering (if possible)
    base_url = "https://www.amazon.in/s?k="
    
    if brand and brand in ['dell', 'hp', 'lenovo', 'asus', 'acer', 'apple', 'samsung']:
        # Append brand filter. This parameter forces the search to the brand's category.
        search_url = f"{base_url}{query.replace(' ', '+')}&rh=p_89%3A{brand.title()}"
    else:
        search_url = f"{base_url}{query.replace(' ', '+')}"
        
    print(f"DEBUG: Tighter Amazon Search URL: {search_url}", file=sys.stderr)
    
    driver.get(search_url)
    time.sleep(random.uniform(2, 4))
    
    # Check for Bot Block
    if "Robot Check" in driver.title or "Captcha" in driver.title:
        print("DEBUG: Amazon blocked the request.", file=sys.stderr)
        return None, None

    try:
        wait = WebDriverWait(driver, 10)
        
        # Get ALL result cards
        cards = wait.until(EC.presence_of_all_elements_located(
            (By.CSS_SELECTOR, "div[data-component-type='s-search-result']")
        ))
        
        # Determine the "Brand" we must find (e.g., "Dell" from "Dell Inspiron 15")
        required_brand = query.split()[0].lower() 

        for card in cards:
            try:
                # 1. Get Title
                # Try multiple title selectors in case one fails
                title_text = ""
                for selector in ["h2 a span", "h2 span", ".a-size-medium"]:
                    try:
                        title_elm = card.find_element(By.CSS_SELECTOR, selector)
                        title_text = title_elm.text
                        if title_text: break
                    except: continue
                
                if not title_text: continue

                # --- 🛑 THE CRITICAL FIX: BRAND GATE ---
                # If the user searched "Dell" and the title doesn't say "dell", SKIP IT.
                if required_brand not in title_text.lower():
                    print(f"DEBUG: Skipping Ad/Mismatch: {title_text}", file=sys.stderr)
                    continue 
                # ---------------------------------------

                # 2. Get Price (Only if title passed the check)
                price_text = ""
                for selector in ["span.a-price span.a-offscreen", "span.a-price-whole"]:
                    try:
                        price_elm = card.find_element(By.CSS_SELECTOR, selector)
                        price_text = price_elm.get_attribute("innerHTML") or price_elm.text
                        if price_text: break
                    except: continue
                
                if not price_text: continue

                # If we get here, we found a DELL laptop with a PRICE.
                print(f"DEBUG: Match Found! {title_text}", file=sys.stderr)
                
                clean_price = price_text.replace("₹", "").replace(",", "").strip()
                if "." in clean_price: clean_price = clean_price.split(".")[0]
                
                # Ensure it is a float
                clean_price = re.sub(r"[^0-9.]", "", clean_price)
                    
                return float(clean_price), title_text

            except Exception:
                continue
        
        return None, "No matching product found."

    except Exception as e:
        print(f"DEBUG: Error: {e}", file=sys.stderr)
        return None, None

def scrape_product_data(url, retailer, master_product_title=None):
    driver = initialize_driver()
    if driver is None:
        return {"status": "error", "retailer": retailer, "message": "WebDriver initialization failed."}
    
    try:
        # --- SPECIAL HANDLING FOR AMAZON ---
        if retailer == 'Amazon.in':
            # Extract query from URL or use master title if available
            # For simplicity, we'll infer the query from the master title or fallback
            query = master_product_title if master_product_title else "laptop" 
            # If url was passed, we might ignore it in favor of search page scraping for stability
            # But let's try to extract query from the url if possible, or just use the master title
            
            price, title = scrape_amazon_search_page(driver, query)
            
            if price and title:
                 # --- FUZZY MATCHING VALIDATION ---
                if master_product_title:
                    cleaned_master = clean_title_for_matching(master_product_title)
                    cleaned_scraped = clean_title_for_matching(title)
                    match_score = fuzz.token_set_ratio(cleaned_master.lower(), cleaned_scraped.lower())
                    
                    if match_score < 95:
                        return {
                            "status": "error", 
                            "retailer": retailer, 
                            "message": f"Product mismatch detected. Score: {match_score}/100. Expected: '{master_product_title}', Found: '{title}'"
                        }

                return {"status": "success", "retailer": retailer, "title": title, "price": price, "url": url}
            else:
                 return {"status": "error", "retailer": retailer, "message": "Could not find valid product on Amazon search page."}

        # --- STANDARD LOGIC FOR FLIPKART ---
        driver.get(url)
        
        # --- ANTI-BOT DELAY & CHECK ---
        time.sleep(random.uniform(2, 4))
        # print(f"DEBUG: Current Page Title is: {driver.title}", file=sys.stderr)
        
        if "Robot Check" in driver.title or "Captcha" in driver.title:
             return {"status": "error", "retailer": retailer, "message": "Amazon detected a bot! Try changing User-Agent or IP."}

        # Get the list of selectors for the current retailer
        retailer_selectors = SELECTORS.get(retailer)
        if not retailer_selectors:
             return {"status": "error", "retailer": retailer, "message": f"Retailer '{retailer}' not supported."}

        # --- NAVIGATION LOGIC: Search Page -> Product Page ---
        # If we are on a search page (which we are, based on the URL construction), we need to click the first result.
        try:
            # Try to find a product link using the search_result_link selectors
            product_link_element = find_resilient_element(driver, retailer_selectors.get('search_result_link', []), timeout=10)
            product_url = product_link_element.get_attribute('href')
            # print(f"DEBUG: Navigating to product page: {product_url}", file=sys.stderr)
            driver.get(product_url)
        except TimeoutException:
            # If we can't find a product link, maybe we are already on a product page or the search failed.
            # We'll proceed to try scraping price/title from the current page, just in case.
            pass 

        # Use the resilient finder for price. For Amazon, prefer XPath inside the stable price container,
        # then fall back to the generic selectors list if XPath fails.
        try:
            price_element = None
            if retailer == 'Amazon.in':
                # Try several XPath variants that target the main price containers and inner spans.
                amazon_xpaths = [
                    "//*[@id='corePriceDisplay_desktop_feature_div']//span[contains(@class,'a-offscreen')]",
                    "//*[@id='corePriceDisplay_desktop_feature_div']//span[contains(@class,'a-price-whole')]",
                    "//*[@id='corePrice_feature_div']//span[contains(@class,'a-offscreen')]",
                    "//*[@id='corePrice_feature_div']//span[contains(@class,'a-price-whole')]"
                ]

                for xp in amazon_xpaths:
                    try:
                        price_element = WebDriverWait(driver, 10).until(
                            EC.presence_of_element_located((By.XPATH, xp))
                        )
                        break
                    except TimeoutException:
                        continue

                # If XPath attempts didn't find anything, fall back to general selectors
                if price_element is None:
                    price_element = find_resilient_element(driver, retailer_selectors['price'])
            else:
                price_element = find_resilient_element(driver, retailer_selectors['price'])

            price_text = price_element.get_attribute('innerHTML') or price_element.text
            # Keep only digits and dots (handles rupee symbol, commas, non-breaking spaces)
            cleaned_price = re.sub(r"[^0-9.]", "", price_text)
            if cleaned_price == "":
                raise TimeoutException("Price text empty or not parsable")
            # Convert to float; many pages show whole numbers only
            final_price = float(cleaned_price)
        except TimeoutException:
             return {"status": "error", "retailer": retailer, "message": "Could not find price element using any known selector or XPath."}

        # Use the resilient finder for title (using presence instead of visibility for title is sometimes safer, but visibility is good for now)
        try:
            # For title, we can reuse the same logic, or create a separate one if we want to check for presence only
            title_element = find_resilient_element(driver, retailer_selectors['title'])
            title_text = title_element.text.strip()
        except TimeoutException:
             title_text = "Title not found" # Non-critical failure

        # --- FUZZY MATCHING VALIDATION ---
        if master_product_title and title_text != "Title not found":
            # Pre-process titles for better comparison
            cleaned_master = clean_title_for_matching(master_product_title)
            cleaned_scraped = clean_title_for_matching(title_text)
            
            match_score = fuzz.token_set_ratio(cleaned_master.lower(), cleaned_scraped.lower())
            # print(f"DEBUG: Fuzzy Match Score: {match_score} (Master: '{master_product_title}' vs Scraped: '{title_text}')", file=sys.stderr)
            
            if match_score < 95:
                return {
                    "status": "error", 
                    "retailer": retailer, 
                    "message": f"Product mismatch detected. Score: {match_score}/100. Expected: '{master_product_title}', Found: '{title_text}'"
                }

        return {"status": "success", "retailer": retailer, "title": title_text, "price": final_price, "url": url}

    except Exception as e:
        return {"status": "error", "retailer": retailer, "message": f"An unexpected error occurred: {str(e)}"}
    finally:
        if driver:
            driver.quit()

if __name__ == "__main__":
    if len(sys.argv) > 2:
        product_query = sys.argv[1]
        retailer = sys.argv[2]
        master_product_title = sys.argv[3] if len(sys.argv) > 3 else None
        
        if retailer == 'Amazon.in':
            url = f"https://www.amazon.in/s?k={product_query.replace(' ', '+')}"
        elif retailer == 'Flipkart':
            url = f"https://www.flipkart.com/search?q={product_query.replace(' ', '+')}"
        else:
            url = ""

        if url:
            result = scrape_product_data(url, retailer, master_product_title)
            print(json.dumps(result))
        else:
            print(json.dumps({"status": "error", "message": "Invalid retailer specified."}))
    else:
        print(json.dumps({"status": "error", "message": "Usage: scraper.py <product_query> <retailer> [master_product_title]"}))