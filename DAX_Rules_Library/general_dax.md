# General DAX Reference (Amika Fabric Workspace)

Condensed reference for generating DAX queries against Amika's Fabric semantic model. Covers Sephora and Ulta retailer data. For full rules, see `dax_query_generation_rules.txt`.

---

## Output Contract

- **Always start with `EVALUATE`**.
- Return **only** DAX query text — no markdown, no backticks, no explanations, no comments.
- Use **only** tables/columns listed below. Never invent names.
- If required schema is missing, return exactly:
  ```
  EVALUATE ROW("error", "Missing required schema: <what is missing>")
  ```

---

## Known Tables and Key Columns

### `sps_activity` — main fact table (sales, units, inventory)
- `[SPS_Retailer_Name_key]` — retailer dimension (see Retailer Mapping below)
- `[SPS_ITEM_MAPPING_KEY]` — Sephora/Ulta product key
- `[SPS_CUSTOMER_ITEM_KEY]` — UltaPortal (e-comm) product key
- `[Store Number]`
- `[SPS_CUSTOMER_LOCATION_KEY]`
- `[Period ending date]`
- `[NET_SALES_RETAIL]`, `[NET_SALES_UNITS]` — sales/units
- `[Gross_Sales_RETAIL]`, `[Gross_Sales_Units]`
- `[INVENTORY_UNITS]`, `[INVENTORY_COST]`, `[INVENTORY_RETAIL]` — inventory only on retailer keys: `"ULTA"`, `"Sephora"`, `"SEPHORA CANADA"`

### `sps_retailer_item` — retailer-level item attributes
- `[SPS_ITEM_MAPPING_KEY]`, `[product_description]`, `[UPC]`, `[SIZE NAME]`, `[CATEGORY_NAME]`

### `shpt_master_sku_list_sku_mapping` — master SKU lookup (search products here FIRST)
- `[original_sku]`, `[upc_original_sku]`, `[Product ID/Name]`, `[collection]`, `[sku_name]`

### `sps_location` — shared location dimension
- `[SPS_CUSTOMER_LOCATION_KEY]`, `[Store Number/Name]`, `[Store_Name]`, `[STATE]`, `[POSTAL_CODE]`, `[CITY]`, `[ADDRESS]`, `[STORE_SIZE]`

### `sps_location_ulta` — Ulta-specific store dimension
- `[STORE_NUMBER]`, `[STORE_NAME]`, `[STATE]`, `[REGION]`, `[POSTAL_CODE]`, `[SPS_LOCATION_TYPE]` (STORE vs INTERNET)

### `shpt_retailer_doors_by_territory` — Sephora territory/region mapping
- `[Store Number]`, `[Field]` (region), `[Location Name]`

### `vw_sps_sales_goals_pacing_quarterly` — Sephora-only goals/pacing
- `[StoreNumber]`, `[Year]`, `[Quarter]`, `[AsOfDate]`, `[PacedGoal_ToDate]`, `[Actual_ToDate]`, `[Retailer]`

### `WeekEndingTable`
- `[period ending date]`

---

## Retailer Mapping Cheatsheet

Apply with `KEEPFILTERS('sps_activity'[SPS_Retailer_Name_key] = ...)`:

| Question type | Retailer key | Metric |
|---|---|---|
| Sephora store-total **sales** ($) | `"SephoraLocationBuyerReport"` | `[NET_SALES_RETAIL]` |
| Sephora **units** (non-product, location-level) | `"Sephora"` | `[Gross_Sales_Units]` |
| Sephora product/SKU/item-level (units only) | `IN {"Sephora", "Sephora Canada"}` | `[Gross_Sales_Units]` |
| Sephora B&M item-level (only when explicit) | `"SephoraNorthAmericaBuyerReport"` | `[NET_SALES_UNITS]` |
| Ulta units (non-product) | `"UltaPortal"` | `[NET_SALES_UNITS]` |
| Ulta location-level (any geo) | `"UltaPortalLocation"` | `[NET_SALES_RETAIL]` |
| Ulta product/item-level | `"Ulta"` | `[Gross_Sales_Units]` (units), `[NET_SALES_RETAIL]` (sales) |
| UltaPortal e-comm product | `"UltaPortal"` | `[NET_SALES_UNITS]` (units), `[NET_SALES_RETAIL]` (sales) |
| Inventory — Ulta | `"ULTA"` | `[INVENTORY_UNITS]` |
| Inventory — Sephora US | `"Sephora"` | `[INVENTORY_UNITS]` |
| Inventory — Sephora Canada | `"SEPHORA CANADA"` | `[INVENTORY_UNITS]` |

