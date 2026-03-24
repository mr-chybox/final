#!/usr/bin/env bash
# =============================================================
# Poricito Bazar — API Test Script (curl)
# =============================================================
# Usage:  bash api-tests.sh
# Requires: curl, jq (optional, for pretty JSON)
# =============================================================

BASE="http://localhost:3000/api"
BOLD="\033[1m"
GREEN="\033[0;32m"
CYAN="\033[0;36m"
RESET="\033[0m"

header() { echo -e "\n${BOLD}${CYAN}══ $1 ══${RESET}"; }
ok()     { echo -e "${GREEN}✓ $1${RESET}"; }

# ─────────────────────────────────────────────────────────────
header "1. Health Check"
curl -s "$BASE/health" | jq .
ok "GET /api/health"

# ─────────────────────────────────────────────────────────────
header "2. Products — Get All"
curl -s "$BASE/products" | jq '{success,count}'
ok "GET /api/products"

header "3. Products — Filter by Category"
curl -s "$BASE/products?category=তেল" | jq '{success,count}'
ok "GET /api/products?category=তেল"

header "4. Products — In-Stock Only"
curl -s "$BASE/products?inStock=true" | jq '{success,count}'
ok "GET /api/products?inStock=true"

header "5. Products — Popular (top 4)"
curl -s "$BASE/products/popular" | jq '{success,count}'
ok "GET /api/products/popular"

header "6. Products — Single Product (id=1)"
curl -s "$BASE/products/1" | jq '.data | {id,name,price}'
ok "GET /api/products/1"

# ─────────────────────────────────────────────────────────────
header "7. Orders — Place an Order (public)"
ORDER_RESPONSE=$(curl -s -X POST "$BASE/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "productId":    1,
    "quantity":     2,
    "customerName": "রহিম উদ্দিন",
    "phone":        "01712345678",
    "address":      "৪৫ মতিঝিল, ঢাকা"
  }')
echo "$ORDER_RESPONSE" | jq '{success, message, "orderRef": .data.orderRef}'
ok "POST /api/orders"

# ─────────────────────────────────────────────────────────────
header "8. Admin — Login"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE/admin/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "changeme_use_a_strong_password"
  }')
echo "$LOGIN_RESPONSE" | jq '{success, message, token: .token[0:40]}'

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
ok "POST /api/admin/login → token extracted"

# ─────────────────────────────────────────────────────────────
header "9. Admin — Who Am I? (protected)"
curl -s "$BASE/admin/me" \
  -H "Authorization: Bearer $TOKEN" | jq .
ok "GET /api/admin/me"

header "10. Admin — Dashboard Stats (protected)"
curl -s "$BASE/admin/dashboard" \
  -H "Authorization: Bearer $TOKEN" | jq .data.orders
ok "GET /api/admin/dashboard"

header "11. Admin — List All Orders (protected)"
curl -s "$BASE/admin/orders?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq '{success, total, page, totalPages}'
ok "GET /api/admin/orders"

header "12. Admin — Update Order Status (protected)"
curl -s -X PATCH "$BASE/admin/orders/1/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status": "confirmed", "adminNote": "ফোনে যোগাযোগ করা হয়েছে।"}' | jq '{success, message}'
ok "PATCH /api/admin/orders/1/status"

# ─────────────────────────────────────────────────────────────
header "13. Protected Route — No Token (should 401)"
curl -s "$BASE/admin/orders" | jq '{success, message}'
ok "GET /api/admin/orders (no token) → 401 expected"

header "14. Protected Route — Bad Token (should 403)"
curl -s "$BASE/admin/orders" \
  -H "Authorization: Bearer this.is.not.valid" | jq '{success, message}'
ok "GET /api/admin/orders (bad token) → 403 expected"

echo -e "\n${GREEN}${BOLD}✅  সমস্ত টেস্ট সম্পন্ন হয়েছে।${RESET}\n"
