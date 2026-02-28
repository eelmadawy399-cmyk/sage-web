import os
import json
from http.server import BaseHTTPRequestHandler
import google.auth
import google.auth.transport.requests
from google.oauth2 import service_account

# Scopes needed for Earth Engine
SCOPES = ['https://www.googleapis.com/auth/earthengine']

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Allow CORS
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        # Load service account credentials from environment variable
        SERVICE_ACCOUNT_JSON = os.environ.get('GEE_SERVICE_ACCOUNT_JSON')
        
        if not SERVICE_ACCOUNT_JSON:
            response = json.dumps({"error": "GEE_SERVICE_ACCOUNT_JSON environment variable not set"})
            self.wfile.write(response.encode('utf-8'))
            return

        try:
            # Parse the JSON string
            info = json.loads(SERVICE_ACCOUNT_JSON)
            
            # Authenticate using service account
            credentials = service_account.Credentials.from_service_account_info(
                info, scopes=SCOPES
            )
            
            # Refresh credentials to get access token
            auth_req = google.auth.transport.requests.Request()
            credentials.refresh(auth_req)
            
            # Return the token and project ID
            result = {
                "token": credentials.token,
                "project_id": info.get('project_id', 'sage2-egypt-project')
            }
            
            self.wfile.write(json.dumps(result).encode('utf-8'))
            
        except Exception as e:
            response = json.dumps({"error": str(e)})
            self.wfile.write(response.encode('utf-8'))
