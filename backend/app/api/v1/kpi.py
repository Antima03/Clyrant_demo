from fastapi import APIRouter, Query

import os
from datetime import date
from typing import List, Literal, Optional

from app.core.database import get_duckdb_connection

router = APIRouter()


def _mask_revenue(value: Optional[float]) -> Optional[float]:
    if value is None:
        return None
    multiplier = float(os.getenv("REVENUE_MASK_MULTIPLIER") or "0.73")
    offset = float(os.getenv("REVENUE_MASK_OFFSET") or "12345.67")
    return round((float(value) * multiplier) + offset, 2)


def _validate_identifier(name: str) -> str:
    allowed = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_\".")
    if not name or any(ch not in allowed for ch in name):
        raise ValueError("Invalid table name")
    return name


@router.get("/primary-kpi/net-sales")
async def net_sales(
    time: Literal["MTD", "QTD", "YTD", "CUSTOM"] = "MTD",
    as_of: Optional[date] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    region: Optional[Literal["North", "South", "East", "West"]] = None,
    state: Optional[str] = None,
    category: Optional[List[Literal["Sanitary Napkins", "Diapers", "Utensil Cleaners"]]] = Query(
        default=None
    ),
):
    as_of = as_of or date.today()

    con = get_duckdb_connection()
    try:
        con.execute(
            """
            CREATE OR REPLACE TEMP VIEW invoice_data AS
            SELECT
                CAST(i.invoice_date AS DATE)       AS invoice_date,
                CAST(i.gross_sale_value AS DOUBLE) AS net_sale_value,
                CAST(i.gross_sale_value AS DOUBLE) AS gross_sale_value,
                cm.customer_zone                   AS region,
                cm.customer_state                  AS state,
                i.sku_h3_name                      AS category
            FROM main.vw_primary_invoice_data i
            LEFT JOIN main.customer_master cm
                ON i.customer_pdt_map = cm.customer_pdt_map
            """
        )

        if time == "CUSTOM" and (start_date is None or end_date is None):
            raise ValueError("For time=CUSTOM you must pass start_date and end_date")

        where_clauses = ["1=1"]
        params: List[object] = []

        if region:
            where_clauses.append("region = ?")
            params.append(region)
        if state:
            where_clauses.append("state = ?")
            params.append(state)
        if category:
            placeholders = ",".join(["?"] * len(category))
            where_clauses.append(f"category IN ({placeholders})")
            params.extend(category)

        base_filter_sql = " AND ".join(where_clauses)

        sql = """
        WITH p AS (SELECT CAST(? AS DATE) AS as_of),
        bounds AS (
            SELECT
                as_of,
                date_trunc('month', as_of) AS mtd_start,
                as_of AS mtd_end,
                date_trunc('quarter', as_of) AS qtd_start,
                as_of AS qtd_end,
                date_trunc('year', as_of) AS ytd_start,
                as_of AS ytd_end,
                date_trunc('month', as_of - INTERVAL 1 MONTH) AS lm_start,
                least(
                    date_trunc('month', as_of - INTERVAL 1 MONTH) + (extract(day from as_of) - 1) * INTERVAL 1 DAY,
                    (date_trunc('month', as_of - INTERVAL 1 MONTH) + INTERVAL 1 MONTH - INTERVAL 1 DAY)
                ) AS lm_end,
                date_trunc('month', as_of - INTERVAL 1 YEAR) AS lysm_start,
                least(
                    date_trunc('month', as_of - INTERVAL 1 YEAR) + (extract(day from as_of) - 1) * INTERVAL 1 DAY,
                    (date_trunc('month', as_of - INTERVAL 1 YEAR) + INTERVAL 1 MONTH - INTERVAL 1 DAY)
                ) AS lysm_end
            FROM p
        ),
        base AS (
            SELECT i.*
            FROM invoice_data i
            WHERE """ + base_filter_sql + """
        ),
        agg AS (
            SELECT
                'MTD' AS period,
                SUM(net_sale_value) AS net_sales,
                SUM(gross_sale_value) AS gross_sales
            FROM base, bounds
            WHERE invoice_date BETWEEN mtd_start AND mtd_end

            UNION ALL
            SELECT
                'QTD' AS period,
                SUM(net_sale_value) AS net_sales,
                SUM(gross_sale_value) AS gross_sales
            FROM base, bounds
            WHERE invoice_date BETWEEN qtd_start AND qtd_end

            UNION ALL
            SELECT
                'YTD' AS period,
                SUM(net_sale_value) AS net_sales,
                SUM(gross_sale_value) AS gross_sales
            FROM base, bounds
            WHERE invoice_date BETWEEN ytd_start AND ytd_end

            UNION ALL
            SELECT
                'LM' AS period,
                SUM(net_sale_value) AS net_sales,
                SUM(gross_sale_value) AS gross_sales
            FROM base, bounds
            WHERE invoice_date BETWEEN lm_start AND lm_end

            UNION ALL
            SELECT
                'LYSM' AS period,
                SUM(net_sale_value) AS net_sales,
                SUM(gross_sale_value) AS gross_sales
            FROM base, bounds
            WHERE invoice_date BETWEEN lysm_start AND lysm_end
        )
        SELECT * FROM agg
        """

        custom_rows = None
        if time == "CUSTOM":
            custom_sql = (
                "WITH p AS (SELECT CAST(? AS DATE) AS as_of), "
                "base_custom AS (SELECT * FROM invoice_data WHERE " + base_filter_sql + ") "
                "SELECT SUM(net_sale_value) AS net_sales, SUM(gross_sale_value) AS gross_sales "
                "FROM base_custom WHERE invoice_date BETWEEN ? AND ?"
            )
            custom_rows = con.execute(custom_sql, [as_of] + params + [start_date, end_date]).fetchone()

        rows = con.execute(sql, [as_of] + params).fetchall()
        data = {period: {"net_sales": ns, "gross_sales": gs} for (period, ns, gs) in rows}

        current_period_key = time
        if time == "CUSTOM":
            current = {
                "net_sales": None if custom_rows is None else custom_rows[0],
                "gross_sales": None if custom_rows is None else custom_rows[1],
            }
        else:
            current = data.get(current_period_key, {})

        mtd = data.get("MTD", {})
        lm = data.get("LM", {})
        lysm = data.get("LYSM", {})

        def _variance(a: Optional[float], b: Optional[float]) -> Optional[float]:
            if a is None or b is None or b == 0:
                return None
            return round(((a - b) / b) * 100.0, 2)

        response = {
            "as_of": str(as_of),
            "filters": {
                "time": time,
                "start_date": None if start_date is None else str(start_date),
                "end_date": None if end_date is None else str(end_date),
                "region": region,
                "state": state,
                "category": category,
            },
            "current": {
                "period": time,
                "net_sales": _mask_revenue(current.get("net_sales")),
                "gross_sales": _mask_revenue(current.get("gross_sales")),
            },
            "comparisons": {
                "mtd_vs_lm_variance_pct": (
                    _variance(mtd.get("net_sales"), lm.get("net_sales")) if time == "MTD" else None
                ),
                "mtd_vs_lysm_variance_pct": (
                    _variance(mtd.get("net_sales"), lysm.get("net_sales")) if time == "MTD" else None
                ),
                "assumed_lysm_variance_pct": 11.0 if time == "MTD" else None,
            },
        }

        return response
    finally:
        try:
            con.close()
        except Exception:
            pass


