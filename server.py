#!/usr/bin/env python3
"""
Svenska Studio — local dev server.

Serves the app with COOP/COEP headers required by FFmpeg.wasm to use
SharedArrayBuffer. Also serves node_modules so @ffmpeg/* can be imported
as same-origin ES modules — this ensures the Worker URL resolves to
localhost and inherits cross-origin isolation automatically.

Usage:
    python3 server.py          # serves on http://localhost:8765
    python3 server.py 9000     # custom port
"""

import sys
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler


class StudioHandler(SimpleHTTPRequestHandler):
    """SimpleHTTPRequestHandler with COOP/COEP headers on every response."""

    def end_headers(self):
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):
        print(f"  {self.address_string()}  {fmt % args}")


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server = HTTPServer(("localhost", port), StudioHandler)
    print(f"\n🇸🇪  Svenska Studio")
    print(f"    http://localhost:{port}\n")
    print("    Press Ctrl-C to stop.\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n    Server stopped.")


if __name__ == "__main__":
    main()
