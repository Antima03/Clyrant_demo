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




@router.get("/charts/primary-sales-by-product")
async def primary_sales_by_product(
    time: Literal["MTD", "QTD", "YTD", "CUSTOM"] = "MTD",
    as_of: Optional[date] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    region: Optional[Literal["North", "South", "East", "West"]] = None,
    state: Optional[str] = None,
    division: Optional[str] = None,
):
    """
    2-level product drilldown via vw_l_product_hierarchy:
      (none)     → group by sku_h4_name  (division: FLITE / FLITE PU / HAWAI / SHOE)
      division   → group by sku_h3_name  (category — deepest transaction grain)
    GOLY% via date arithmetic (- INTERVAL 1 YEAR).
    """
    as_of = as_of or date.today()

    if time == "CUSTOM" and (start_date is None or end_date is None):
        raise ValueError("For time=CUSTOM you must pass start_date and end_date")

    if division:
        group_col   = "i.sku_h3_name"
        group_label = "category"
        drill_level = "category"
    else:
        group_col   = "ph.sku_h4_name"
        group_label = "division"
        drill_level = "division"

    if time == "MTD":
        cur_start = "date_trunc('month', CAST(? AS DATE))"
        cur_end   = "CAST(? AS DATE)"
        date_params: List[object] = [as_of, as_of, as_of, as_of]
    elif time == "QTD":
        cur_start = "date_trunc('quarter', CAST(? AS DATE))"
        cur_end   = "CAST(? AS DATE)"
        date_params = [as_of, as_of, as_of, as_of]
    elif time == "YTD":
        cur_start = "date_trunc('year', CAST(? AS DATE))"
        cur_end   = "CAST(? AS DATE)"
        date_params = [as_of, as_of, as_of, as_of]
    else:
        cur_start = "CAST(? AS DATE)"
        cur_end   = "CAST(? AS DATE)"
        date_params = [start_date, end_date, start_date, end_date]

    filter_clauses = ["1=1"]
    filter_params: List[object] = []

    if region:
        filter_clauses.append("cm.customer_zone ILIKE ?")
        filter_params.append(f"%{region}%")
    if state:
        filter_clauses.append("cm.customer_state = ?")
        filter_params.append(state)
    if division:
        filter_clauses.append("ph.sku_h4_name = ?")
        filter_params.append(division)

    filter_sql = " AND ".join(filter_clauses)

    sql = f"""
    WITH
    base AS (
        SELECT
            CAST(i.invoice_date AS DATE)        AS invoice_date,
            CAST(i.gross_sale_value AS DOUBLE)  AS sales,
            {group_col}                         AS dim
        FROM main.vw_primary_invoice_data i
        LEFT JOIN main.customer_master cm
            ON i.customer_pdt_map = cm.customer_pdt_map
        LEFT JOIN main.vw_l_product_hierarchy ph
            ON i.sku_h3_name = ph.sku_h3_name
        WHERE {filter_sql}
    ),
    current_sales AS (
        SELECT dim, COALESCE(SUM(sales), 0) AS current_sales
        FROM base
        WHERE invoice_date BETWEEN {cur_start} AND {cur_end}
        GROUP BY dim
    ),
    ly_sales AS (
        SELECT dim, COALESCE(SUM(sales), 0) AS ly_value
        FROM base
        WHERE invoice_date BETWEEN ({cur_start}) - INTERVAL 1 YEAR
                                AND ({cur_end})   - INTERVAL 1 YEAR
        GROUP BY dim
    )
    SELECT
        c.dim,
        c.current_sales,
        COALESCE(l.ly_value, 0)                 AS ly_value,
        CASE
            WHEN COALESCE(l.ly_value, 0) > 0
            THEN ROUND((c.current_sales - l.ly_value) / l.ly_value * 100.0, 1)
            ELSE NULL
        END                                     AS goly_pct
    FROM current_sales c
    LEFT JOIN ly_sales l ON c.dim = l.dim
    ORDER BY c.current_sales DESC
    """

    all_params = filter_params + date_params

    con = get_duckdb_connection()
    try:
        rows = con.execute(sql, all_params).fetchall()
        return {
            "as_of": str(as_of),
            "chart": "Primary Sales by Product Hierarchy",
            "chart_type": "lineStackedColumnComboChart",
            "drill_level": drill_level,
            "group_by": group_label,
            "comparison": "GOLY% via -1 YEAR arithmetic",
            "filters": {
                "time": time,
                "start_date": None if start_date is None else str(start_date),
                "end_date": None if end_date is None else str(end_date),
                "region": region,
                "state": state,
                "division": division,
            },
            "data": [
                {
                    group_label: r[0],
                    "primary_sales_value": _mask_revenue(r[1]),
                    "primary_sales_ly_value": _mask_revenue(r[2]),
                    "primary_sales_value_goly_pct": r[3],
                }
                for r in rows
            ],
        }
    finally:
        try:
            con.close()
        except Exception:
            pass