@router.get("/primary-kpi/sales-vs-target")
async def sales_vs_target(
    time: Literal["MTD", "QTD", "YTD", "CUSTOM"] = "MTD",
    as_of: Optional[date] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    region: Optional[Literal["North", "South", "East", "West"]] = None,
    state: Optional[str] = None,
    category: Optional[List[Literal["Sanitary Napkins", "Diapers", "Utensil Cleaners"]]] = Query(
        default=None
    ),
):
    as_of = as_of or date.today()

    if time == "CUSTOM" and (start_date is None or end_date is None):
        raise ValueError("For time=CUSTOM you must pass start_date and end_date")

    if time == "MTD":
        actual_start_expr = "date_trunc('month', CAST(? AS DATE))"
        actual_end_expr = "CAST(? AS DATE)"
        target_where = "date_trunc('month', t.target_date) = date_trunc('month', CAST(? AS DATE))"
        actual_date_params: List[object] = [as_of, as_of]
        target_date_params: List[object] = [as_of]
    elif time == "QTD":
        actual_start_expr = "date_trunc('quarter', CAST(? AS DATE))"
        actual_end_expr = "CAST(? AS DATE)"
        target_where = (
            "date_trunc('quarter', t.target_date) = date_trunc('quarter', CAST(? AS DATE)) "
            "AND date_trunc('month', t.target_date) <= date_trunc('month', CAST(? AS DATE))"
        )
        actual_date_params = [as_of, as_of]
        target_date_params = [as_of, as_of]
    elif time == "YTD":
        actual_start_expr = "date_trunc('year', CAST(? AS DATE))"
        actual_end_expr = "CAST(? AS DATE)"
        target_where = (
            "date_trunc('year', t.target_date) = date_trunc('year', CAST(? AS DATE)) "
            "AND date_trunc('month', t.target_date) <= date_trunc('month', CAST(? AS DATE))"
        )
        actual_date_params = [as_of, as_of]
        target_date_params = [as_of, as_of]
    else:
        actual_start_expr = "CAST(? AS DATE)"
        actual_end_expr = "CAST(? AS DATE)"
        target_where = (
            "date_trunc('month', t.target_date) BETWEEN "
            "date_trunc('month', CAST(? AS DATE)) AND date_trunc('month', CAST(? AS DATE))"
        )
        actual_date_params = [start_date, end_date]
        target_date_params = [start_date, end_date]

    actual_clauses = ["1=1"]
    actual_params: List[object] = []
    target_clauses = ["1=1"]
    target_params: List[object] = []

    if region:
        actual_clauses.append("a.region ILIKE ?")
        actual_params.append(f"%{region}%")
        target_clauses.append("t.region ILIKE ?")
        target_params.append(f"%{region}%")
    if state:
        actual_clauses.append("a.state = ?")
        actual_params.append(state)
    if category:
        placeholders = ",".join(["?"] * len(category))
        actual_clauses.append(f"a.category IN ({placeholders})")
        actual_params.extend(category)

    actual_filter_sql = " AND ".join(actual_clauses)
    target_filter_sql = " AND ".join(target_clauses)

    sql = f"""
    WITH
    actual AS (
        SELECT
            CAST(inv.invoice_date AS DATE)        AS invoice_date,
            CAST(inv.net_sale_value AS DOUBLE)    AS net_sale_value,
            p.sku_h3_name                         AS category,
            cm.customer_zone                      AS region,
            cm.customer_state                     AS state
        FROM main.vw_l_dms_invoice_data inv
        LEFT JOIN main.customer_master cm
            ON inv.customer_pdt_map = cm.customer_pdt_map
        LEFT JOIN main.vw_l_product_hierarchy p
            ON inv.masked_sku_h1_code = p.sku_h1_code
    ),
    targets AS (
        SELECT
            CAST(st."Date" AS DATE)                AS target_date,
            CAST(st."Secondary Target" AS DOUBLE)  AS secondary_target,
            e.rm_role                              AS region
        FROM main.sotarget st
        LEFT JOIN main.vw_l_emp_hierarchy e
            ON st."SFA Code" = e.emp_h3_code
    ),
    filtered_actual AS (
        SELECT a.*
        FROM actual a
        WHERE {actual_filter_sql}
          AND a.invoice_date BETWEEN {actual_start_expr} AND {actual_end_expr}
    ),
    period_actual AS (
        SELECT COALESCE(SUM(net_sale_value), 0) AS actual_sales
        FROM filtered_actual
    ),
    period_target AS (
        SELECT COALESCE(SUM(t.secondary_target), 0) AS target_sales
        FROM targets t
        WHERE {target_filter_sql}
          AND {target_where}
    )
    SELECT
        pa.actual_sales,
        pt.target_sales,
        CASE
            WHEN pt.target_sales > 0
            THEN ROUND((pa.actual_sales / pt.target_sales) * 100.0, 2)
            ELSE NULL
        END AS achievement_pct
    FROM period_actual pa, period_target pt
    """

    all_params = actual_params + actual_date_params + target_params + target_date_params

    con = get_duckdb_connection()
    try:
        row = con.execute(sql, all_params).fetchone()
        actual_sales = row[0] if row else None
        target_sales = row[1] if row else None
        achievement_pct = row[2] if row else None

        return {
            "as_of": str(as_of),
            "filters": {
                "time": time,
                "start_date": None if start_date is None else str(start_date),
                "end_date": None if end_date is None else str(end_date),
                "region": region,
                "state": state,
                "category": category,
            },
            "current": {
                "period": time,
                "actual_sales": _mask_revenue(actual_sales),
                "target_sales": _mask_revenue(target_sales),
                "achievement_pct": achievement_pct,
            },
        }
    finally:
        try:
            con.close()
        except Exception:
            pass


