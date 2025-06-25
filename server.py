import os
from http.server import SimpleHTTPRequestHandler
import socketserver

PORT = int(os.environ.get("PORT", 8000))
Handler = SimpleHTTPRequestHandler

with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
    print(f"🚀 Servidor iniciado en el puerto {PORT}")
    httpd.serve_forever()