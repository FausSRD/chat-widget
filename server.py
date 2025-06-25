import http.server
import socketserver
import os

# Railway asigna el puerto en esta variable
PORT = int(os.environ.get("PORT", 8000))

Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"🚀 Servidor iniciado en el puerto {PORT}")
    httpd.serve_forever()