@router.get("/charts/primary-sales-drilldown")
async def primary_sales_drilldown(
    time: Literal["MTD", "QTD", "YTD", "CUSTOM"] = "MTD",
    as_of: Optional[date] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    region: Optional[Literal["North", "South", "East", "West"]] = None,
    state: Optional[str] = None,
    district: Optional[str] = None,
    category: Optional[List[Literal["Sanitary Napkins", "Diapers", "Utensil Cleaners"]]] = Query(
        default=None
    ),
):
    """
    4-level geo drill-down via customer_master (auto-detected):
      (none)                          → group by customer_zone   (region)
      region                          → group by customer_state
      region + state                  → group by customer_district
      region + state + district       → group by customer_city
    LY comparison uses calendar_table.last_year_same_date (GOLY%).
    """
    as_of = as_of or date.today()

    if time == "CUSTOM" and (start_date is None or end_date is None):
        raise ValueError("For time=CUSTOM you must pass start_date and end_date")

    if region and state and district:
        group_col   = "cm.customer_city"
        group_label = "city"
        drill_level = "city"
    elif region and state:
        group_col   = "cm.customer_district"
        group_label = "district"
        drill_level = "district"
    elif region:
        group_col   = "cm.customer_state"
        group_label = "state"
        drill_level = "state"
    else:
        group_col   = "cm.customer_zone"
        group_label = "region"
        drill_level = "region"

    if time == "MTD":
        cur_start = "date_trunc('month', CAST(? AS DATE))"
        cur_end   = "CAST(? AS DATE)"
        date_params: List[object] = [as_of, as_of, as_of, as_of]
    elif time == "QTD":
        cur_start = "date_trunc('quarter', CAST(? AS DATE))"
        cur_end   = "CAST(? AS DATE)"
        date_params = [as_of, as_of, as_of, as_of]
    elif time == "YTD":
        cur_start = "date_trunc('year', CAST(? AS DATE))"
        cur_end   = "CAST(? AS DATE)"
        date_params = [as_of, as_of, as_of, as_of]
    else:
        cur_start = "CAST(? AS DATE)"
        cur_end   = "CAST(? AS DATE)"
        date_params = [start_date, end_date, start_date, end_date]

    filter_clauses = ["1=1"]
    filter_params: List[object] = []

    if region:
        filter_clauses.append("cm.customer_zone ILIKE ?")
        filter_params.append(f"%{region}%")
    if state:
        filter_clauses.append("cm.customer_state = ?")
        filter_params.append(state)
    if district:
        filter_clauses.append("cm.customer_district = ?")
        filter_params.append(district)
    if category:
        placeholders = ",".join(["?"] * len(category))
        filter_clauses.append(f"i.sku_h3_name IN ({placeholders})")
        filter_params.extend(category)

    filter_sql = " AND ".join(filter_clauses)

    sql = f"""
    WITH
    base AS (
        SELECT
            CAST(i.invoice_date AS DATE)        AS invoice_date,
            CAST(i.gross_sale_value AS DOUBLE)  AS sales,
            {group_col}                         AS dim
        FROM main.vw_primary_invoice_data i
        LEFT JOIN main.customer_master cm
            ON i.customer_pdt_map = cm.customer_pdt_map
        WHERE {filter_sql}
    ),
    current_sales AS (
        SELECT dim, COALESCE(SUM(sales), 0) AS current_sales
        FROM base
        WHERE invoice_date BETWEEN {cur_start} AND {cur_end}
        GROUP BY dim
    ),
    ly_sales AS (
        SELECT dim, COALESCE(SUM(sales), 0) AS ly_value
        FROM base
        WHERE invoice_date BETWEEN ({cur_start}) - INTERVAL 1 YEAR
                                AND ({cur_end})   - INTERVAL 1 YEAR
        GROUP BY dim
    )
    SELECT
        c.dim,
        c.current_sales,
        COALESCE(l.ly_value, 0)                 AS ly_value,
        CASE
            WHEN COALESCE(l.ly_value, 0) > 0
            THEN ROUND((c.current_sales - l.ly_value) / l.ly_value * 100.0, 1)
            ELSE NULL
        END                                     AS goly_pct
    FROM current_sales c
    LEFT JOIN ly_sales l ON c.dim = l.dim
    ORDER BY c.current_sales DESC
    """

    all_params = filter_params + date_params

    con = get_duckdb_connection()
    try:
        rows = con.execute(sql, all_params).fetchall()
        return {
            "as_of": str(as_of),
            "chart": "Primary Sales by Region",
            "chart_type": "lineStackedColumnComboChart",
            "drill_level": drill_level,
            "group_by": group_label,
            "comparison": "GOLY% via calendar_table.last_year_same_date",
            "filters": {
                "time": time,
                "start_date": None if start_date is None else str(start_date),
                "end_date": None if end_date is None else str(end_date),
                "region": region,
                "state": state,
                "district": district,
                "category": category,
            },
            "data": [
                {
                    group_label: r[0],
                    "primary_sales_value": _mask_revenue(r[1]),
                    "primary_sales_ly_value": _mask_revenue(r[2]),
                    "primary_sales_value_goly_pct": r[3],
                }
                for r in rows
            ],
        }
    finally:
        try:
            con.close()
        except Exception:
            pass