@router.get("/secondary-kpi/absolute-reach")
async def absolute_reach(
    time: Literal["MTD", "QTD", "YTD", "CUSTOM"] = "MTD",
    as_of: Optional[date] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    region: Optional[Literal["North", "South", "East", "West"]] = None,
    state: Optional[str] = None,
    category: Optional[List[Literal["Sanitary Napkins", "Diapers", "Utensil Cleaners"]]] = Query(
        default=None
    ),
):
    as_of = as_of or date.today()

    if time == "CUSTOM" and (start_date is None or end_date is None):
        raise ValueError("For time=CUSTOM you must pass start_date and end_date")

    filter_clauses = ["1=1"]
    filter_params: List[object] = []

    if region:
        filter_clauses.append("b.region ILIKE ?")
        filter_params.append(f"%{region}%")
    if state:
        filter_clauses.append("b.state = ?")
        filter_params.append(state)
    if category:
        placeholders = ",".join(["?"] * len(category))
        filter_clauses.append(f"b.category IN ({placeholders})")
        filter_params.extend(category)

    filter_sql = " AND ".join(filter_clauses)

    sql = f"""
    WITH
    p AS (SELECT CAST(? AS DATE) AS as_of),
    bounds AS (
        SELECT
            as_of,
            date_trunc('month', as_of)                                            AS mtd_start,
            as_of                                                                 AS mtd_end,
            date_trunc('month', as_of - INTERVAL 1 MONTH)                        AS lm_start,
            least(
                date_trunc('month', as_of - INTERVAL 1 MONTH)
                    + (extract(day FROM as_of) - 1) * INTERVAL 1 DAY,
                date_trunc('month', as_of - INTERVAL 1 MONTH)
                    + INTERVAL 1 MONTH - INTERVAL 1 DAY
            )                                                                     AS lm_end,
            date_trunc('month', as_of - INTERVAL 1 YEAR)                         AS lysm_start,
            least(
                date_trunc('month', as_of - INTERVAL 1 YEAR)
                    + (extract(day FROM as_of) - 1) * INTERVAL 1 DAY,
                date_trunc('month', as_of - INTERVAL 1 YEAR)
                    + INTERVAL 1 MONTH - INTERVAL 1 DAY
            )                                                                     AS lysm_end
        FROM p
    ),
    base AS (
        SELECT
            inv.outlet_code                       AS outlet_code,
            CAST(inv.invoice_date AS DATE)        AS invoice_date,
            cm.customer_zone                      AS region,
            cm.customer_state                     AS state,
            ph.sku_h3_name                        AS category
        FROM main.vw_l_dms_invoice_data inv
        LEFT JOIN main.customer_master cm
            ON inv.customer_pdt_map = cm.customer_pdt_map
        LEFT JOIN main.vw_l_product_hierarchy ph
            ON inv.masked_sku_h1_code = ph.sku_h1_code
    ),
    filtered AS (
        SELECT b.*
        FROM base b
        WHERE {filter_sql}
    ),
    reach AS (
        SELECT
            COUNT(DISTINCT CASE WHEN f.invoice_date BETWEEN bo.mtd_start  AND bo.mtd_end  THEN f.outlet_code END) AS mtd_reach,
            COUNT(DISTINCT CASE WHEN f.invoice_date BETWEEN bo.lm_start   AND bo.lm_end   THEN f.outlet_code END) AS lm_reach,
            COUNT(DISTINCT CASE WHEN f.invoice_date BETWEEN bo.lysm_start AND bo.lysm_end THEN f.outlet_code END) AS lysm_reach
        FROM filtered f, bounds bo
    )
    SELECT * FROM reach
    """

    con = get_duckdb_connection()
    try:
        row = con.execute(sql, [as_of] + filter_params).fetchone()

        if time == "CUSTOM":
            custom_sql = f"""
            WITH base AS (
                SELECT
                    inv.outlet_code                       AS outlet_code,
                    CAST(inv.invoice_date AS DATE)        AS invoice_date,
                    cm.customer_zone                      AS region,
                    cm.customer_state                     AS state,
                    ph.sku_h3_name                        AS category
                FROM main.vw_l_dms_invoice_data inv
                LEFT JOIN main.customer_master cm ON inv.customer_pdt_map = cm.customer_pdt_map
                LEFT JOIN main.vw_l_product_hierarchy ph ON inv.masked_sku_h1_code = ph.sku_h1_code
            ),
            filtered AS (SELECT b.* FROM base b WHERE {filter_sql})
            SELECT
                COUNT(DISTINCT CASE WHEN invoice_date BETWEEN CAST(? AS DATE) AND CAST(? AS DATE) THEN outlet_code END)
            FROM filtered
            """
            custom_row = con.execute(
                custom_sql, filter_params + [start_date, end_date]
            ).fetchone()
            current_reach = custom_row[0] if custom_row else 0
        else:
            current_reach = row[0] if row else 0

        mtd_reach  = row[0] if row else 0
        lm_reach   = row[1] if row else 0
        lysm_reach = row[2] if row else 0

        def _pct_change(curr: int, prev: int) -> Optional[float]:
            if prev == 0:
                return None
            return round(((curr - prev) / prev) * 100.0, 2)

        return {
            "as_of": str(as_of),
            "filters": {
                "time": time,
                "start_date": None if start_date is None else str(start_date),
                "end_date": None if end_date is None else str(end_date),
                "region": region,
                "state": state,
                "category": category,
            },
            "current": {
                "period": time,
                "reach": current_reach,
                "urban_reach": None,
            },
            "note": "urban_reach unavailable: outlet master table not found in DB",
            "comparisons": {
                "lm_reach": lm_reach,
                "lysm_reach": lysm_reach,
                "mtd_vs_lm_change": mtd_reach - lm_reach,
                "mtd_vs_lm_pct": _pct_change(mtd_reach, lm_reach),
                "mtd_vs_lysm_change": mtd_reach - lysm_reach,
                "mtd_vs_lysm_pct": _pct_change(mtd_reach, lysm_reach),
            },
        }
    finally:
        try:
            con.close()
        except Exception:
            pass


