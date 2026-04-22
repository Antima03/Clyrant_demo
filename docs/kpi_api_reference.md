# KPI & Chart API Reference

> **Audience:** Frontend Developers  
> **Base URL:** `/api/v1/kpi`  
> **Auth:** Bearer token required on all endpoints  
> **All monetary values are masked** (multiplied by a server-side factor) — use them for display only, never for raw calculations.

---

## Common Query Parameters

| Parameter    | Type     | Values                        | Default | Notes                                     |
| ------------ | -------- | ----------------------------- | ------- | ----------------------------------------- |
| `time`       | string   | `MTD` `QTD` `YTD` `CUSTOM`    | `MTD`   | Period selector                           |
| `as_of`      | date     | `YYYY-MM-DD`                  | today   | Reference date for MTD/QTD/YTD            |
| `start_date` | date     | `YYYY-MM-DD`                  | —       | Required when `time=CUSTOM`               |
| `end_date`   | date     | `YYYY-MM-DD`                  | —       | Required when `time=CUSTOM`               |
| `region`     | string   | `North` `South` `East` `West` | —       | Optional geo filter                       |
| `state`      | string   | from `/filter-options`        | —       | Optional state filter                     |
| `category`   | string[] | from `/filter-options`        | —       | Multi-select; repeat param for each value |

---

## Filter Options

### `GET /primary-kpi/filter-options`

Returns dropdown values for region, state, and category filters.

**Response:**

```json
{
  "regions": ["East", "North", "South", "West"],
  "states": ["Maharashtra", "Karnataka", ...],
  "categories": ["Sanitary Napkins", "Diapers", "Utensil Cleaners"]
}
```

---

## Primary KPIs

### 1. `GET /primary-kpi/net-sales`

**Formula:** `SUM(gross_sale_value)` from `vw_primary_invoice_data`

**Parameters:** `time`, `as_of`, `start_date`, `end_date`, `region`, `state`, `category`

**Response:**

```json
{
  "as_of": "2026-04-21",
  "time": "MTD",
  "mtd": 1300000,
  "qtd": 3800000,
  "ytd": 9200000,
  "lm": 1450000,
  "lysm": 1495000,
  "mtd_vs_lm_pct": -10.3,
  "mtd_vs_lysm_pct": -13.0
}
```

| Field             | Meaning                          |
| ----------------- | -------------------------------- |
| `mtd`             | Month-to-date sales (masked ₹)   |
| `lm`              | Last month full period           |
| `lysm`            | Last year same month             |
| `mtd_vs_lm_pct`   | % change vs last month           |
| `mtd_vs_lysm_pct` | % change vs last year same month |

---

### 2. `GET /primary-kpi/sales-vs-target`

**Formula:** `SUM(actual_sales) / SUM(target_sales) × 100`  
**Sources:** `vw_primary_invoice_data` (actual) + `sotarget` (target)

**Parameters:** `time`, `as_of`, `start_date`, `end_date`, `region`, `state`, `category`

**Response:**

```json
{
  "as_of": "2026-04-21",
  "time": "MTD",
  "actual_sales": 1300000,
  "target_sales": 1500000,
  "achievement_pct": 86.7,
  "lm_achievement_pct": 91.2,
  "lysm_achievement_pct": 88.4
}
```

---

### 3. `GET /primary-kpi/absolute-reach`

**Formula:** `COUNT(DISTINCT outlet_code)` from `vw_l_dms_invoice_data`

**Parameters:** `time`, `as_of`, `start_date`, `end_date`, `region`, `state`, `category`

**Response:**

```json
{
  "as_of": "2026-04-21",
  "time": "MTD",
  "mtd_outlets": 42800,
  "lm_outlets": 44100,
  "lysm_outlets": 47200,
  "mtd_vs_lm_pct": -2.9,
  "mtd_vs_lysm_pct": -9.3
}
```

---

## Secondary KPIs

### 4. `GET /secondary-kpi/primary-vs-secondary-gap`

**Formula:** `(Primary Sales − Secondary Sales) / Primary Sales × 100`  
**Interpretation:** High gap = pipeline stuffing (inventory at distributor not moving to retail)

