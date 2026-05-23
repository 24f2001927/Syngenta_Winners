
import pandas as pd
import json
import os

# Set paths
DATA_DIR = "."
OUTPUT_DIR = "analysis_results"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def load_data():
    print("Loading datasets...")
    data = {
        "reps": pd.read_csv(f"{DATA_DIR}/reps_territory.csv"),
        "retailers": pd.read_csv(f"{DATA_DIR}/retailers.csv"),
        "visits": pd.read_csv(f"{DATA_DIR}/retailer_visit_log.csv"),
        "inventory": pd.read_csv(f"{DATA_DIR}/retailer_inventory_weekly.csv"),
        "pos": pd.read_csv(f"{DATA_DIR}/retailer_pos.csv"),
        "growers": pd.read_csv(f"{DATA_DIR}/growers.csv"),
        "funnel": pd.read_csv(f"{DATA_DIR}/digital_funnel_weekly.csv"),
        "whatsapp": pd.read_csv(f"{DATA_DIR}/whatsapp_campaign.csv"),
    }
    
    # Convert dates
    data["pos"]["transaction_date"] = pd.to_datetime(data["pos"]["transaction_date"])
    data["inventory"]["week_end_date"] = pd.to_datetime(data["inventory"]["week_end_date"])
    data["visits"]["visit_date"] = pd.to_datetime(data["visits"]["visit_date"])
    data["whatsapp"]["message_sent_date"] = pd.to_datetime(data["whatsapp"]["message_sent_date"])
    
    return data

def analyze_supply_chain(data):
    print("Analyzing Supply Chain & Inventory...")
    pos = data["pos"]
    inv = data["inventory"]
    
    # 1. Weekly Sales Velocity
    pos['week_end'] = pos['transaction_date'] + pd.to_timedelta((6 - pos['transaction_date'].dt.weekday), unit='D')
    weekly_sales = pos.groupby(['retailer_id', 'sku_id', 'week_end'])['sku_qty'].sum().reset_index()
    weekly_sales.rename(columns={'sku_qty': 'sales_velocity'}, inplace=True)
    
    # 2. Join with Inventory
    stock_analysis = pd.merge(inv, weekly_sales, left_on=['retailer_id', 'sku_id', 'week_end_date'], right_on=['retailer_id', 'sku_id', 'week_end'], how='left').fillna(0)
    
    # Identify Stockout Risks (Low stock, high velocity)
    # Let's say risk if stock < 2 * sales_velocity
    stock_analysis['stockout_risk'] = (stock_analysis['sku_qty'] < 2 * stock_analysis['sales_velocity']) & (stock_analysis['sales_velocity'] > 0)
    
    summary = stock_analysis.groupby('sku_name').agg({
        'sku_qty': 'mean',
        'sales_velocity': 'mean',
        'stockout_risk': 'sum'
    }).reset_index()
    
    summary.to_csv(f"{OUTPUT_DIR}/supply_chain_summary.csv", index=False)
    return summary

def analyze_growers(data):
    print("Analyzing Growers...")
    growers = data["growers"]
    
    # Farm size segmentation
    bins = [0, 2, 5, 10, 50, 1000]
    labels = ['Marginal (<2)', 'Small (2-5)', 'Medium (5-10)', 'Large (10-50)', 'Extra Large (50+)']
    growers['farm_segment'] = pd.cut(growers['grower_farm_size'], bins=bins, labels=labels)
    
    segment_stats = growers.groupby('farm_segment').size().reset_index(name='count')
    device_stats = growers.groupby('device_type').size().reset_index(name='count')
    
    segment_stats.to_csv(f"{OUTPUT_DIR}/grower_segments.csv", index=False)
    device_stats.to_csv(f"{OUTPUT_DIR}/grower_devices.csv", index=False)
    return segment_stats

def analyze_marketing(data):
    print("Analyzing Marketing ROI...")
    funnel = data["funnel"]
    wa = data["whatsapp"]
    pos = data["pos"]
    
    # Funnel Efficiency
    funnel['visit_rate'] = funnel['landing_page_visits'] / funnel['social_post_impression']
    funnel['lead_rate'] = funnel['lead_form_submission'] / funnel['landing_page_visits']
    
    # WhatsApp Impact
    # Group WA messages by product and date
    wa_daily = wa[wa['clicked_status'] == True].groupby(['campaign_product', 'message_sent_date']).size().reset_index(name='clicks')
    
    # Correlate with POS (simple check: total sales of messaged product on same days)
    pos_daily = pos.groupby(['sku_name', 'transaction_date'])['sku_qty'].sum().reset_index(name='total_sales')
    
    impact = pd.merge(wa_daily, pos_daily, left_on=['campaign_product', 'message_sent_date'], right_on=['sku_name', 'transaction_date'], how='inner')
    
    funnel.to_csv(f"{OUTPUT_DIR}/marketing_funnel.csv", index=False)
    impact.to_csv(f"{OUTPUT_DIR}/whatsapp_sales_impact.csv", index=False)
    return funnel

def analyze_sales_ops(data):
    print("Analyzing Sales Force Ops...")
    visits = data["visits"]
    reps = data["reps"]
    retailers = data["retailers"]
    
    # Rep Activity
    rep_activity = visits.groupby('rep_id').size().reset_index(name='visit_count')
    
    # Territory Balance
    territory_balance = retailers.groupby('territory_id').size().reset_index(name='retailer_count')
    
    # Recommendation impact (do visited retailers have more sales of recommended products?)
    # This requires linking visits to specific retailers, but visits only have tehsil/territory.
    # We can aggregate by tehsil.
    tehsil_visits = visits.groupby(['visit_tehsil', 'product_recommended']).size().reset_index(name='visit_count')
    
    rep_activity.to_csv(f"{OUTPUT_DIR}/rep_activity.csv", index=False)
    territory_balance.to_csv(f"{OUTPUT_DIR}/territory_balance.csv", index=False)
    return rep_activity

if __name__ == "__main__":
    df_dict = load_data()
    analyze_supply_chain(df_dict)
    analyze_growers(df_dict)
    analyze_marketing(df_dict)
    analyze_sales_ops(df_dict)
    print(f"Analysis complete. Results saved in {OUTPUT_DIR}/")