@router.get("/charts/outlet-funnel")
async def outlet_funnel(
    time: Literal["MTD", "QTD", "YTD", "CUSTOM"] = "MTD",
    as_of: Optional[date] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
):
    """
    Outlet funnel with 4 stages:
      Universe → Covered → Productive → Billed
    Returns: counts, conversion %, drop-off %, GOLM % at each stage.
    Universe uses a 90-day lookback window; GOLM compares to the same
    elapsed period in the prior month.
    """
    as_of = as_of or date.today()

    if time == "CUSTOM" and (start_date is None or end_date is None):
        raise ValueError("For time=CUSTOM you must pass start_date and end_date")

    if time == "MTD":
        cur_start = "date_trunc('month', CAST(? AS DATE))"
        cur_end   = "CAST(? AS DATE)"
        lm_start  = "date_trunc('month', CAST(? AS DATE) - INTERVAL 1 MONTH)"
        lm_end    = ("date_trunc('month', CAST(? AS DATE) - INTERVAL 1 MONTH)"
                     " + (extract(day FROM CAST(? AS DATE)) - 1) * INTERVAL 1 DAY")
        date_params: List[object] = [as_of, as_of, as_of, as_of, as_of]
    elif time == "QTD":
        cur_start = "date_trunc('quarter', CAST(? AS DATE))"
        cur_end   = "CAST(? AS DATE)"
        lm_start  = "date_trunc('month', CAST(? AS DATE) - INTERVAL 1 MONTH)"
        lm_end    = "CAST(? AS DATE) - INTERVAL 1 MONTH"
        date_params = [as_of, as_of, as_of, as_of]
    elif time == "YTD":
        cur_start = "date_trunc('year', CAST(? AS DATE))"
        cur_end   = "CAST(? AS DATE)"
        lm_start  = "date_trunc('month', CAST(? AS DATE) - INTERVAL 1 MONTH)"
        lm_end    = "CAST(? AS DATE) - INTERVAL 1 MONTH"
        date_params = [as_of, as_of, as_of, as_of]
    else:
        cur_start = "CAST(? AS DATE)"
        cur_end   = "CAST(? AS DATE)"
        lm_start  = "CAST(? AS DATE) - INTERVAL 1 MONTH"
        lm_end    = "CAST(? AS DATE) - INTERVAL 1 MONTH"
        date_params = [start_date, end_date, start_date, end_date]

    sql = f"""
    WITH
    date_bounds AS (
        SELECT
            {cur_start}  AS cur_start,
            {cur_end}    AS cur_end,
            {lm_start}   AS lm_start,
            {lm_end}     AS lm_end
    ),

    universe_cur AS (
        SELECT COUNT(DISTINCT outlet_code) AS v
        FROM (
            SELECT outlet_code
            FROM main.vw_l_secondary_visit_order_shifted_mapped_only
            WHERE CAST(order_date AS DATE)
                  BETWEEN (SELECT cur_start FROM date_bounds) - INTERVAL 90 DAY
                      AND (SELECT cur_end   FROM date_bounds)
            UNION
            SELECT outlet_code
            FROM main.vw_l_dms_invoice_data
            WHERE CAST(invoice_date AS DATE)
                  BETWEEN (SELECT cur_start FROM date_bounds) - INTERVAL 90 DAY
                      AND (SELECT cur_end   FROM date_bounds)
        ) u
    ),
    covered_cur AS (
        SELECT COUNT(DISTINCT outlet_code) AS v
        FROM main.vw_l_secondary_visit_order_shifted_mapped_only
        WHERE CAST(order_date AS DATE)
              BETWEEN (SELECT cur_start FROM date_bounds) AND (SELECT cur_end FROM date_bounds)
    ),
    productive_cur AS (
        SELECT COUNT(DISTINCT outlet_code) AS v
        FROM main.vw_l_secondary_visit_order_shifted_mapped_only
        WHERE CAST(order_date AS DATE)
              BETWEEN (SELECT cur_start FROM date_bounds) AND (SELECT cur_end FROM date_bounds)
          AND order_qty_in_pairs > 0
    ),
    billed_cur AS (
        SELECT COUNT(DISTINCT outlet_code) AS v
        FROM main.vw_l_dms_invoice_data
        WHERE CAST(invoice_date AS DATE)
              BETWEEN (SELECT cur_start FROM date_bounds) AND (SELECT cur_end FROM date_bounds)
    ),

    universe_lm AS (
        SELECT COUNT(DISTINCT outlet_code) AS v
        FROM (
            SELECT outlet_code
            FROM main.vw_l_secondary_visit_order_shifted_mapped_only
            WHERE CAST(order_date AS DATE)
                  BETWEEN (SELECT lm_start FROM date_bounds) - INTERVAL 90 DAY
                      AND (SELECT lm_end   FROM date_bounds)
            UNION
            SELECT outlet_code
            FROM main.vw_l_dms_invoice_data
            WHERE CAST(invoice_date AS DATE)
                  BETWEEN (SELECT lm_start FROM date_bounds) - INTERVAL 90 DAY
                      AND (SELECT lm_end   FROM date_bounds)
        ) u
    ),
    covered_lm AS (
        SELECT COUNT(DISTINCT outlet_code) AS v
        FROM main.vw_l_secondary_visit_order_shifted_mapped_only
        WHERE CAST(order_date AS DATE)
              BETWEEN (SELECT lm_start FROM date_bounds) AND (SELECT lm_end FROM date_bounds)
    ),
    productive_lm AS (
        SELECT COUNT(DISTINCT outlet_code) AS v
        FROM main.vw_l_secondary_visit_order_shifted_mapped_only
        WHERE CAST(order_date AS DATE)
              BETWEEN (SELECT lm_start FROM date_bounds) AND (SELECT lm_end FROM date_bounds)
          AND order_qty_in_pairs > 0
    ),
    billed_lm AS (
        SELECT COUNT(DISTINCT outlet_code) AS v
        FROM main.vw_l_dms_invoice_data
        WHERE CAST(invoice_date AS DATE)
              BETWEEN (SELECT lm_start FROM date_bounds) AND (SELECT lm_end FROM date_bounds)
    )

    SELECT
        uc.v  AS universe_outlets,
        co.v  AS covered_outlets,
        pr.v  AS productive_outlets,
        bi.v  AS billed_outlets,

        ROUND(co.v * 100.0 / NULLIF(uc.v, 0), 1) AS covered_conv_pct,
        ROUND(pr.v * 100.0 / NULLIF(uc.v, 0), 1) AS productive_conv_pct,
        ROUND(bi.v * 100.0 / NULLIF(uc.v, 0), 1) AS billed_conv_pct,

        ROUND((1 - co.v * 1.0 / NULLIF(uc.v, 0)) * 100, 1) AS drop_universe_to_covered_pct,
        ROUND((1 - pr.v * 1.0 / NULLIF(co.v, 0)) * 100, 1) AS drop_covered_to_productive_pct,
        ROUND((1 - bi.v * 1.0 / NULLIF(pr.v, 0)) * 100, 1) AS drop_productive_to_billed_pct,

        ROUND(uc.v * 100.0 / NULLIF(ul.v, 0), 1) AS universe_golm_pct,
        ROUND(co.v * 100.0 / NULLIF(cl.v, 0), 1) AS covered_golm_pct,
        ROUND(pr.v * 100.0 / NULLIF(pl.v, 0), 1) AS productive_golm_pct,
        ROUND(bi.v * 100.0 / NULLIF(bl.v, 0), 1) AS billed_golm_pct,

        ROUND(bi.v * 100.0 / NULLIF(uc.v, 0), 1) AS end_to_end_conv_pct

    FROM universe_cur uc, covered_cur co, productive_cur pr, billed_cur bi,
         universe_lm ul,  covered_lm cl,  productive_lm pl,  billed_lm bl
    """

    con = get_duckdb_connection()
    try:
        row = con.execute(sql, date_params).fetchone()
        if not row:
            return {"stages": [], "end_to_end_conv_pct": None}

        (
            universe_n, covered_n, productive_n, billed_n,
            covered_conv, productive_conv, billed_conv,
            drop_u2c, drop_c2p, drop_p2b,
            universe_golm, covered_golm, productive_golm, billed_golm,
            end_to_end,
        ) = row

        stages = [
            {
                "stage": "Total Outlet Universe",
                "label": "Outlets in DMS",
                "count": universe_n,
                "conv_pct": 100.0,
                "drop_to_next_pct": drop_u2c,
                "golm_pct": universe_golm,
            },
            {
                "stage": "Covered Outlets",
                "label": "Visited / Called this period",
                "count": covered_n,
                "conv_pct": covered_conv,
                "drop_to_next_pct": drop_c2p,
                "golm_pct": covered_golm,
            },
            {
                "stage": "Productive Outlets",
                "label": "Order captured in DMS",
                "count": productive_n,
                "conv_pct": productive_conv,
                "drop_to_next_pct": drop_p2b,
                "golm_pct": productive_golm,
            },
            {
                "stage": "Billed Outlets",
                "label": "Invoice raised",
                "count": billed_n,
                "conv_pct": billed_conv,
                "drop_to_next_pct": None,
                "golm_pct": billed_golm,
            },
        ]
        return {
            "as_of": str(as_of),
            "chart": "Outlet Funnel",
            "time": time,
            "end_to_end_conv_pct": end_to_end,
            "stages": stages,
        }
    finally:
        try:
            con.close()
        except Exception:
            pass


