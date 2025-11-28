# File: ml_service/price_predictor.py
import sys
import json
import pandas as pd
from prophet import Prophet
import random
from datetime import datetime, timedelta

def get_historical_data(product_id, current_price):
    """
    Generates a simulated historical price dataset for a product.
    Returns a Pandas DataFrame with 'ds' and 'y' columns.
    """
    # Simulate fetching data from a database
    # Use current_price as the baseline to ensure relevance
    base_price = current_price 
    data = []
    today = datetime.now()
    for i in range(90): # 90 days of historical data
        date = today - timedelta(days=i)
        # Introduce some trend and noise around the current price
        # Simulate a slight upward trend over time (so past prices were lower) or random fluctuation
        price = base_price * (1 - random.uniform(-0.05, 0.05)) # +/- 5% fluctuation
        data.append([date.strftime('%Y-%m-%d'), round(price, 2)])
    
    df = pd.DataFrame(data, columns=['ds', 'y'])
    df['ds'] = pd.to_datetime(df['ds'])
    return df.sort_values(by='ds')

def get_price_recommendation(product_id, current_price):
    """
    Analyzes historical price data and provides a buy/wait recommendation.
    """
    try:
        # 1. Get and prepare historical data
        df = get_historical_data(product_id, current_price)
        
        if df.empty or len(df) < 10:
            return {
                "advice": "INSUFFICIENT_DATA",
                "message": "Not enough historical data to make a reliable prediction.",
                "min_predicted_price": None
            }

        # 2. Implement and train the Prophet model
        m = Prophet(daily_seasonality=True, yearly_seasonality=False, weekly_seasonality=True)
        m.fit(df)

        # 3. Forecast future prices
        future = m.make_future_dataframe(periods=14) # Predict for the next 14 days
        forecast = m.predict(future)

        # 4. Actionable Logic: Extract insights from the forecast
        # Get the minimum predicted price over the forecast period (from the lower bound of the uncertainty interval)
        min_predicted_price = round(forecast['yhat_lower'].tail(14).min(), 2)

        advice = "UNKNOWN"
        message = ""

        # Decision threshold: Is the current price more than 5% higher than the predicted minimum?
        if current_price > min_predicted_price * 1.05:
            advice = "WAIT"
            potential_saving = round(current_price - min_predicted_price, 2)
            message = f"The price is likely to drop. You could save approximately ₹{potential_saving} by waiting."
        else:
            advice = "BUY NOW"
            message = "This is a good price. It's not expected to drop significantly in the near future."

        return {
            "advice": advice,
            "message": message,
            "min_predicted_price": min_predicted_price
        }

    except Exception as e:
        return {
            "advice": "ERROR",
            "message": f"An error occurred during prediction: {str(e)}",
            "min_predicted_price": None
        }


if __name__ == "__main__":
    # This script expects a JSON string with 'productId' and 'currentPrice'
    # e.g., python price_predictor.py '{"productId": "some-product-123", "currentPrice": 12000}'
    input_data = json.loads(sys.argv[1])
    product_id = input_data.get("productId")
    current_price = input_data.get("currentPrice")

    if product_id and current_price is not None:
        recommendation = get_price_recommendation(product_id, float(current_price))
        print(json.dumps(recommendation))
    else:
        error_msg = {"advice": "ERROR", "message": "Missing 'productId' or 'currentPrice' in input."}
        print(json.dumps(error_msg))