#!/bin/bash
# ==========================================================
# Automated Integration Test - OpenVPN Cluster Connectivity
# ==========================================================
set -e

# Prevent Git Bash from converting Unix paths (e.g. /dev/net/tun) into Windows paths
export MSYS_NO_PATHCONV=1

CLIENT_NAME="vpn-client-test"
TEST_PROFILE="tests/test-client.ovpn"

echo "=== Starting Integration Tests ==="

# 1. Initialize local test PKI if certs are missing
if [ ! -f "docker/config/pki/ca.crt" ] || [ ! -f "docker/config/pki/tls-crypt.key" ] || [ ! -f "docker/config/pki/server-node1.crt" ] || [ ! -f "docker/config/pki/server-node2.crt" ] || [ ! -f "docker/config/pki/server-node3.crt" ]; then
    echo "[INFO] PKI not fully initialized. Running PKI bootstrap..."
    chmod +x scripts/init-pki.sh
    ./scripts/init-pki.sh
fi

# 2. Build and start the cluster services in the background
echo "[INFO] Cleaning up any conflicting containers and networks..."
docker rm -f haproxy-lb openvpn-node1 openvpn-node2 openvpn-node3 vpn-frontend "$CLIENT_NAME" >/dev/null 2>&1 || true
docker network rm openvpn-hardened_vpn_network >/dev/null 2>&1 || true

echo "[INFO] Starting Docker Compose cluster..."
docker compose down --remove-orphans >/dev/null 2>&1 || true
docker compose up --build -d

# Wait for Logto to respond
echo "[INFO] Waiting for Logto service to respond..."
LOGTO_READY=false
for i in {1..30}; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/oidc/.well-known/openid-configuration | tr -d '\r')
    if [ "$STATUS" = "200" ]; then
        echo "[SUCCESS] Logto service is ready (HTTP 200)."
        LOGTO_READY=true
        break
    fi
    echo "[INFO] Logto service not ready yet (HTTP $STATUS). Retrying in 2s ($i/30)..."
    sleep 2
done

if [ "$LOGTO_READY" = "false" ]; then
    echo "[ERROR] Logto service failed to start in time!"
    echo "=== Logto Logs ==="
    docker logs security-logto || true
    docker compose down >/dev/null 2>&1 || true
    exit 1
fi

# 2.5 Inject M2M test credentials into Logto database (for CI/CD pipeline compatibility)
echo "[INFO] Injecting M2M test credentials into Logto database..."
docker exec security-postgres psql -U postgres -d logto -c "
  DELETE FROM applications_roles WHERE application_id = '6oi8l4d2919eknf6t3yn9';
  DELETE FROM application_secrets WHERE application_id = '6oi8l4d2919eknf6t3yn9';
  DELETE FROM applications WHERE id = '6oi8l4d2919eknf6t3yn9';

  INSERT INTO applications (tenant_id, id, name, secret, type, oidc_client_metadata, custom_client_metadata, custom_data, is_third_party, app_level_access_control_enabled)
  VALUES ('default', '6oi8l4d2919eknf6t3yn9', 'logto-kevin', '#internal:62TcUsOd6aIbJDwZXnJzrErFvwe9gPDY', 'MachineToMachine', '{\"redirectUris\": [], \"postLogoutRedirectUris\": []}'::jsonb, '{}'::jsonb, '{}'::jsonb, false, false);

  INSERT INTO application_secrets (tenant_id, application_id, name, value)
  VALUES ('default', '6oi8l4d2919eknf6t3yn9', 'Default secret', 'sAXjILcsNS9ipQxW0vEAs9wZlWPuElAe');

  INSERT INTO applications_roles (tenant_id, id, application_id, role_id)
  VALUES ('default', 's2lab3q1tnsuvnk2v2c0v', '6oi8l4d2919eknf6t3yn9', COALESCE(
    (SELECT id FROM roles WHERE name = 'Logto Management API access' LIMIT 1),
    (SELECT id FROM roles WHERE type = 'MachineToMachine' LIMIT 1)
  ));
" > /dev/null
echo "[SUCCESS] Test credentials injected successfully."

