"""Canonical schema for the user_registration dataset and CSV/RDS validation.

The canonical column names mirror the RTO_SUMIT.user_registration RDS table so the same
downstream pipeline works whether rows arrive from a CSV export or a live RDS query.
"""
from __future__ import annotations

from dataclasses import dataclass

# Canonical columns expected from any source (matches the RDS table, 18 columns).
# `required` columns must be present; analysis fails fast if they are missing.
REQUIRED_COLUMNS: tuple[str, ...] = (
    "id",
    "last_login",
    "status",
    "created_at",
    "source",
    "platform",
    "version_code",
    "is_mobile_verification_pending",
)

# Optional columns are used when present and tolerated when absent (e.g. a CSV that dropped
# PII columns entirely rather than masking them).
OPTIONAL_COLUMNS: tuple[str, ...] = (
    "user_token",
    "name",
    "email",
    "device_id",
    "fcm_token",
    "last_mobile_sync",
    "last_sync_status",
    "updated_at",
    "deleted_at",
    "mobile_number",
)

ALL_COLUMNS: tuple[str, ...] = REQUIRED_COLUMNS + OPTIONAL_COLUMNS

# Direct identifiers that must never be persisted raw to the warehouse.
PII_COLUMNS: frozenset[str] = frozenset(
    {"name", "email", "mobile_number", "device_id", "fcm_token", "user_token"}
)


@dataclass(frozen=True)
class SchemaValidation:
    ok: bool
    present: list[str]
    missing_required: list[str]
    missing_optional: list[str]
    unexpected: list[str]

    def message(self) -> str:
        parts = [f"{len(self.present)} canonical columns present"]
        if self.missing_required:
            parts.append(f"MISSING REQUIRED: {self.missing_required}")
        if self.missing_optional:
            parts.append(f"missing optional (ok): {self.missing_optional}")
        if self.unexpected:
            parts.append(f"extra columns ignored: {self.unexpected}")
        return " | ".join(parts)


def _normalize(name: str) -> str:
    return name.strip().strip('"').strip("`").lower()


def validate_columns(source_columns: list[str]) -> SchemaValidation:
    """Compare a source's columns against the canonical schema.

    This is the cut-over guardrail: it ensures a CSV export has the same column names the
    live RDS query will produce, so switching DATA_SOURCE from csv to rds is silent-safe.
    """
    normalized = [_normalize(c) for c in source_columns]
    present_set = set(normalized)

    present = [c for c in ALL_COLUMNS if c in present_set]
    missing_required = [c for c in REQUIRED_COLUMNS if c not in present_set]
    missing_optional = [c for c in OPTIONAL_COLUMNS if c not in present_set]
    unexpected = [c for c in normalized if c not in set(ALL_COLUMNS)]

    return SchemaValidation(
        ok=not missing_required,
        present=present,
        missing_required=missing_required,
        missing_optional=missing_optional,
        unexpected=unexpected,
    )