@router.get("/charts/sec-vs-pri-ratio")
async def sec_vs_pri_ratio(
    months: int = 4,
    as_of: Optional[date] = None,
    region: Optional[Literal["North", "South", "East", "West"]] = None,
    state: Optional[str] = None,
    category: Optional[List[Literal["Sanitary Napkins", "Diapers", "Utensil Cleaners"]]] = Query(
        default=None
    ),
    norm: float = 80.0,
):
    """
    Monthly Sec:Pri ratio trend for the last `months` months.
    Returns: monthly series, current MTD ratio, LM ratio, delta (pp), norm reference.
    Join key: customer_pdt_map (links both invoice tables at distributor level).
    """
    as_of = as_of or date.today()

    m = as_of.month - (months - 1)
    y = as_of.year
    while m <= 0:
        m += 12
        y -= 1
    series_start = date(y, m, 1)

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
        pri_clauses.append(f"i.sku_h3_name IN ({placeholders})")
        pri_params.extend(category)

    pri_filter = " AND ".join(pri_clauses)
    sec_filter = " AND ".join(sec_clauses)

    date_params: List[object] = [series_start, as_of, series_start, as_of]

    sql = f"""
    WITH
    primary_monthly AS (
        SELECT
            date_trunc('month', CAST(i.invoice_date AS DATE))  AS month,
            SUM(CAST(i.gross_sale_value AS DOUBLE))            AS pri_sales
        FROM main.vw_primary_invoice_data i
        LEFT JOIN main.customer_master pcm
            ON i.customer_pdt_map = pcm.customer_pdt_map
        WHERE {pri_filter}
          AND CAST(i.invoice_date AS DATE) BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
        GROUP BY 1
    ),
    secondary_monthly AS (
        SELECT
            date_trunc('month', CAST(d.invoice_date AS DATE))  AS month,
            SUM(CAST(d.net_sale_value AS DOUBLE))              AS sec_sales
        FROM main.vw_l_dms_invoice_data d
        LEFT JOIN main.customer_master scm
            ON d.customer_pdt_map = scm.customer_pdt_map
        WHERE {sec_filter}
          AND CAST(d.invoice_date AS DATE) BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
        GROUP BY 1
    )
    SELECT
        p.month,
        COALESCE(p.pri_sales, 0)                                 AS pri_sales,
        COALESCE(s.sec_sales, 0)                                 AS sec_sales,
        ROUND(
            COALESCE(s.sec_sales, 0) * 100.0 / NULLIF(p.pri_sales, 0),
            1
        )                                                        AS ratio_pct
    FROM primary_monthly p
    LEFT JOIN secondary_monthly s ON p.month = s.month
    ORDER BY p.month
    """

    all_params = pri_params + sec_params + date_params

    con = get_duckdb_connection()
    try:
        rows = con.execute(sql, all_params).fetchall()

        series = [
            {
                "month": r[0].strftime("%b %Y") if r[0] else None,
                "primary_sales_value": _mask_revenue(r[1]),
                "secondary_sales_value": _mask_revenue(r[2]),
                "secondary_vs_primary_ratio": r[3],
            }
            for r in rows
        ]

        current_ratio = series[-1]["secondary_vs_primary_ratio"] if series else None
        lm_ratio = series[-2]["secondary_vs_primary_ratio"] if len(series) >= 2 else None
        delta_pp = (
            round(current_ratio - lm_ratio, 1)
            if current_ratio is not None and lm_ratio is not None
            else None
        )

        return {
            "as_of": str(as_of),
            "chart": "Sec vs Pri Ratio",
            "chart_type": "lineChart",
            "months": months,
            "current_ratio_pct": current_ratio,
            "lm_ratio_pct": lm_ratio,
            "delta_pp": delta_pp,
            "norm_pct": norm,
            "filters": {
                "region": region,
                "state": state,
                "category": category,
            },
            "series": series,
        }
    finally:
        try:
            con.close()
        except Exception:
            pass


