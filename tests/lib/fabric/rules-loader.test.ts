import { describe, expect, test, beforeEach } from 'vitest';
import {
  loadGeneralDAXRules,
  loadQueryCatalog,
  resetRulesCache,
} from '@/lib/fabric/rules-loader';

beforeEach(() => {
  resetRulesCache();
});

describe('rules-loader', () => {
  test('loadGeneralDAXRules returns content from general_dax.md', () => {
    const rules = loadGeneralDAXRules();
    expect(rules).toContain('EVALUATE');
    expect(rules).toContain('sps_activity');
    expect(rules.length).toBeGreaterThan(500);
  });

  test('loadQueryCatalog parses descriptions.md into entries', () => {
    const catalog = loadQueryCatalog();
    expect(catalog.length).toBeGreaterThan(50);

    const sephoraKpi = catalog.find((e) => e.queryKey === 'sephora_kpi_sales_ly');
    expect(sephoraKpi).toBeDefined();
    expect(sephoraKpi?.description).toContain('Sephora');
  });

  test('loadQueryCatalog includes template DAX from templates JSON', () => {
    const catalog = loadQueryCatalog();
    const topRevenue = catalog.find((e) => e.queryKey === 'top_revenue_drivers_current');
    expect(topRevenue).toBeDefined();
    expect(topRevenue?.daxTemplate).toContain('EVALUATE');
    expect(topRevenue?.daxTemplate).toContain('TOPN');
  });

  test('loadQueryCatalog returns the same array reference on second call (cached)', () => {
    const first = loadQueryCatalog();
    const second = loadQueryCatalog();
    expect(first).toBe(second);
  });

  test('resetRulesCache returns a fresh array on next load', () => {
    const first = loadQueryCatalog();
    resetRulesCache();
    const second = loadQueryCatalog();
    expect(first).not.toBe(second);
    expect(first.length).toBe(second.length);
  });

  test('catalog entries from descriptions have no daxTemplate (Amika-specific keys)', () => {
    const catalog = loadQueryCatalog();
    const sephoraKpi = catalog.find((e) => e.queryKey === 'sephora_kpi_sales_ly');
    expect(sephoraKpi?.daxTemplate).toBeUndefined();
  });
});