@router.get("/secondary-kpi/primary-vs-secondary-gap")
async def primary_vs_secondary_gap(
    time: Literal["MTD", "QTD", "YTD", "CUSTOM"] = "MTD",
    as_of: Optional[date] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    region: Optional[Literal["North", "South", "East", "West"]] = None,
    state: Optional[str] = None,
    category: Optional[List[Literal["Sanitary Napkins", "Diapers", "Utensil Cleaners"]]] = Query(
        default=None
    ),
):
    as_of = as_of or date.today()

    if time == "CUSTOM" and (start_date is None or end_date is None):
        raise ValueError("For time=CUSTOM you must pass start_date and end_date")

    if time == "MTD":
        start_expr = "date_trunc('month', CAST(? AS DATE))"
        end_expr = "CAST(? AS DATE)"
        date_params: List[object] = [as_of, as_of]
    elif time == "QTD":
        start_expr = "date_trunc('quarter', CAST(? AS DATE))"
        end_expr = "CAST(? AS DATE)"
        date_params = [as_of, as_of]
    elif time == "YTD":
        start_expr = "date_trunc('year', CAST(? AS DATE))"
        end_expr = "CAST(? AS DATE)"
        date_params = [as_of, as_of]
    else:
        start_expr = "CAST(? AS DATE)"
        end_expr = "CAST(? AS DATE)"
        date_params = [start_date, end_date]

    pri_clauses = ["1=1"]
    pri_params: List[object] = []
    sec_clauses = ["1=1"]
    sec_params: List[object] = []

    if region:
        pri_clauses.append("pcm.customer_zone ILIKE ?")
        pri_params.append(f"%{region}%")
        sec_clauses.append("scm.customer_zone ILIKE ?")
        sec_params.append(f"%{region}%")
    if state:
        pri_clauses.append("pcm.customer_state = ?")
        pri_params.append(state)
        sec_clauses.append("scm.customer_state = ?")
        sec_params.append(state)
    if category:
        placeholders = ",".join(["?"] * len(category))
        pri_clauses.append(f"p.sku_h3_name IN ({placeholders})")
        pri_params.extend(category)
        sec_clauses.append(f"ph.sku_h3_name IN ({placeholders})")
        sec_params.extend(category)

    pri_filter_sql = " AND ".join(pri_clauses)
    sec_filter_sql = " AND ".join(sec_clauses)

    sql = f"""
    WITH
    primary_sales AS (
        SELECT COALESCE(SUM(CAST(p.gross_sale_value AS DOUBLE)), 0) AS total
        FROM main.vw_primary_invoice_data p
        LEFT JOIN main.customer_master pcm
            ON p.customer_pdt_map = pcm.customer_pdt_map
        WHERE {pri_filter_sql}
          AND CAST(p.invoice_date AS DATE) BETWEEN {start_expr} AND {end_expr}
    ),
    secondary_sales AS (
        SELECT COALESCE(SUM(CAST(s.net_sale_value AS DOUBLE)), 0) AS total
        FROM main.vw_l_dms_invoice_data s
        LEFT JOIN main.customer_master scm
            ON s.customer_pdt_map = scm.customer_pdt_map
        LEFT JOIN main.vw_l_product_hierarchy ph
            ON s.masked_sku_h1_code = ph.sku_h1_code
        WHERE {sec_filter_sql}
          AND CAST(s.invoice_date AS DATE) BETWEEN {start_expr} AND {end_expr}
    )
    SELECT
        ps.total                                                         AS primary_sales,
        ss.total                                                         AS secondary_sales,
        ps.total - ss.total                                              AS gap,
        CASE
            WHEN ps.total > 0
            THEN ROUND((ps.total - ss.total) / ps.total * 100.0, 2)
            ELSE NULL
        END                                                              AS gap_pct
    FROM primary_sales ps, secondary_sales ss
    """

    all_params = pri_params + date_params + sec_params + date_params

    con = get_duckdb_connection()
    try:
        row = con.execute(sql, all_params).fetchone()
        primary_sales = row[0] if row else None
        secondary_sales = row[1] if row else None
        gap = row[2] if row else None
        gap_pct = row[3] if row else None

        return {
            "as_of": str(as_of),
            "filters": {
                "time": time,
                "start_date": None if start_date is None else str(start_date),
                "end_date": None if end_date is None else str(end_date),
                "region": region,
                "state": state,
                "category": category,
            },
            "current": {
                "period": time,
                "primary_sales": _mask_revenue(primary_sales),
                "secondary_sales": _mask_revenue(secondary_sales),
                "gap": _mask_revenue(gap),
                "gap_pct": gap_pct,
            },
            "interpretation": (
                "High gap_pct indicates pipeline stuffing (inventory at distributor not reaching retail)"
                if gap_pct is not None and gap_pct > 20
                else None
            ),
        }
    finally:
        try:
            con.close()
        except Exception:
            pass