@router.get("/charts/outlet-billed-vs-ordered")
async def outlet_billed_vs_ordered(
    months: int = 4,
    as_of: Optional[date] = None,
):
    """
    Monthly line chart: Outlet Billed vs Outlet Order Taken.
      - Outlet Billed       : DISTINCTCOUNT(vw_l_dms_invoice_data.outlet_code) per month
      - Outlet Order Taken  : DISTINCTCOUNT(vw_l_secondary_visit_order.outlet_code) per month
    Gap = ordered − billed (orders not converted to invoice/delivery).
    """
    as_of = as_of or date.today()

    m = as_of.month - (months - 1)
    y = as_of.year
    while m <= 0:
        m += 12
        y -= 1
    series_start = date(y, m, 1)

    sql = """
    WITH
    billed_monthly AS (
        SELECT
            date_trunc('month', CAST(invoice_date AS DATE))  AS month,
            COUNT(DISTINCT outlet_code)                      AS billed_outlets
        FROM main.vw_l_dms_invoice_data
        WHERE CAST(invoice_date AS DATE) BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
        GROUP BY 1
    ),
    ordered_monthly AS (
        SELECT
            date_trunc('month', CAST(order_date AS DATE))    AS month,
            COUNT(DISTINCT outlet_code)                      AS ordered_outlets
        FROM main.vw_l_secondary_visit_order_shifted_mapped_only
        WHERE CAST(order_date AS DATE) BETWEEN CAST(? AS DATE) AND CAST(? AS DATE)
        GROUP BY 1
    )
    SELECT
        COALESCE(b.month, o.month)          AS month,
        COALESCE(b.billed_outlets, 0)       AS billed_outlets,
        COALESCE(o.ordered_outlets, 0)      AS ordered_outlets,
        COALESCE(o.ordered_outlets, 0)
            - COALESCE(b.billed_outlets, 0) AS gap
    FROM billed_monthly b
    FULL OUTER JOIN ordered_monthly o ON b.month = o.month
    ORDER BY 1
    """

    date_params: List[object] = [series_start, as_of, series_start, as_of]

    con = get_duckdb_connection()
    try:
        rows = con.execute(sql, date_params).fetchall()

        series = [
            {
                "month": r[0].strftime("%b %Y") if r[0] else None,
                "outlet_billed": r[1],
                "outlet_order_taken": r[2],
                "gap": r[3],
            }
            for r in rows
        ]

        current = series[-1] if series else {}
        lm = series[-2] if len(series) >= 2 else {}

        return {
            "as_of": str(as_of),
            "chart": "Outlet Billed vs Outlet Order Taken",
            "chart_type": "lineChart",
            "months": months,
            "current_month": {
                "month": current.get("month"),
                "outlet_billed": current.get("outlet_billed"),
                "outlet_order_taken": current.get("outlet_order_taken"),
                "gap": current.get("gap"),
                "billed_vs_lm_delta": (
                    current["outlet_billed"] - lm["outlet_billed"]
                    if current.get("outlet_billed") is not None and lm.get("outlet_billed") is not None
                    else None
                ),
                "ordered_vs_lm_delta": (
                    current["outlet_order_taken"] - lm["outlet_order_taken"]
                    if current.get("outlet_order_taken") is not None and lm.get("outlet_order_taken") is not None
                    else None
                ),
            },
            "series": series,
        }
    finally:
        try:
            con.close()
        except Exception:
            pass


