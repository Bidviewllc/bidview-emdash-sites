import re
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DB = ROOT / ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/e7352547963de7050bd7d94658afc4fe78b61811b7815da12d90be8e863abf4d.sqlite"
OUTPUT_SQL = ROOT / "scripts/_staging-d1-dump.sql"

SKIP_TABLES = {
    "_cf_METADATA",
}

SKIP_PREFIXES = (
    "sqlite_",
    "_emdash_fts_",
)

DEFAULT_NOW_PATTERN = re.compile(r"\s+default\s+\(datetime\('now'\)\)", re.IGNORECASE)
DEFAULT_CURRENT_PATTERN = re.compile(r"\s+default\s+CURRENT_TIMESTAMP", re.IGNORECASE)


def quote_ident(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def sql_literal(value):
    if value is None:
        return "NULL"
    if isinstance(value, bytes):
        return "X'" + value.hex() + "'"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def should_skip_name(name: str) -> bool:
    return name in SKIP_TABLES or any(name.startswith(prefix) for prefix in SKIP_PREFIXES)


def sanitize_create(sql: str) -> str:
    sql = DEFAULT_NOW_PATTERN.sub("", sql)
    sql = DEFAULT_CURRENT_PATTERN.sub("", sql)
    return sql


def main():
    con = sqlite3.connect(SOURCE_DB)
    con.row_factory = sqlite3.Row

    tables = [
        row["name"]
        for row in con.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND sql IS NOT NULL ORDER BY name"
        )
        if not should_skip_name(row["name"])
    ]

    with OUTPUT_SQL.open("w", encoding="utf-8", newline="\n") as f:
        f.write("PRAGMA foreign_keys=OFF;\n")

        for table in reversed(tables):
            f.write(f"DROP TABLE IF EXISTS {quote_ident(table)};\n")

        for table in tables:
            row = con.execute(
                "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
                (table,),
            ).fetchone()
            f.write(sanitize_create(row["sql"]).rstrip(";") + ";\n")

        for row in con.execute(
            "SELECT name, sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL ORDER BY name"
        ):
            if should_skip_name(row["name"]):
                continue
            sql = row["sql"]
            if any(prefix in sql for prefix in SKIP_PREFIXES):
                continue
            f.write(sql.rstrip(";") + ";\n")

        for row in con.execute(
            "SELECT name, sql FROM sqlite_master WHERE type='trigger' AND sql IS NOT NULL ORDER BY name"
        ):
            if should_skip_name(row["name"]):
                continue
            sql = row["sql"]
            if any(prefix in sql for prefix in SKIP_PREFIXES):
                continue
            f.write(sql.rstrip(";") + ";\n")

        for table in tables:
            columns = [
                row["name"]
                for row in con.execute(f"PRAGMA table_info({quote_ident(table)})")
            ]
            if not columns:
                continue
            column_sql = ", ".join(quote_ident(column) for column in columns)
            for row in con.execute(f"SELECT * FROM {quote_ident(table)}"):
                value_sql = ", ".join(sql_literal(row[column]) for column in columns)
                f.write(
                    f"INSERT INTO {quote_ident(table)} ({column_sql}) VALUES ({value_sql});\n"
                )

        f.write("PRAGMA foreign_keys=ON;\n")

    print(OUTPUT_SQL)


if __name__ == "__main__":
    main()