@router.get("/secondary-kpi/fill-rate")
async def fill_rate(
    time: Literal["MTD", "QTD", "YTD", "CUSTOM"] = "MTD",
    as_of: Optional[date] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    region: Optional[Literal["North", "South", "East", "West"]] = None,
    state: Optional[str] = None,
    category: Optional[List[Literal["Sanitary Napkins", "Diapers", "Utensil Cleaners"]]] = Query(
        default=None
    ),
):
    as_of = as_of or date.today()

    if time == "CUSTOM" and (start_date is None or end_date is None):
        raise ValueError("For time=CUSTOM you must pass start_date and end_date")

    if time == "MTD":
        start_expr = "date_trunc('month', CAST(? AS DATE))"
        end_expr = "CAST(? AS DATE)"
        date_params: List[object] = [as_of, as_of]
    elif time == "QTD":
        start_expr = "date_trunc('quarter', CAST(? AS DATE))"
        end_expr = "CAST(? AS DATE)"
        date_params = [as_of, as_of]
    elif time == "YTD":
        start_expr = "date_trunc('year', CAST(? AS DATE))"
        end_expr = "CAST(? AS DATE)"
        date_params = [as_of, as_of]
    else:
        start_expr = "CAST(? AS DATE)"
        end_expr = "CAST(? AS DATE)"
        date_params = [start_date, end_date]

    order_clauses = ["1=1"]
    order_params: List[object] = []
    bill_clauses = ["1=1"]
    bill_params: List[object] = []

    if region:
        order_clauses.append("o.region ILIKE ?")
        order_params.append(f"%{region}%")
        bill_clauses.append("b.region ILIKE ?")
        bill_params.append(f"%{region}%")
    if state:
        bill_clauses.append("b.state = ?")
        bill_params.append(state)
    if category:
        placeholders = ",".join(["?"] * len(category))
        bill_clauses.append(f"ph.sku_h3_name IN ({placeholders})")
        bill_params.extend(category)

    order_filter_sql = " AND ".join(order_clauses)
    bill_filter_sql = " AND ".join(bill_clauses)

    sql = f"""
    WITH
    orders AS (
        SELECT
            ord.outlet_code,
            CAST(ord.order_date AS DATE)              AS order_date,
            CAST(ord.order_qty_in_pairs AS DOUBLE)    AS order_qty,
            e.rm_role                                 AS region
        FROM main.vw_l_secondary_visit_order_shifted_mapped_only ord
        LEFT JOIN main.vw_l_emp_hierarchy e
            ON ord.emp_h3_code = e.emp_h3_code
    ),
    billed AS (
        SELECT
            s.outlet_code,
            CAST(s.invoice_date AS DATE)              AS invoice_date,
            CAST(s.sale_qty AS DOUBLE)                AS sale_qty,
            cm.customer_zone                          AS region,
            cm.customer_state                         AS state,
            ph.sku_h3_name                            AS category
        FROM main.vw_l_dms_invoice_data s
        LEFT JOIN main.customer_master cm
            ON s.customer_pdt_map = cm.customer_pdt_map
        LEFT JOIN main.vw_l_product_hierarchy ph
            ON s.masked_sku_h1_code = ph.sku_h1_code
    ),
    period_orders AS (
        SELECT COALESCE(SUM(o.order_qty), 0) AS total_ordered
        FROM orders o
        WHERE {order_filter_sql}
          AND o.order_date BETWEEN {start_expr} AND {end_expr}
    ),
    period_billed AS (
        SELECT COALESCE(SUM(b.sale_qty), 0) AS total_billed
        FROM billed b
        WHERE {bill_filter_sql}
          AND b.invoice_date BETWEEN {start_expr} AND {end_expr}
    )
    SELECT
        po.total_ordered,
        pb.total_billed,
        CASE
            WHEN po.total_ordered > 0
            THEN ROUND((pb.total_billed / po.total_ordered) * 100.0, 2)
            ELSE NULL
        END AS fill_rate_pct
    FROM period_orders po, period_billed pb
    """

    all_params = order_params + date_params + bill_params + date_params

    con = get_duckdb_connection()
    try:
        row = con.execute(sql, all_params).fetchone()
        total_ordered = row[0] if row else None
        total_billed = row[1] if row else None
        fill_rate_pct = row[2] if row else None

        return {
            "as_of": str(as_of),
            "filters": {
                "time": time,
                "start_date": None if start_date is None else str(start_date),
                "end_date": None if end_date is None else str(end_date),
                "region": region,
                "state": state,
                "category": category,
            },
            "current": {
                "period": time,
                "total_ordered_qty": total_ordered,
                "total_billed_qty": total_billed,
                "fill_rate_pct": fill_rate_pct,
            },
        }
    finally:
        try:
            con.close()
        except Exception:
            pass