**Critical constraint:** Sephora **item/product-level queries are units-only**. If user asks for "Sephora product sales in dollars", return the missing-schema error row.

---

## Question Analysis Steps (do in order)

1. **Detect retailer** — explicit (Sephora/Ulta) or inferred from question
2. **Detect metric** — sales/dollars → sales metric; units/volume → units; goals → goals table
3. **Detect grain** — product/SKU, location/store, category, or KPI summary
4. **Detect time scope** — MTD, YTD, last week, last N weeks, latest month, explicit Month YYYY, vs LY
5. **Detect direction** — top/growth/highest vs bottom/decline/down
6. **Pick filters, tables, columns**

---

## Time Logic

- Anchor `_EndDate` from latest non-blank metric date:
  ```
  VAR _EndDate = CALCULATE(MAX('sps_activity'[Period ending date]),
    KEEPFILTERS('sps_activity'[SPS_Retailer_Name_key] = <retailer>),
    NOT ISBLANK('sps_activity'[<metric>]))
  ```
- Month windows:
  ```
  VAR _StartDate = DATE(YEAR(_EndDate), MONTH(_EndDate), 1)
  VAR _EndOfMonth = EOMONTH(_StartDate, 0)
  VAR _StartDateLY = EDATE(_StartDate, -12)
  VAR _EndOfMonthLY = EOMONTH(_StartDateLY, 0)
  ```
- Last completed week vs same week LY (shift back 364 days):
  ```
  VAR _WeekStart = _EndDate - 6
  VAR _EndDateLY = _EndDate - 364
  VAR _WeekStartLY = _WeekStart - 364
  ```
- For explicit "Month YYYY vs Month YYYY": build directly from extracted year/month, do NOT derive from `_EndDate`.
- Use explicit `>=` / `<=` filters or `DATESBETWEEN`.
- Common time funcs: `DATESYTD`, `DATESMTD`, `DATESQTD`, `DATEADD`, `DATESINPERIOD`, `SAMEPERIODLASTYEAR`, `EOMONTH`, `EDATE`.

---

## Common Patterns

### Top N ranking
```
EVALUATE TOPN(10,
  SUMMARIZECOLUMNS('sps_activity'[<grain>], "Sales", SUM('sps_activity'[NET_SALES_RETAIL])),
  [Sales], DESC)
```

### Vs last year delta
```
DeltaVsLY = [Current] - COALESCE([LY], 0)
GrowthPctVsLY = DIVIDE([Current] - [LY], [LY])
```

### Product lookup (specific SKU/UPC/name)
**Always** search `shpt_master_sku_list_sku_mapping` FIRST, never scan `sps_activity` by free text.
```
VAR _MappingMatches = FILTER(ALL('shpt_master_sku_list_sku_mapping'), <search predicate>)
VAR _MatchedKeys = DISTINCT(FILTER(
  UNION(
    SELECTCOLUMNS(_MappingMatches, "SPS_ITEM_MAPPING_KEY", FORMAT('shpt_master_sku_list_sku_mapping'[original_sku], "")),
    SELECTCOLUMNS(_MappingMatches, "SPS_ITEM_MAPPING_KEY", FORMAT(VALUE('shpt_master_sku_list_sku_mapping'[upc_original_sku]), "0"))
  ),
  NOT ISBLANK([SPS_ITEM_MAPPING_KEY]) && [SPS_ITEM_MAPPING_KEY] <> ""
))
RETURN CALCULATETABLE(<aggregation>, KEEPFILTERS(<retailer>), TREATAS(_MatchedKeys, 'sps_activity'[SPS_ITEM_MAPPING_KEY]))
```
**Always UNION both `original_sku` AND `upc_original_sku`** — even when the lookup matched only `original_sku`.

