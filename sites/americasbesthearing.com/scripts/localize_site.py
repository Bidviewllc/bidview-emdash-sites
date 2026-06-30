#!/usr/bin/env python3
"""
Rebuild the route-style static site from scraped-html into local-site.

This wrapper keeps the user-facing command in Python while delegating the
HTML rewrite work to the local Node helper that uses the repo's installed
dependencies.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HELPER = ROOT / "scripts" / "localize_site_impl.js"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Rebuild local-site from scraped-html using shared partials."
    )
    parser.add_argument(
        "--preserve-existing-support-dirs",
        action="store_true",
        help="Do not overwrite copied support directories such as wp-includes.",
    )
    args = parser.parse_args()

    command = ["node", str(HELPER)]
    if args.preserve_existing_support_dirs:
        command.append("--preserve-existing-support-dirs")

    try:
        completed = subprocess.run(command, cwd=ROOT, check=False)
    except FileNotFoundError:
        print("Node.js was not found on PATH. The rebuild helper requires Node.", file=sys.stderr)
        return 1

    return completed.returncode


if __name__ == "__main__":
    raise SystemExit(main())