**Parameters:** `time`, `as_of`, `start_date`, `end_date`, `region`, `state`, `category`

**Response:**

```json
{
  "as_of": "2026-04-21",
  "time": "MTD",
  "primary_sales": 1300000,
  "secondary_sales": 897000,
  "gap": 403000,
  "gap_pct": 31.0,
  "interpretation": "High gap — potential pipeline stuffing"
}
```

---

### 5. `GET /secondary-kpi/fill-rate`

**Formula:** `SUM(billed_qty) / SUM(ordered_qty) × 100`  
**Sources:** `vw_l_secondary_visit_order_shifted_mapped_only` (orders) + `vw_l_dms_invoice_data` (billing)

**Parameters:** `time`, `as_of`, `start_date`, `end_date`, `region`, `state`, `category`

**Response:**

```json
{
  "as_of": "2026-04-21",
  "time": "MTD",
  "ordered_qty": 125000,
  "billed_qty": 108750,
  "fill_rate_pct": 87.0
}
```

---

## Tertiary KPIs

### 6. `GET /tertiary-kpi/lines-per-call`

**Formula:** `COUNT(DISTINCT SKUs billed) / COUNT(DISTINCT calls)`  
**Interpretation:** Higher = better sales execution (more products sold per visit)

**Parameters:** `time`, `as_of`, `start_date`, `end_date`, `region`, `state`, `category`

**Response:**

```json
{
  "as_of": "2026-04-21",
  "time": "MTD",
  "total_calls": 8400,
  "total_sku_lines": 23520,
  "lpc": 2.8
}
```

---

### 7. `GET /tertiary-kpi/productivity`

**Formula:** `COUNT(DISTINCT billed outlets) / COUNT(DISTINCT assigned outlets) × 100`  
**Alert trigger:** productivity < 50%

**Parameters:** `time`, `as_of`, `start_date`, `end_date`, `region`, `state`

**Response:**

```json
{
  "as_of": "2026-04-21",
  "time": "MTD",
  "billed_outlets": 42800,
  "assigned_outlets": 98200,
  "productivity_pct": 43.6,
  "alert": true
}
```

---

## Chart APIs

### 8. `GET /charts/primary-sales-by-region`

**Chart type:** `lineStackedColumnComboChart`  
**Bars:** Current period sales per region  
**Line:** GOLY% (Growth Over Last Year %)

**Parameters:** `time`, `as_of`, `start_date`, `end_date`, `state`, `category`  
_(No `region` filter — region is the grouping dimension)_

**Response:**

```json
{
  "as_of": "2026-04-21",
  "chart": "Primary Sales by Region",
  "chart_type": "lineStackedColumnComboChart",
  "data": [
    {
      "region": "NORTH-1",
      "primary_sales_value": 20500000,
      "primary_sales_ly_value": 22500000,
      "primary_sales_value_goly_pct": -8.9
    },
    {
      "region": "WEST",
      "primary_sales_value": 15300000,
      "primary_sales_ly_value": 15300000,
      "primary_sales_value_goly_pct": -0.2
    }
  ]
}
```

---

### 9. `GET /charts/primary-sales-drilldown`

**Chart type:** `lineStackedColumnComboChart`  
**4-level geo drilldown** — auto-detects level from params passed:

| Params passed                   | Groups by           | `drill_level` |
| ------------------------------- | ------------------- | ------------- |
| _(none)_                        | `customer_zone`     | `"region"`    |
| `region`                        | `customer_state`    | `"state"`     |
| `region` + `state`              | `customer_district` | `"district"`  |
| `region` + `state` + `district` | `customer_city`     | `"city"`      |

**Parameters:** `time`, `as_of`, `start_date`, `end_date`, `region`, `state`, `district`, `category`

**Response:**

```json
{
  "drill_level": "state",
  "group_by": "state",
  "data": [
    {
      "state": "Maharashtra",
      "primary_sales_value": 8200000,
      "primary_sales_ly_value": 9100000,
      "primary_sales_value_goly_pct": -9.9
    }
  ]
}
```

> **Frontend usage:** On bar click, pass the clicked value as the next level's filter param to drill deeper.

