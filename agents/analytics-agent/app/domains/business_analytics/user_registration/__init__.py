"""Source-agnostic user-registration analytics.

Ingest from a configurable data source (CSV today, RC RDS once reachable) into the DuckDB
warehouse with PII masked and a short retention window, then run analysis whose logic is
identical regardless of the source.
"""