# Wait for frontend portal to respond
echo "[INFO] Waiting for frontend portal to respond..."
PORTAL_READY=false
for i in {1..20}; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ | tr -d '\r')
    if [ "$STATUS" = "200" ]; then
        echo "[SUCCESS] Frontend portal is ready (HTTP 200)."
        PORTAL_READY=true
        break
    fi
    echo "[INFO] Portal not ready yet (HTTP $STATUS). Retrying in 2s ($i/20)..."
    sleep 2
done

if [ "$PORTAL_READY" = "false" ]; then
    echo "[ERROR] Frontend portal failed to start in time!"
    echo "=== Frontend Logs ==="
    docker logs vpn-frontend || true
    docker compose down >/dev/null 2>&1 || true
    exit 1
fi

# 3. Request E2E credentials via Next.js API
echo "=== E2E Portal & API Security Checks ==="

# Check unauthenticated access
echo "[INFO] Testing unauthenticated OVPN download request..."
STATUS_CODE=$(curl -s -X POST -o /dev/null -w "%{http_code}" http://localhost:3000/api/generate-vpn | tr -d '\r')
if [ "$STATUS_CODE" != "401" ]; then
    echo "[ERROR] Unauthenticated request returned status $STATUS_CODE (expected 401)!"
    docker compose down >/dev/null 2>&1 || true
    exit 1
fi
echo "[SUCCESS] Unauthenticated request correctly rejected with 401 Unauthorized."

# Perform login
echo "[INFO] Authenticating to frontend portal..."
COOKIE_FILE="tests/vpn_cookies.txt"
rm -f "$COOKIE_FILE"
AUTH_RESPONSE=$(curl -s -c "$COOKIE_FILE" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@local.com","password":"password123"}' \
  http://localhost:3000/api/login || echo "AUTH_FAILED")

if ! grep -q "soc_session" "$COOKIE_FILE" 2>/dev/null; then
    echo "[ERROR] Authentication failed! Response: $AUTH_RESPONSE"
    rm -f "$COOKIE_FILE"
    docker compose down >/dev/null 2>&1 || true
    exit 1
fi
echo "[SUCCESS] Successfully authenticated and retrieved session cookie."

# Download OVPN Profile
echo "[INFO] Downloading dynamic OVPN profile via API..."
curl -s -X POST -b "$COOKIE_FILE" -o "$TEST_PROFILE" "http://localhost:3000/api/generate-vpn" || true

if [ ! -s "$TEST_PROFILE" ]; then
    echo "[ERROR] Failed to download OVPN profile or file is empty!"
    rm -f "$COOKIE_FILE"
    docker compose down >/dev/null 2>&1 || true
    exit 1
fi

# Verify dynamic certificates are present in profile
if ! grep -q "<ca>" "$TEST_PROFILE" || ! grep -q "<cert>" "$TEST_PROFILE" || ! grep -q "<key>" "$TEST_PROFILE" || ! grep -q "<tls-crypt>" "$TEST_PROFILE"; then
    echo "[ERROR] Downloaded OVPN profile is missing key certificate blocks!"
    cat "$TEST_PROFILE"
    rm -f "$COOKIE_FILE"
    docker compose down >/dev/null 2>&1 || true
    exit 1
fi
echo "[SUCCESS] OVPN profile downloaded successfully and verified."

# Clean up cookie file
rm -f "$COOKIE_FILE"

# Verify ephemeral cleanup on server
echo "[INFO] Verifying ephemeral cleanup in frontend container..."
TEMP_FILES=$(docker exec vpn-frontend sh -c "find /tmp -name 'client_*' -o -name 'ext_*'" 2>/dev/null || echo "")
if [ -n "$TEMP_FILES" ]; then
    echo "[ERROR] Ephemeral cleanup failed! Found temporary files on frontend:"
    echo "$TEMP_FILES"
    docker compose down >/dev/null 2>&1 || true
    exit 1
fi
echo "[SUCCESS] Ephemeral cleanup verified. No key files left on the server."

# Adjust profile to connect within the Docker network
python3 -c "
with open('$TEST_PROFILE', 'r') as f:
    content = f.read()

content = content.replace('vpn.tu-dominio.lat', 'haproxy-lb')

with open('$TEST_PROFILE', 'w') as f:
    f.write(content)
"

# 4. Spawn a temporary Client Container running OpenVPN
echo "[INFO] Spawning client test container..."
docker rm -f "$CLIENT_NAME" >/dev/null 2>&1 || true

# Run our local hardened image and connect to the cluster
docker run -d --name "$CLIENT_NAME" \
  --network openvpn-hardened_vpn_network \
  --cap-add=NET_ADMIN \
  --device /dev/net/tun:/dev/net/tun \
  -v "$(pwd)/$TEST_PROFILE:/etc/openvpn/client.ovpn:ro" \
  openvpn-hardened:latest /etc/openvpn/client.ovpn

echo "[INFO] Establishing VPN connection (waiting 15s)..."
sleep 15

# 5. Run Validation Checks
echo "[INFO] Running connectivity validation..."

# Check if client container is still running
RUNNING=$(docker inspect -f '{{.State.Running}}' "$CLIENT_NAME" 2>/dev/null || echo "false")
if [ "$RUNNING" != "true" ]; then
    echo "[ERROR] Client container crashed! Printing logs:"
    docker logs "$CLIENT_NAME"
    exit 1
fi

# Check if client got a tun0 interface and received a 10.8.x.x IP address
IP_INFO=$(docker exec "$CLIENT_NAME" ip addr show dev tun0 2>/dev/null || echo "")
if [ -z "$IP_INFO" ]; then
    echo "[ERROR] tun0 interface not created on client!"
    echo "=== Client logs ==="
    docker logs "$CLIENT_NAME"
    echo "=== HAProxy logs ==="
    docker logs haproxy-lb 2>/dev/null || true
    echo "=== Node 1 logs ==="
    docker logs openvpn-node1 2>/dev/null || true
    echo "=== Node 2 logs ==="
    docker logs openvpn-node2 2>/dev/null || true
    echo "=== Node 3 logs ==="
    docker logs openvpn-node3 2>/dev/null || true
    exit 1
fi

CLIENT_IP=$(echo "$IP_INFO" | grep -oE "inet 10\.8\.[0-9]+\.[0-9]+")
if [ -z "$CLIENT_IP" ]; then
    echo "[ERROR] Client tun0 did not receive a 10.8.x.x IP address!"
    echo "IP Info: $IP_INFO"
    exit 1
else
    echo "[SUCCESS] Client successfully connected and received IP: $CLIENT_IP"
fi

# Verify two-way data tunnel traffic by pinging the VPN gateway
# Since sticky sessions pin the client to one node, we check ping to Node 1 (10.8.1.1), Node 2 (10.8.2.1), or Node 3 (10.8.3.1)
echo "[INFO] Testing routing and pinging gateway..."
if docker exec "$CLIENT_NAME" ping -c 3 10.8.1.1 >/dev/null 2>&1; then
    echo "[SUCCESS] Client successfully pinged Node 1 gateway (10.8.1.1)"
elif docker exec "$CLIENT_NAME" ping -c 3 10.8.2.1 >/dev/null 2>&1; then
    echo "[SUCCESS] Client successfully pinged Node 2 gateway (10.8.2.1)"
elif docker exec "$CLIENT_NAME" ping -c 3 10.8.3.1 >/dev/null 2>&1; then
    echo "[SUCCESS] Client successfully pinged Node 3 gateway (10.8.3.1)"
else
    echo "[ERROR] Client failed to ping Node 1 (10.8.1.1), Node 2 (10.8.2.1), and Node 3 (10.8.3.1) gateways!"
    exit 1
fi

# Clean up
echo "[INFO] Cleaning up test containers..."
docker rm -f "$CLIENT_NAME" >/dev/null 2>&1 || true
docker compose down >/dev/null 2>&1 || true
rm -f "$TEST_PROFILE"

echo "=== [PASSED] Integration tests completed successfully! ==="
exit 0