---

### 10. `GET /charts/primary-sales-by-product`

**Chart type:** `lineStackedColumnComboChart`  
**2-level product drilldown:**

| Params passed | Groups by                | `drill_level` |
| ------------- | ------------------------ | ------------- |
| _(none)_      | `sku_h4_name` (Division) | `"division"`  |
| `division`    | `sku_h3_name` (Category) | `"category"`  |

> ⚠️ Drilldown stops at `sku_h3_name` — no transaction data exists below this grain.

**Parameters:** `time`, `as_of`, `start_date`, `end_date`, `region`, `state`, `division`

**Response:**

```json
{
  "drill_level": "division",
  "group_by": "division",
  "data": [
    {
      "division": "SHOE",
      "primary_sales_value": 28200000,
      "primary_sales_ly_value": 26857143,
      "primary_sales_value_goly_pct": 5.0
    },
    {
      "division": "HAWAI",
      "primary_sales_value": 17500000,
      "primary_sales_ly_value": 25362319,
      "primary_sales_value_goly_pct": -31.0
    },
    {
      "division": "FLITE PU",
      "primary_sales_value": 15000000,
      "primary_sales_ly_value": 17647059,
      "primary_sales_value_goly_pct": -15.0
    },
    {
      "division": "FLITE",
      "primary_sales_value": 14400000,
      "primary_sales_ly_value": 14693878,
      "primary_sales_value_goly_pct": -2.0
    }
  ]
}
```

---

### 11. `GET /charts/outlet-funnel`

**Chart type:** Funnel chart (4 stages)

**Parameters:** `time`, `as_of`, `start_date`, `end_date`

**Response:**

```json
{
  "as_of": "2026-04-21",
  "chart": "Outlet Funnel",
  "end_to_end_conv_pct": 43.6,
  "stages": [
    {
      "stage": "Total Outlet Universe",
      "label": "Outlets in DMS",
      "count": 98200,
      "conv_pct": 100.0,
      "drop_to_next_pct": 14.0,
      "golm_pct": 100.0
    },
    {
      "stage": "Covered Outlets",
      "label": "Visited / Called this period",
      "count": 84500,
      "conv_pct": 86.0,
      "drop_to_next_pct": 27.6,
      "golm_pct": 88.0
    },
    {
      "stage": "Productive Outlets",
      "label": "Order captured in DMS",
      "count": 61200,
      "conv_pct": 62.3,
      "drop_to_next_pct": 30.1,
      "golm_pct": 72.0
    },
    {
      "stage": "Billed Outlets",
      "label": "Invoice raised",
      "count": 42800,
      "conv_pct": 43.6,
      "drop_to_next_pct": null,
      "golm_pct": 54.0
    }
  ]
}
```

| Field                 | Meaning                                            |
| --------------------- | -------------------------------------------------- |
| `conv_pct`            | Stage count as % of Universe                       |
| `drop_to_next_pct`    | % drop-off to the next stage                       |
| `golm_pct`            | Current count as % of same-elapsed-days last month |
| `end_to_end_conv_pct` | Billed / Universe % (shown in chart header)        |

---

### 12. `GET /charts/sec-vs-pri-ratio`

**Chart type:** `lineChart`  
**X-axis:** Month  
**Y-axis:** Secondary / Primary sales ratio %  
**Dashed line:** Norm reference (default 80%)

**Parameters:**

| Parameter  | Type     | Default | Notes                              |
| ---------- | -------- | ------- | ---------------------------------- |
| `months`   | int      | `4`     | Number of months to show on X-axis |
| `as_of`    | date     | today   | Right edge of chart                |
| `region`   | string   | —       | Optional                           |
| `state`    | string   | —       | Optional                           |
| `category` | string[] | —       | Optional                           |
| `norm`     | float    | `80.0`  | Target reference line value        |

**Response:**

