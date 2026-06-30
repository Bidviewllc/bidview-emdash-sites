#!/usr/bin/env python3
"""Serve a static directory with no-cache headers for local QA."""

from __future__ import annotations

import argparse
import functools
import http.server
import os
import socketserver
from pathlib import Path


class NoCacheRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, format: str, *args: object) -> None:
        print("%s - - [%s] %s" % (self.client_address[0], self.log_date_time_string(), format % args))


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve static files with no-cache headers for QA.")
    parser.add_argument("--host", default="127.0.0.1", help="Host/interface to bind. Default: 127.0.0.1")
    parser.add_argument("--port", type=int, default=4173, help="Port to bind. Default: 4173")
    parser.add_argument("--directory", default="local-copy", help="Directory to serve. Default: local-copy")
    args = parser.parse_args()

    directory = Path(args.directory).resolve()
    if not directory.is_dir():
        raise SystemExit(f"Directory does not exist: {directory}")

    handler = functools.partial(NoCacheRequestHandler, directory=str(directory))
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer((args.host, args.port), handler) as httpd:
        print(f"Serving {directory} at http://{args.host}:{args.port}/")
        print("Press Ctrl+C to stop.")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
