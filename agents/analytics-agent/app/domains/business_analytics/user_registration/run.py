"""Entry point: ingest user_registration from the configured source and run analysis.

    python -m app.domains.business_analytics.user_registration.run

Source is config-driven (USER_REGISTRATION_DATA_SOURCE=csv|rds). The analysis runs over the
full fetched set; only the last N days are persisted to the warehouse.
"""
from __future__ import annotations

import logging

from app.config.settings import get_settings
from app.domains.business_analytics.user_registration import analysis, pipeline
from app.domains.business_analytics.user_registration.sources import build_source
from app.integrations.duckdb_client import connect as db_connect


def run_pipeline() -> dict:
    settings = get_settings()
    source = build_source(settings)
    steps: list[dict[str, str]] = []

    with db_connect() as conn:
        result = pipeline.ingest_with_conn(conn, source, settings, steps)
        report = analysis.analyze(conn, result["staging_table"])

    result["steps"] = steps
    result["analysis"] = report
    return result


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    result = run_pipeline()

    print("\n=== INGESTION ===")
    for step in result["steps"]:
        print(f"  [{step['status']}] {step['message']}")
    print(f"  source={result['source']} fetched={result['fetched_rows']} persisted={result['persisted_rows']}")

    print("\n=== ANALYSIS (aggregates over fetched set) ===\n")
    print(analysis.format_report(result["analysis"]))


if __name__ == "__main__":
    main()