```json
{
  "chart": "Sec vs Pri Ratio",
  "chart_type": "lineChart",
  "months": 4,
  "current_ratio_pct": 78.0,
  "lm_ratio_pct": 77.0,
  "delta_pp": 1.0,
  "norm_pct": 80.0,
  "series": [
    {
      "month": "Sep 2024",
      "secondary_vs_primary_ratio": 71.2,
      "primary_sales_value": 14000000,
      "secondary_sales_value": 9960000
    },
    {
      "month": "Oct 2024",
      "secondary_vs_primary_ratio": 73.8,
      "primary_sales_value": 15200000,
      "secondary_sales_value": 11218000
    },
    {
      "month": "Nov 2024",
      "secondary_vs_primary_ratio": 77.1,
      "primary_sales_value": 17100000,
      "secondary_sales_value": 13184000
    },
    {
      "month": "Dec 2024",
      "secondary_vs_primary_ratio": 78.0,
      "primary_sales_value": 14400000,
      "secondary_sales_value": 11232000
    }
  ]
}
```

| Field               | Meaning                                                        |
| ------------------- | -------------------------------------------------------------- |
| `current_ratio_pct` | Ratio for the latest (partial) month                           |
| `lm_ratio_pct`      | Ratio for the prior full month                                 |
| `delta_pp`          | `current − lm` in percentage points (show as `▲1pp` or `▼2pp`) |
| `norm_pct`          | Render as dashed reference line                                |

**Business meaning:** `Dec 69%` = for every ₹100 pushed from company to distributor, only ₹69 moved to retail. Declining ratio = pipeline stuffing risk.

---

### 13. `GET /charts/outlet-billed-vs-ordered`

**Chart type:** `lineChart` (two lines)  
**Light blue line:** Outlet Billed — unique outlets that received an invoice  
**Dark blue line:** Outlet Order Taken — unique outlets where an order was placed  
**Shaded area between lines:** Gap = orders not converted to a bill/delivery

**Parameters:**

| Parameter | Type | Default | Notes                      |
| --------- | ---- | ------- | -------------------------- |
| `months`  | int  | `4`     | Number of months on X-axis |
| `as_of`   | date | today   | Right edge of chart        |

**Response:**

```json
{
  "chart": "Outlet Billed vs Outlet Order Taken",
  "chart_type": "lineChart",
  "months": 4,
  "current_month": {
    "month": "Dec 2024",
    "outlet_billed": 42800,
    "outlet_order_taken": 61200,
    "gap": 18400,
    "billed_vs_lm_delta": -1300,
    "ordered_vs_lm_delta": -800
  },
  "series": [
    {
      "month": "Sep 2024",
      "outlet_billed": 39200,
      "outlet_order_taken": 56400,
      "gap": 17200
    },
    {
      "month": "Oct 2024",
      "outlet_billed": 40100,
      "outlet_order_taken": 57800,
      "gap": 17700
    },
    {
      "month": "Nov 2024",
      "outlet_billed": 44100,
      "outlet_order_taken": 62000,
      "gap": 17900
    },
    {
      "month": "Dec 2024",
      "outlet_billed": 42800,
      "outlet_order_taken": 61200,
      "gap": 18400
    }
  ]
}
```

| Field                | Meaning                                                     |
| -------------------- | ----------------------------------------------------------- |
| `outlet_billed`      | `DISTINCTCOUNT(outlet_code)` from DMS (`invoice_date` axis) |
| `outlet_order_taken` | `DISTINCTCOUNT(outlet_code)` from SFA (`order_date` axis)   |
| `gap`                | `ordered − billed` — render as shaded area between lines    |
| `*_vs_lm_delta`      | Absolute count change vs prior month — show in chart header |

**Business meaning:** A growing gap means more orders are being placed but not fulfilled/invoiced — signals delivery or billing execution issues.

---

### 14. `GET /tertiary-kpi/throughput`

**Formula:** `SUM(net_sale_value) / COUNT(DISTINCT outlet_code)`  
**Source:** `vw_l_dms_invoice_data`  
**Interpretation:** Average secondary sales revenue generated per billed outlet in the period.

**Parameters:** `time`, `as_of`, `start_date`, `end_date`, `region`, `state`, `category`

**Response:**