### Product description (safe — handles duplicates)
Use scalar `MIN` over filtered mapping table — never `LOOKUPVALUE`:
```
VAR _Key = [SPS_ITEM_MAPPING_KEY]
RETURN CALCULATE(
  MIN('shpt_master_sku_list_sku_mapping'[Product ID/Name]),
  FILTER(ALL('shpt_master_sku_list_sku_mapping'),
    IF(LEFT(FORMAT(_Key,""),2) = "AM",
      FORMAT('shpt_master_sku_list_sku_mapping'[original_sku],"") = FORMAT(_Key,""),
      FORMAT(VALUE('shpt_master_sku_list_sku_mapping'[upc_original_sku]),"0") = FORMAT(VALUE(_Key),"0"))))
```

### Location join keys
- **Sephora**: `'sps_activity'[Store Number]` ↔ `'shpt_retailer_doors_by_territory'[Store Number]`
- **Ulta sales/units**: `'sps_activity'[Store Number]` ↔ `'sps_location_ulta'[STORE_NUMBER]`
- **Exact Ulta UPC location**: use `'sps_activity'[SPS_CUSTOMER_LOCATION_KEY]` ↔ `'sps_location'[SPS_CUSTOMER_LOCATION_KEY]`

---

## Sephora Goals (Sephora-only)

- Source table: `'vw_sps_sales_goals_pacing_quarterly'` (NOT `sps_activity`)
- Retailer filter: `KEEPFILTERS('vw_sps_sales_goals_pacing_quarterly'[Retailer] = "Sephora")`
- Goal pace: `PaceToGoalPct = DIVIDE([Actual_ToDate], [PacedGoal_ToDate])`
- "Below goal" / "at risk" / "need acceleration": `PaceToGoalPct < 0.97`
- Minimum-volume guard: `[GoalToDate] >= 1000`
- For year/quarter, use values from question; otherwise derive from `MAX(AsOfDate)` and `QUARTER(_AsOfDate)`. Never hardcode.
- Store join: `[StoreNumber]` ↔ `'shpt_retailer_doors_by_territory'[Store Number]`
- For region rollup, group on `'shpt_retailer_doors_by_territory'[Field]`
- **Ulta has no goals** — return missing-schema error if asked

---

## Inventory / OOS

- Inventory columns only populate on retailer keys: `"ULTA"`, `"Sephora"`, `"SEPHORA CANADA"`
- OOS row: `[INVENTORY_UNITS] = 0` under inventory-bearing retailer key
- BLANK `INVENTORY_UNITS` ≠ OOS (it means feed didn't report)
- Store-level OOS rollup guards (exclude DCs/e-commerce):
  - `TotalRecords > 1000`
  - `AvgInvUnits < 100`
- Known Ulta DC/e-comm store numbers to exclude: `1010, 1001, 0750, 1070, 0822, 0871, 0844, 0855, 0870, 0902`
- For "current inventory" snapshot: filter `[Period ending date] = _MaxDate`
- For weekly trend: group by `[Week Start (Sunday)]`

---

## Ranking and Delta Rules

- Use `RANKX` (not `TOPN`) when the question asks for the rank of one specific store/SKU.
- For named-store rank: rank across **all** stores first, **then** filter to the named store. Don't filter before ranking.
- Growth ranking: filter `Delta > 0`, sort `DESC`. Decline: filter `Delta < 0`, sort `ASC`.
- Field-average benchmarking: compute the metric table first, then `AVERAGEX` over non-blank rows.
- Null-safe LY: `COALESCE([LY], 0)`.

---

## Style Constraints

- Use `KEEPFILTERS` for retailer and date filters.
- Use `NATURALLEFTOUTERJOIN` to combine current vs LY product sets.
- Add `ORDER BY` on the final ranking metric for deterministic output.
- Keep variable names readable (`_EndDate`, `_MatchedKeys`, `_StartDate`, etc.).
- Don't use `LOOKUPVALUE` for mapped attributes when duplicates may exist — use scalar `MIN` over filtered table.
- Don't use `IF/SWITCH` to return one table expression vs another for store matching — that fails as scalar conversion.

---

## Validation Checklist (before returning)

- [ ] Query starts with `EVALUATE`
- [ ] Correct retailer filter applied
- [ ] Correct metric column for retailer + grain (units vs sales — Sephora item is units only)
- [ ] Correct grain column
- [ ] Date logic explicit; LY logic uses null-safe math
- [ ] No placeholder tokens (no `<TABLE>`, no `{...}`)
- [ ] No markdown formatting in output
