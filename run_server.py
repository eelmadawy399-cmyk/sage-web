import http.server
import socketserver
import os

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Allow Google Sign-in Popup by using default local dev settings (unsafe-none)
        self.send_header('Cross-Origin-Opener-Policy', 'unsafe-none')
        # Standard security/caching headers for local development
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

with ReusableTCPServer(("", PORT), Handler) as httpd:
    print(f"Server started at http://localhost:{PORT}", flush=True)
    print(f"Serving directory: {DIRECTORY}", flush=True)
    print("Press Ctrl+C to stop the server.", flush=True)
    httpd.serve_forever()
