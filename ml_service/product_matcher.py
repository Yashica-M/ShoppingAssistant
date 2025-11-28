import re
from thefuzz import fuzz

# Pre-compiled regex for efficiency
PUNCTUATION_REGEX = re.compile(r'[^\w\s]')
# Common stop words found in product titles
STOP_WORDS = set([
    'a', 'an', 'the', 'and', 'or', 'in', 'on', 'for', 'with', 'of', 'at', 
    'by', 'new', 'latest', 'model', 'gb', 'ram', 'storage'
])

def clean_title(title):
    """
    Cleans a product title for fuzzy matching.
    - Converts to lowercase
    - Removes punctuation
    - Removes common stop words
    """
    title = title.lower()
    title = PUNCTUATION_REGEX.sub('', title)
    title = ' '.join([word for word in title.split() if word not in STOP_WORDS])
    return title.strip()

def match_title_score(title1, title2):
    """
    Calculates a fuzzy matching score between two cleaned product titles
    using token_set_ratio, which is robust to word order.
    """
    cleaned_title1 = clean_title(title1)
    cleaned_title2 = clean_title(title2)
    return fuzz.token_set_ratio(cleaned_title1, cleaned_title2)

def find_master_match(scraped_title, master_products_dict, min_score_threshold=90):
    """
    Finds the best matching master product for a scraped title.

    Args:
        scraped_title (str): The title of the newly scraped product.
        master_products_dict (dict): A dictionary of master products where keys are
                                     Master Product IDs and values are their titles.
        min_score_threshold (int): The minimum score to be considered a match.

    Returns:
        A tuple containing (master_product_id, confidence_score) if a match is found,
        otherwise (None, 0).
    """
    best_match_id = None
    highest_score = 0

    for master_id, master_title in master_products_dict.items():
        score = match_title_score(scraped_title, master_title)
        if score > highest_score:
            highest_score = score
            best_match_id = master_id
            
    if highest_score >= min_score_threshold:
        return (best_match_id, highest_score)
    else:
        return (None, 0)

# --- Example Usage ---
if __name__ == '__main__':
    # Simulate a master product database
    master_products = {
        "MP1001": "Apple iPhone 15 Pro Max (256GB) - Natural Titanium",
        "MP1002": "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
        "MP1003": "Samsung Galaxy S24 Ultra 5G (12GB RAM, 512GB Storage)",
    }

    # --- Test Case 1: Reordered words and different case ---
    scraped_title_1 = "WH-1000XM5 Sony Noise Cancelling Wireless Headphones"
    match_id_1, score_1 = find_master_match(scraped_title_1, master_products)

    print(f"--- Matching Test 1 ---")
    print(f"Scraped Title: '{scraped_title_1}'")
    print(f"Cleaned Scraped Title: '{clean_title(scraped_title_1)}'")
    print(f"Best Match in DB: '{master_products.get(match_id_1)}' (ID: {match_id_1})")
    print(f"Confidence Score: {score_1}%\n")
    # Expected Output: High score (>=90) for MP1002

    # --- Test Case 2: Partial match with extra details ---
    scraped_title_2 = "New Apple iPhone 15 Pro Max 256GB"
    match_id_2, score_2 = find_master_match(scraped_title_2, master_products)

    print(f"--- Matching Test 2 ---")
    print(f"Scraped Title: '{scraped_title_2}'")
    print(f"Cleaned Scraped Title: '{clean_title(scraped_title_2)}'")
    print(f"Best Match in DB: '{master_products.get(match_id_2)}' (ID: {match_id_2})")
    print(f"Confidence Score: {score_2}%\n")
    # Expected Output: High score (>=90) for MP1001

    # --- Test Case 3: No good match ---
    scraped_title_3 = "Google Pixel 8 Pro"
    match_id_3, score_3 = find_master_match(scraped_title_3, master_products)

    print(f"--- Matching Test 3 ---")
    print(f"Scraped Title: '{scraped_title_3}'")
    print(f"Cleaned Scraped Title: '{clean_title(scraped_title_3)}'")
    if match_id_3:
        print(f"Best Match in DB: '{master_products.get(match_id_3)}' (ID: {match_id_3})")
    else:
        print("Best Match in DB: None")
    print(f"Confidence Score: {score_3}%")
    # Expected Output: Low score (<90), no match found