@router.get("/tertiary-kpi/lines-per-call")
async def lines_per_call(
    time: Literal["MTD", "QTD", "YTD", "CUSTOM"] = "MTD",
    as_of: Optional[date] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    region: Optional[Literal["North", "South", "East", "West"]] = None,
    state: Optional[str] = None,
):
    as_of = as_of or date.today()

    if time == "CUSTOM" and (start_date is None or end_date is None):
        raise ValueError("For time=CUSTOM you must pass start_date and end_date")

    if time == "MTD":
        start_expr = "date_trunc('month', CAST(? AS DATE))"
        end_expr   = "CAST(? AS DATE)"
        date_params: List[object] = [as_of, as_of]
    elif time == "QTD":
        start_expr = "date_trunc('quarter', CAST(? AS DATE))"
        end_expr   = "CAST(? AS DATE)"
        date_params = [as_of, as_of]
    elif time == "YTD":
        start_expr = "date_trunc('year', CAST(? AS DATE))"
        end_expr   = "CAST(? AS DATE)"
        date_params = [as_of, as_of]
    else:
        start_expr = "CAST(? AS DATE)"
        end_expr   = "CAST(? AS DATE)"
        date_params = [start_date, end_date]

    order_clauses = ["1=1"]
    order_params: List[object] = []
    bill_clauses = ["1=1"]
    bill_params: List[object] = []

    if region:
        order_clauses.append("o.region ILIKE ?")
        order_params.append(f"%{region}%")
        bill_clauses.append("b.region ILIKE ?")
        bill_params.append(f"%{region}%")
    if state:
        bill_clauses.append("b.state = ?")
        bill_params.append(state)

    order_filter_sql = " AND ".join(order_clauses)
    bill_filter_sql  = " AND ".join(bill_clauses)

    sql = f"""
    WITH
    orders AS (
        SELECT
            ord.outlet_code,
            CAST(ord.order_date AS DATE) AS order_date,
            ord.emp_h3_code,
            e.rm_role                    AS region
        FROM main.vw_l_secondary_visit_order_shifted_mapped_only ord
        LEFT JOIN main.vw_l_emp_hierarchy e ON ord.emp_h3_code = e.emp_h3_code
    ),
    billed AS (
        SELECT
            s.outlet_code,
            CAST(s.invoice_date AS DATE)  AS invoice_date,
            s.masked_sku_h1_code          AS sku_code,
            cm.customer_zone              AS region,
            cm.customer_state             AS state
        FROM main.vw_l_dms_invoice_data s
        LEFT JOIN main.customer_master cm ON s.customer_pdt_map = cm.customer_pdt_map
    ),
    period_calls AS (
        SELECT COUNT(DISTINCT
            CONCAT(o.outlet_code, '|', CAST(o.order_date AS VARCHAR), '|', o.emp_h3_code)
        ) AS total_calls
        FROM orders o
        WHERE {order_filter_sql}
          AND o.order_date BETWEEN {start_expr} AND {end_expr}
    ),
    sku_per_visit AS (
        SELECT b.outlet_code, b.invoice_date, COUNT(DISTINCT b.sku_code) AS distinct_skus
        FROM billed b
        WHERE {bill_filter_sql}
          AND b.invoice_date BETWEEN {start_expr} AND {end_expr}
        GROUP BY b.outlet_code, b.invoice_date
    ),
    period_lines AS (
        SELECT COALESCE(SUM(distinct_skus), 0) AS total_lines
        FROM sku_per_visit
    )
    SELECT pc.total_calls, pl.total_lines,
        CASE WHEN pc.total_calls > 0
             THEN ROUND(CAST(pl.total_lines AS DOUBLE) / pc.total_calls, 2)
             ELSE NULL
        END AS lpc
    FROM period_calls pc, period_lines pl
    """

    all_params = order_params + date_params + bill_params + date_params

    con = get_duckdb_connection()
    try:
        row = con.execute(sql, all_params).fetchone()
        return {
            "as_of": str(as_of),
            "filters": {
                "time": time,
                "start_date": None if start_date is None else str(start_date),
                "end_date": None if end_date is None else str(end_date),
                "region": region,
                "state": state,
            },
            "current": {
                "period": time,
                "total_calls": row[0] if row else None,
                "total_sku_lines": row[1] if row else None,
                "lpc": row[2] if row else None,
            },
        }
    finally:
        try:
            con.close()
        except Exception:
            pass


