import os
print("✅ Este mensaje confirma que se está ejecutando server.py")

PORT = int(os.environ.get("PORT", 8000))
print(f"Puerto detectado desde entorno: {PORT}")

from http.server import SimpleHTTPRequestHandler
import socketserver

Handler = SimpleHTTPRequestHandler
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"🚀 Servidor iniciado en el puerto {PORT}")
    httpd.serve_forever()