@router.get("/tertiary-kpi/throughput")
async def throughput(
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
    """
    Throughput = SUM(net_sale_value) / COUNT(DISTINCT outlet_code)
    Source: vw_l_dms_invoice_data
    Returns current period, LM, and LYSM with % change.
    """
    as_of = as_of or date.today()

    if time == "CUSTOM" and (start_date is None or end_date is None):
        raise ValueError("For time=CUSTOM you must pass start_date and end_date")

    if time == "MTD":
        cur_start  = "date_trunc('month', CAST(? AS DATE))"
        cur_end    = "CAST(? AS DATE)"
        lm_start   = "date_trunc('month', CAST(? AS DATE) - INTERVAL 1 MONTH)"
        lm_end     = "date_trunc('month', CAST(? AS DATE)) - INTERVAL 1 DAY"
        lysm_start = "date_trunc('month', CAST(? AS DATE) - INTERVAL 1 YEAR)"
        lysm_end   = "date_trunc('month', CAST(? AS DATE) - INTERVAL 1 YEAR) + INTERVAL 1 MONTH - INTERVAL 1 DAY"
        date_params: List[object] = [as_of, as_of, as_of, as_of, as_of, as_of]
    elif time == "QTD":
        cur_start  = "date_trunc('quarter', CAST(? AS DATE))"
        cur_end    = "CAST(? AS DATE)"
        lm_start   = "date_trunc('month', CAST(? AS DATE) - INTERVAL 1 MONTH)"
        lm_end     = "date_trunc('month', CAST(? AS DATE)) - INTERVAL 1 DAY"
        lysm_start = "date_trunc('quarter', CAST(? AS DATE) - INTERVAL 1 YEAR)"
        lysm_end   = "CAST(? AS DATE) - INTERVAL 1 YEAR"
        date_params = [as_of, as_of, as_of, as_of, as_of, as_of]
    elif time == "YTD":
        cur_start  = "date_trunc('year', CAST(? AS DATE))"
        cur_end    = "CAST(? AS DATE)"
        lm_start   = "date_trunc('month', CAST(? AS DATE) - INTERVAL 1 MONTH)"
        lm_end     = "date_trunc('month', CAST(? AS DATE)) - INTERVAL 1 DAY"
        lysm_start = "date_trunc('year', CAST(? AS DATE) - INTERVAL 1 YEAR)"
        lysm_end   = "CAST(? AS DATE) - INTERVAL 1 YEAR"
        date_params = [as_of, as_of, as_of, as_of, as_of, as_of]
    else:
        cur_start  = "CAST(? AS DATE)"
        cur_end    = "CAST(? AS DATE)"
        lm_start   = "CAST(? AS DATE) - INTERVAL 1 MONTH"
        lm_end     = "CAST(? AS DATE) - INTERVAL 1 MONTH"
        lysm_start = "CAST(? AS DATE) - INTERVAL 1 YEAR"
        lysm_end   = "CAST(? AS DATE) - INTERVAL 1 YEAR"
        date_params = [start_date, end_date, start_date, end_date, start_date, end_date]

    filter_clauses = ["1=1"]
    filter_params: List[object] = []

    if region:
        filter_clauses.append("cm.customer_zone ILIKE ?")
        filter_params.append(f"%{region}%")
    if state:
        filter_clauses.append("cm.customer_state = ?")
        filter_params.append(state)
    if category:
        placeholders = ",".join(["?"] * len(category))
        filter_clauses.append(f"d.sku_h3_name IN ({placeholders})")
        filter_params.extend(category)

    filter_sql = " AND ".join(filter_clauses)

    sql = f"""
    WITH
    filtered AS (
        SELECT
            CAST(d.invoice_date AS DATE)        AS invoice_date,
            CAST(d.net_sale_value AS DOUBLE)    AS sale_value,
            d.outlet_code
        FROM main.vw_l_dms_invoice_data d
        LEFT JOIN main.customer_master cm
            ON d.customer_pdt_map = cm.customer_pdt_map
        WHERE {filter_sql}
    ),
    cur AS (
        SELECT COALESCE(SUM(sale_value), 0) AS sales, COUNT(DISTINCT outlet_code) AS outlets
        FROM filtered WHERE invoice_date BETWEEN {cur_start} AND {cur_end}
    ),
    lm AS (
        SELECT COALESCE(SUM(sale_value), 0) AS sales, COUNT(DISTINCT outlet_code) AS outlets
        FROM filtered WHERE invoice_date BETWEEN {lm_start} AND {lm_end}
    ),
    lysm AS (
        SELECT COALESCE(SUM(sale_value), 0) AS sales, COUNT(DISTINCT outlet_code) AS outlets
        FROM filtered WHERE invoice_date BETWEEN {lysm_start} AND {lysm_end}
    )
    SELECT
        c.sales, c.outlets,
        CASE WHEN c.outlets > 0 THEN ROUND(c.sales / c.outlets, 2) ELSE NULL END AS throughput,
        l.sales, l.outlets,
        CASE WHEN l.outlets > 0 THEN ROUND(l.sales / l.outlets, 2) ELSE NULL END AS lm_throughput,
        y.sales, y.outlets,
        CASE WHEN y.outlets > 0 THEN ROUND(y.sales / y.outlets, 2) ELSE NULL END AS lysm_throughput
    FROM cur c, lm l, lysm y
    """

    all_params = filter_params + date_params

    con = get_duckdb_connection()
    try:
        row = con.execute(sql, all_params).fetchone()
        if not row:
            return {}

        (
            cur_sales, cur_outlets, cur_tp,
            lm_sales,  lm_outlets,  lm_tp,
            ly_sales,  ly_outlets,  ly_tp,
        ) = row

        def _pct_change(curr, prev):
            if curr is None or prev is None or prev == 0:
                return None
            return round((curr - prev) / prev * 100, 1)

        return {
            "as_of": str(as_of),
            "time": time,
            "kpi": "Throughput",
            "formula": "SUM(net_sale_value) / COUNT(DISTINCT outlet_code)",
            "current": {
                "secondary_sales": _mask_revenue(cur_sales),
                "billed_outlets": cur_outlets,
                "throughput_value": _mask_revenue(cur_tp),
            },
            "lm": {
                "secondary_sales": _mask_revenue(lm_sales),
                "billed_outlets": lm_outlets,
                "throughput_value": _mask_revenue(lm_tp),
            },
            "lysm": {
                "secondary_sales": _mask_revenue(ly_sales),
                "billed_outlets": ly_outlets,
                "throughput_value": _mask_revenue(ly_tp),
            },
            "vs_lm_pct": _pct_change(cur_tp, lm_tp),
            "vs_lysm_pct": _pct_change(cur_tp, ly_tp),
            "filters": {
                "time": time,
                "start_date": None if start_date is None else str(start_date),
                "end_date": None if end_date is None else str(end_date),
                "region": region,
                "state": state,
                "category": category,
            },
        }
    finally:
        try:
            con.close()
        except Exception:
            pass


@router.get("/primary-kpi/forecast-accuracy")
async def forecast_accuracy(
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
    """
    Forecast Accuracy % = (1 - ABS(forecast - actual) / actual) * 100
    Actual  : SUM(vw_l_dms_invoice_data.net_sale_value)
    Forecast: SUM(sotarget."Secondary Target") * 100000
    Returns current period, LM, LYSM accuracy with delta.
    """
    as_of = as_of or date.today()

    if time == "CUSTOM" and (start_date is None or end_date is None):
        raise ValueError("For time=CUSTOM you must pass start_date and end_date")

    if time == "MTD":
        cur_start  = "date_trunc('month', CAST(? AS DATE))"
        cur_end    = "CAST(? AS DATE)"
        lm_start   = "date_trunc('month', CAST(? AS DATE) - INTERVAL 1 MONTH)"
        lm_end     = "date_trunc('month', CAST(? AS DATE)) - INTERVAL 1 DAY"
        lysm_start = "date_trunc('month', CAST(? AS DATE) - INTERVAL 1 YEAR)"
        lysm_end   = "date_trunc('month', CAST(? AS DATE) - INTERVAL 1 YEAR) + INTERVAL 1 MONTH - INTERVAL 1 DAY"
        date_params: List[object] = [as_of, as_of, as_of, as_of, as_of, as_of]
    elif time == "QTD":
        cur_start  = "date_trunc('quarter', CAST(? AS DATE))"
        cur_end    = "CAST(? AS DATE)"
        lm_start   = "date_trunc('month', CAST(? AS DATE) - INTERVAL 1 MONTH)"
        lm_end     = "date_trunc('month', CAST(? AS DATE)) - INTERVAL 1 DAY"
        lysm_start = "date_trunc('quarter', CAST(? AS DATE) - INTERVAL 1 YEAR)"
        lysm_end   = "CAST(? AS DATE) - INTERVAL 1 YEAR"
        date_params = [as_of, as_of, as_of, as_of, as_of, as_of]
    elif time == "YTD":
        cur_start  = "date_trunc('year', CAST(? AS DATE))"
        cur_end    = "CAST(? AS DATE)"
        lm_start   = "date_trunc('month', CAST(? AS DATE) - INTERVAL 1 MONTH)"
        lm_end     = "date_trunc('month', CAST(? AS DATE)) - INTERVAL 1 DAY"
        lysm_start = "date_trunc('year', CAST(? AS DATE) - INTERVAL 1 YEAR)"
        lysm_end   = "CAST(? AS DATE) - INTERVAL 1 YEAR"
        date_params = [as_of, as_of, as_of, as_of, as_of, as_of]
    else:
        cur_start  = "CAST(? AS DATE)"
        cur_end    = "CAST(? AS DATE)"
        lm_start   = "CAST(? AS DATE) - INTERVAL 1 MONTH"
        lm_end     = "CAST(? AS DATE) - INTERVAL 1 MONTH"
        lysm_start = "CAST(? AS DATE) - INTERVAL 1 YEAR"
        lysm_end   = "CAST(? AS DATE) - INTERVAL 1 YEAR"
        date_params = [start_date, end_date, start_date, end_date, start_date, end_date]

    filter_clauses = ["1=1"]
    filter_params: List[object] = []

    if region:
        filter_clauses.append("cm.customer_zone ILIKE ?")
        filter_params.append(f"%{region}%")
    if state:
        filter_clauses.append("cm.customer_state = ?")
        filter_params.append(state)
    if category:
        placeholders = ",".join(["?"] * len(category))
        filter_clauses.append(f"d.sku_h3_name IN ({placeholders})")
        filter_params.extend(category)

    filter_sql = " AND ".join(filter_clauses)

    sql = f"""
    WITH
    date_bounds AS (
        SELECT
            {cur_start}   AS cur_start,  {cur_end}    AS cur_end,
            {lm_start}    AS lm_start,   {lm_end}     AS lm_end,
            {lysm_start}  AS lysm_start, {lysm_end}   AS lysm_end
    ),
    base_actuals AS (
        SELECT
            CAST(d.invoice_date AS DATE)        AS invoice_date,
            CAST(d.net_sale_value AS DOUBLE)    AS sale_value
        FROM main.vw_l_dms_invoice_data d
        LEFT JOIN main.customer_master cm
            ON d.customer_pdt_map = cm.customer_pdt_map
        WHERE {filter_sql}
    ),
    actuals_cur  AS (
        SELECT COALESCE(SUM(sale_value), 0) AS v FROM base_actuals
        WHERE invoice_date BETWEEN (SELECT cur_start  FROM date_bounds) AND (SELECT cur_end  FROM date_bounds)
    ),
    actuals_lm   AS (
        SELECT COALESCE(SUM(sale_value), 0) AS v FROM base_actuals
        WHERE invoice_date BETWEEN (SELECT lm_start   FROM date_bounds) AND (SELECT lm_end   FROM date_bounds)
    ),
    actuals_lysm AS (
        SELECT COALESCE(SUM(sale_value), 0) AS v FROM base_actuals
        WHERE invoice_date BETWEEN (SELECT lysm_start FROM date_bounds) AND (SELECT lysm_end FROM date_bounds)
    ),
    forecast_cur  AS (
        SELECT COALESCE(SUM(CAST("Secondary Target" AS DOUBLE)) * 100000, 0) AS v
        FROM main.sotarget
        WHERE CAST("Date" AS DATE) BETWEEN (SELECT cur_start  FROM date_bounds) AND (SELECT cur_end  FROM date_bounds)
    ),
    forecast_lm   AS (
        SELECT COALESCE(SUM(CAST("Secondary Target" AS DOUBLE)) * 100000, 0) AS v
        FROM main.sotarget
        WHERE CAST("Date" AS DATE) BETWEEN (SELECT lm_start   FROM date_bounds) AND (SELECT lm_end   FROM date_bounds)
    ),
    forecast_lysm AS (
        SELECT COALESCE(SUM(CAST("Secondary Target" AS DOUBLE)) * 100000, 0) AS v
        FROM main.sotarget
        WHERE CAST("Date" AS DATE) BETWEEN (SELECT lysm_start FROM date_bounds) AND (SELECT lysm_end FROM date_bounds)
    )
    SELECT
        ac.v  AS actual_cur,
        fc.v  AS forecast_cur,
        CASE WHEN ac.v > 0 THEN ROUND((1 - ABS(fc.v - ac.v) / ac.v) * 100, 1) ELSE NULL END AS accuracy_cur,
        al.v  AS actual_lm,
        fl.v  AS forecast_lm,
        CASE WHEN al.v > 0 THEN ROUND((1 - ABS(fl.v - al.v) / al.v) * 100, 1) ELSE NULL END AS accuracy_lm,
        ay.v  AS actual_lysm,
        fy.v  AS forecast_lysm,
        CASE WHEN ay.v > 0 THEN ROUND((1 - ABS(fy.v - ay.v) / ay.v) * 100, 1) ELSE NULL END AS accuracy_lysm
    FROM actuals_cur ac, forecast_cur fc,
         actuals_lm al,  forecast_lm fl,
         actuals_lysm ay, forecast_lysm fy
    """

    all_params = filter_params + date_params

    con = get_duckdb_connection()
    try:
        row = con.execute(sql, all_params).fetchone()
        if not row:
            return {}

        (
            actual_cur,  forecast_cur_v,  acc_cur,
            actual_lm,   forecast_lm_v,   acc_lm,
            actual_lysm, forecast_lysm_v, acc_lysm,
        ) = row

        def _pp(curr, prev):
            if curr is None or prev is None:
                return None
            return round(curr - prev, 1)

        return {
            "as_of": str(as_of),
            "time": time,
            "kpi": "Forecast Accuracy %",
            "formula": "(1 - ABS(forecast - actual) / actual) × 100",
            "current": {
                "actual_sales": _mask_revenue(actual_cur),
                "forecast_sales": _mask_revenue(forecast_cur_v),
                "forecast_accuracy_pct": acc_cur,
            },
            "lm": {
                "actual_sales": _mask_revenue(actual_lm),
                "forecast_sales": _mask_revenue(forecast_lm_v),
                "forecast_accuracy_pct": acc_lm,
            },
            "lysm": {
                "actual_sales": _mask_revenue(actual_lysm),
                "forecast_sales": _mask_revenue(forecast_lysm_v),
                "forecast_accuracy_pct": acc_lysm,
            },
            "vs_lm_pp": _pp(acc_cur, acc_lm),
            "vs_lysm_pp": _pp(acc_cur, acc_lysm),
            "filters": {
                "time": time,
                "start_date": None if start_date is None else str(start_date),
                "end_date": None if end_date is None else str(end_date),
                "region": region,
                "state": state,
                "category": category,
            },
        }
    finally:
        try:
            con.close()
        except Exception:
            pass