```json
{
  "as_of": "2026-04-21",
  "time": "MTD",
  "kpi": "Throughput",
  "formula": "SUM(net_sale_value) / COUNT(DISTINCT outlet_code)",
  "current": {
    "secondary_sales": 897000,
    "billed_outlets": 42800,
    "throughput_value": 20955
  },
  "lm": {
    "secondary_sales": 940000,
    "billed_outlets": 44100,
    "throughput_value": 21315
  },
  "lysm": {
    "secondary_sales": 1050000,
    "billed_outlets": 47200,
    "throughput_value": 22246
  },
  "vs_lm_pct": -1.7,
  "vs_lysm_pct": -5.8
}
```

| Field              | Meaning                          |
| ------------------ | -------------------------------- |
| `throughput_value` | Masked ₹ per billed outlet       |
| `vs_lm_pct`        | % change vs last full month      |
| `vs_lysm_pct`      | % change vs last year same month |

---

### 15. `GET /primary-kpi/forecast-accuracy`

**Formula:** `(1 − ABS(forecast − actual) / actual) × 100`  
**Actual:** `SUM(vw_l_dms_invoice_data.net_sale_value)`  
**Forecast proxy:** `SUM(sotarget."Secondary Target") × 100000`

**Parameters:** `time`, `as_of`, `start_date`, `end_date`, `region`, `state`, `category`

> **Note:** Region/state filter applies to actuals (DMS) only. `sotarget` has no geo dimension.

**Response:**

```json
{
  "as_of": "2026-04-21",
  "time": "MTD",
  "kpi": "Forecast Accuracy %",
  "formula": "(1 - ABS(forecast - actual) / actual) × 100",
  "current": {
    "actual_sales": 897000,
    "forecast_sales": 950000,
    "forecast_accuracy_pct": 94.4
  },
  "lm": {
    "actual_sales": 940000,
    "forecast_sales": 980000,
    "forecast_accuracy_pct": 95.9
  },
  "lysm": {
    "actual_sales": 1050000,
    "forecast_sales": 1100000,
    "forecast_accuracy_pct": 95.2
  },
  "vs_lm_pp": -1.5,
  "vs_lysm_pp": -0.8
}
```

| Field                   | Meaning                                              |
| ----------------------- | ---------------------------------------------------- |
| `forecast_accuracy_pct` | 100% = perfect forecast; lower = more deviation      |
| `vs_lm_pp`              | Percentage-point change vs last month (not % change) |
| `vs_lysm_pp`            | Percentage-point change vs last year same month      |

---

## Data Source Reference

| Table                                            | Used For                                                      |
| ------------------------------------------------ | ------------------------------------------------------------- |
| `vw_primary_invoice_data`                        | Primary sales (`gross_sale_value`)                            |
| `vw_l_dms_invoice_data`                          | Secondary/DMS sales (`net_sale_value`), billed outlets        |
| `vw_l_secondary_visit_order_shifted_mapped_only` | SFA orders, covered/productive outlets                        |
| `customer_master`                                | Region, state, district, city (via `customer_pdt_map`)        |
| `vw_l_product_hierarchy`                         | Product divisions (`sku_h4_name`), categories (`sku_h3_name`) |
| `sotarget`                                       | Sales targets                                                 |
| `geomaster`                                      | Filter-option dropdowns for state/region                      |

---

## Frontend Integration Notes

1. **Masked values** — All `*_sales_value` fields are numerically obfuscated. Display them as-is; do not perform arithmetic across endpoints.
2. **Drilldown pattern** — For `/charts/primary-sales-drilldown` and `/charts/primary-sales-by-product`, check `drill_level` in the response to know what level was returned, and use the dimension value from `data[n][group_label]` as the next filter param.
3. **State dropdown** — Always fetch `/primary-kpi/filter-options` on load to populate the state dropdown. Do not hardcode state names.
4. **Category multi-select** — Pass `category` as repeated query params: `?category=Diapers&category=SHOE`.
5. **Funnel click interaction** — Each `stage` in `/charts/outlet-funnel` can be used to filter the map layer; pass the stage name as context to the map API.
6. **Ratio delta color** — `delta_pp > 0` → green `▲`, `delta_pp < 0` → red `▼`, `delta_pp == 0` → neutral.
