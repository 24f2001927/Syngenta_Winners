# Syngenta Data Analysis Methodology & Explanation

This document explains how the data analysis was performed, the tools used, and the logic behind each of the four optimization areas.

## 1. Technical Approach

### Tools Used:
- **Python 3.14**: The primary programming language.
- **Pandas**: Used for data manipulation, joining large CSV files, and performing aggregations.
- **Virtual Environment (venv)**: Used to manage dependencies in a clean, isolated environment.

### Workflow:
1. **Data Ingestion**: All CSV files were loaded into Pandas DataFrames. Date columns were converted to datetime objects to allow for time-series analysis (e.g., weekly velocity, campaign timing).
2. **Data Cleaning**: Handled missing values (filled with 0 for inventory/sales) and standardized SKU names across different tables.
3. **Relational Joining**: Linked disparate datasets (e.g., POS data with Inventory data) using common keys like `retailer_id`, `sku_id`, and `week_end_date`.

---

## 2. Methodology by Domain

### I. Supply Chain & Inventory Optimization
*   **Metric**: *Sales Velocity* (Total units sold per retailer per week).
*   **Calculation**: Aggregated `retailer_pos.csv` by retailer, SKU, and week.
*   **Optimization Logic**: Joined this velocity with `retailer_inventory_weekly.csv`. A **Stockout Risk** was flagged if a retailer's inventory was less than twice their weekly sales velocity.
*   **Outcome**: Identified specific retailers and regions where demand is outstripping supply.

### II. Customer & Market Insights (Growers)
*   **Segmentation**: Farmers were grouped into categories (Marginal, Small, Medium, Large) based on `grower_farm_size`.
*   **Device Strategy**: Analyzed `device_type` to determine the reach of digital tools.
*   **Outcome**: Discovered that while smartphone usage is dominant, a significant portion still relies on keypads, requiring a hybrid digital-SMS communication strategy.

### III. Marketing ROI & Omnichannel Funnels
*   **Funnel Analysis**: Calculated `Visit Rate` (Visits/Impressions) and `Lead Rate` (Leads/Visits) from `digital_funnel_weekly.csv`.
*   **Attribution**: Correlated the `clicked_status` from `whatsapp_campaign.csv` with daily spikes in `retailer_pos.csv` for the specific products mentioned in the messages.
*   **Outcome**: Validated that WhatsApp outreach has a direct, measurable impact on Point-of-Sale volume.

### IV. Sales Force & Operations Management
*   **Performance Tracking**: Counted total visits per `rep_id` from `retailer_visit_log.csv`.
*   **Territory Balancing**: Calculated the number of retailers assigned per `territory_id`.
*   **Outcome**: Provided a baseline for rebalancing workloads where certain reps cover significantly more retailers or larger geographies than others.

---

## 3. How to Run the Analysis
To reproduce these results, run the provided `analyze_syngenta.py` script:
```bash
python3 analyze_syngenta.py
```
Results will be generated in the `analysis_results/` directory as CSV files, ready for visualization in tools like Excel, PowerBI, or Tableau.