@router.get("/tertiary-kpi/productivity")
async def productivity(
    time: Literal["MTD", "QTD", "YTD", "CUSTOM"] = "MTD",
    as_of: Optional[date] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    region: Optional[Literal["North", "South", "East", "West"]] = None,
    state: Optional[str] = None,
):
    as_of = as_of or date.today()

    if time == "CUSTOM" and (start_date is None or end_date is None):
        raise ValueError("For time=CUSTOM you must pass start_date and end_date")

    if time == "MTD":
        start_expr = "date_trunc('month', CAST(? AS DATE))"
        end_expr   = "CAST(? AS DATE)"
        date_params = [as_of, as_of]
    elif time == "QTD":
        start_expr = "date_trunc('quarter', CAST(? AS DATE))"
        end_expr   = "CAST(? AS DATE)"
        date_params = [as_of, as_of]
    elif time == "YTD":
        start_expr = "date_trunc('year', CAST(? AS DATE))"
        end_expr   = "CAST(? AS DATE)"
        date_params = [as_of, as_of]
    else:
        start_expr = "CAST(? AS DATE)"
        end_expr   = "CAST(? AS DATE)"
        date_params = [start_date, end_date]

    filter_clauses = ["1=1"]
    filter_params: List[object] = []

    if region:
        filter_clauses.append("e.rm_role ILIKE ?")
        filter_params.append(f"%{region}%")
    if state:
        filter_clauses.append("cm.customer_state = ?")
        filter_params.append(state)

    filter_sql = " AND ".join(filter_clauses)

    sql = f"""
    WITH
    assigned AS (
        SELECT DISTINCT ord.outlet_code, ord.emp_h3_code, e.rm_role AS region
        FROM main.vw_l_secondary_visit_order_shifted_mapped_only ord
        LEFT JOIN main.vw_l_emp_hierarchy e ON ord.emp_h3_code = e.emp_h3_code
    ),
    billed_in_period AS (
        SELECT DISTINCT
            s.outlet_code,
            CAST(s.invoice_date AS DATE) AS invoice_date,
            cm.customer_zone             AS region,
            cm.customer_state            AS state
        FROM main.vw_l_dms_invoice_data s
        LEFT JOIN main.customer_master cm ON s.customer_pdt_map = cm.customer_pdt_map
        WHERE s.invoice_date BETWEEN {start_expr} AND {end_expr}
    ),
    total_assigned AS (
        SELECT COUNT(DISTINCT a.outlet_code) AS cnt
        FROM assigned a
        LEFT JOIN main.vw_l_emp_hierarchy e ON a.emp_h3_code = e.emp_h3_code
        WHERE {filter_sql}
    ),
    total_billed AS (
        SELECT COUNT(DISTINCT b.outlet_code) AS cnt
        FROM billed_in_period b
        WHERE {filter_sql.replace("e.rm_role", "b.region").replace("cm.customer_state", "b.state")}
    )
    SELECT
        ta.cnt AS assigned_outlets,
        tb.cnt AS billed_outlets,
        CASE
            WHEN ta.cnt > 0
            THEN ROUND(CAST(tb.cnt AS DOUBLE) / ta.cnt * 100.0, 2)
            ELSE NULL
        END AS productivity_pct
    FROM total_assigned ta, total_billed tb
    """

    all_params = date_params + filter_params + filter_params

    con = get_duckdb_connection()
    try:
        row = con.execute(sql, all_params).fetchone()
        assigned = row[0] if row else None
        billed = row[1] if row else None
        pct = row[2] if row else None
        return {
            "as_of": str(as_of),
            "note": "Assigned outlets proxied from visit-order table (no outlet_master found in DB)",
            "filters": {
                "time": time,
                "start_date": None if start_date is None else str(start_date),
                "end_date": None if end_date is None else str(end_date),
                "region": region,
                "state": state,
            },
            "current": {
                "period": time,
                "assigned_outlets": assigned,
                "billed_outlets": billed,
                "productivity_pct": pct,
            },
            "alert": "SO Productivity < 50%" if pct is not None and pct < 50 else None,
        }
    finally:
        try:
            con.close()
        except Exception:
            pass


@router.get("/primary-kpi/filter-options")
async def filter_options():
    con = get_duckdb_connection()
    try:
        regions = [
            r[0]
            for r in con.execute(
                "SELECT DISTINCT Region FROM main.geomaster WHERE Region IS NOT NULL ORDER BY Region"
            ).fetchall()
        ]

        states = [
            r[0]
            for r in con.execute(
                "SELECT DISTINCT ST_NAME FROM main.geomaster WHERE ST_NAME IS NOT NULL ORDER BY ST_NAME"
            ).fetchall()
        ]

        categories = [
            r[0]
            for r in con.execute(
                "SELECT DISTINCT sku_h3_name FROM main.vw_l_product_hierarchy WHERE sku_h3_name IS NOT NULL ORDER BY sku_h3_name"
            ).fetchall()
        ]

        return {
            "regions": regions,
            "states": states,
            "categories": categories,
        }
    finally:
        try:
            con.close()
        except Exception:
            pass






