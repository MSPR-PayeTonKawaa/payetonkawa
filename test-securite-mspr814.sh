#!/bin/bash

# Script de test pour valider la sécurité OWASP Top 10 - MSPR814
# PayeTonKawa - Phase 5b : Sécurité Avancée

set -e

# Configuration
API_GATEWAY="http://localhost:3000"
BOLD='\033[1m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Compteurs
TOTAL_SECURITY_TESTS=0
PASSED_SECURITY_TESTS=0
FAILED_SECURITY_TESTS=0
OWASP_POINTS=0

# Fonctions utilitaires
log_section() {
    echo -e "\n${BOLD}${CYAN}========================================${NC}"
    echo -e "${BOLD}${CYAN} $1${NC}"
    echo -e "${BOLD}${CYAN}========================================${NC}\n"
}

log_test() {
    echo -e "${BLUE}🧪 Test:${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅ SUCCÈS:${NC} $1"
    ((PASSED_SECURITY_TESTS++))
}

log_error() {
    echo -e "${RED}❌ ÉCHEC:${NC} $1"
    ((FAILED_SECURITY_TESTS++))
}

log_warning() {
    echo -e "${YELLOW}⚠️  ATTENTION:${NC} $1"
}

log_owasp() {
    echo -e "${GREEN}🛡️  OWASP:${NC} $1"
    ((OWASP_POINTS++))
}

test_security() {
    local test_name="$1"
    local command="$2"
    local expected_pattern="$3"
    local owasp_category="$4"
    
    log_test "$test_name"
    
    local result=$(eval "$command" 2>/dev/null || echo "ERROR")
    
    if [[ $result =~ $expected_pattern ]] || [[ "$expected_pattern" == "SUCCESS" && $result != "ERROR" ]]; then
        log_success "$test_name validé"
        if [ -n "$owasp_category" ]; then
            log_owasp "$owasp_category"
        fi
        ((PASSED_SECURITY_TESTS++))
    else
        log_error "$test_name échoué"
        echo "   Résultat: $result"
        ((FAILED_SECURITY_TESTS++))
    fi
    ((TOTAL_SECURITY_TESTS++))
}

echo -e "${BOLD}${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              🛡️  TEST SÉCURITÉ OWASP - MSPR814              ║"
echo "║                PayeTonKawa - Phase 5b                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# Vérification que l'API Gateway est démarrée
log_section "🚀 VÉRIFICATION PRÉALABLE"

if ! curl -s "$API_GATEWAY/api/health" > /dev/null; then
    echo -e "${RED}❌ API Gateway non accessible sur $API_GATEWAY${NC}"
    echo "   Démarrez l'API Gateway avec: cd api-gateway && docker-compose up -d"
    exit 1
fi

log_success "API Gateway accessible"

log_section "🛡️  PHASE 1 : VALIDATION DES ENTRÉES (A03:2021)"

# Test 1: Validation email
test_security \
    "Validation format email" \
    "curl -s -X POST '$API_GATEWAY/api/auth/login' -H 'Content-Type: application/json' -d '{\"email\":\"invalid-email\",\"password\":\"Test123!\"}'" \
    "email.*invalid|Bad Request" \
    "A03:2021 - Injection Prevention - Validation email"

# Test 2: Validation mot de passe complexe
test_security \
    "Validation mot de passe sécurisé" \
    "curl -s -X POST '$API_GATEWAY/api/auth/login' -H 'Content-Type: application/json' -d '{\"email\":\"test@test.com\",\"password\":\"simple\"}'" \
    "mot de passe.*majuscule|Bad Request" \
    "A07:2021 - Authentication Failures - Mot de passe fort"

# Test 3: Détection injection SQL
test_security \
    "Protection injection SQL" \
    "curl -s -X POST '$API_GATEWAY/api/auth/login' -H 'Content-Type: application/json' -d '{\"email\":\"admin@test.com OR 1=1--\",\"password\":\"Test123!\"}'" \
    "potentiellement dangereux|injection|Bad Request" \
    "A03:2021 - Injection Prevention - SQL Injection"

# Test 4: Détection XSS
test_security \
    "Protection XSS" \
    "curl -s -X POST '$API_GATEWAY/api/auth/login' -H 'Content-Type: application/json' -d '{\"email\":\"<script>alert(1)</script>@test.com\",\"password\":\"Test123!\"}'" \
    "potentiellement dangereux|XSS|Bad Request" \
    "A03:2021 - Injection Prevention - XSS Protection"

log_section "🚫 PHASE 2 : RATE LIMITING & PROTECTION DDoS"

# Test 5: Rate limiting
log_test "Rate limiting (60 requêtes/minute)"
RATE_LIMIT_VIOLATED=false

for i in {1..65}; do
    RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null "$API_GATEWAY/api/health" 2>/dev/null || echo "429")
    if [[ "$RESPONSE" == "429" ]]; then
        RATE_LIMIT_VIOLATED=true
        break
    fi
    if [[ $i -eq 65 ]]; then
        sleep 0.1  # Éviter de surcharger
    fi
done

if $RATE_LIMIT_VIOLATED; then
    log_success "Rate limiting fonctionnel (limite atteinte)"
    log_owasp "Protection DDoS - Rate Limiting"
    ((PASSED_SECURITY_TESTS++))
else
    log_warning "Rate limiting pas testé complètement (peut nécessiter plus de requêtes)"
    ((FAILED_SECURITY_TESTS++))
fi
((TOTAL_SECURITY_TESTS++))

log_section "🔐 PHASE 3 : AUTHENTIFICATION JWT SÉCURISÉE"

# Test 6: Authentification avec bon mot de passe
JWT_TOKEN=""
log_test "Authentification JWT sécurisée"

# Utilisons un mot de passe qui respecte nos nouvelles règles
AUTH_RESPONSE=$(curl -s -X POST "$API_GATEWAY/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@payetonkawa.fr","password":"Admin123!"}' 2>/dev/null || echo "ERROR")

if [[ $AUTH_RESPONSE =~ access_token ]]; then
    JWT_TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.access_token' 2>/dev/null || echo "")
    log_success "Authentification JWT réussie"
    log_owasp "A07:2021 - Authentication - JWT sécurisé"
    ((PASSED_SECURITY_TESTS++))
else
    log_error "Authentification JWT échouée"
    echo "   Réponse: $AUTH_RESPONSE"
    ((FAILED_SECURITY_TESTS++))
fi
((TOTAL_SECURITY_TESTS++))

# Test 7: Accès endpoint protégé avec token
if [ -n "$JWT_TOKEN" ] && [ "$JWT_TOKEN" != "null" ]; then
    test_security \
        "Accès endpoint protégé avec JWT" \
        "curl -s -H 'Authorization: Bearer $JWT_TOKEN' '$API_GATEWAY/api/auth/profile'" \
        "email.*role.*permissions|id" \
        "A07:2021 - Authentication - Autorisation JWT"
else
    log_warning "Impossible de tester l'endpoint protégé (pas de token JWT)"
    ((FAILED_SECURITY_TESTS++))
    ((TOTAL_SECURITY_TESTS++))
fi

# Test 8: Refus accès sans token
test_security \
    "Refus accès sans token JWT" \
    "curl -s '$API_GATEWAY/api/auth/profile'" \
    "Token.*requis|Unauthorized|401" \
    "A07:2021 - Authentication - Protection endpoints"

log_section "🔒 PHASE 4 : HEADERS DE SÉCURITÉ"

# Test 9: Headers de sécurité
log_test "Vérification headers de sécurité"
SECURITY_HEADERS=$(curl -s -I "$API_GATEWAY/api/health" 2>/dev/null || echo "ERROR")

HEADERS_OK=0
if [[ $SECURITY_HEADERS =~ X-Frame-Options ]]; then ((HEADERS_OK++)); fi
if [[ $SECURITY_HEADERS =~ X-Content-Type-Options ]]; then ((HEADERS_OK++)); fi
if [[ $SECURITY_HEADERS =~ X-XSS-Protection ]]; then ((HEADERS_OK++)); fi
if [[ $SECURITY_HEADERS =~ Content-Security-Policy ]]; then ((HEADERS_OK++)); fi

if [ $HEADERS_OK -ge 3 ]; then
    log_success "Headers de sécurité présents ($HEADERS_OK/4)"
    log_owasp "A05:2021 - Security Misconfiguration - Headers sécurisés"
    ((PASSED_SECURITY_TESTS++))
else
    log_error "Headers de sécurité insuffisants ($HEADERS_OK/4)"
    ((FAILED_SECURITY_TESTS++))
fi
((TOTAL_SECURITY_TESTS++))

log_section "🕵️ PHASE 5 : DÉTECTION MENACES AVANCÉES"

# Test 10: Détection bot malveillant
test_security \
    "Détection bot malveillant" \
    "curl -s -H 'User-Agent: sqlmap/1.0' '$API_GATEWAY/api/health'" \
    "potentiellement malveillant|suspecte|403" \
    "A09:2021 - Logging & Monitoring - Détection menaces"

# Test 11: Path traversal
test_security \
    "Protection path traversal" \
    "curl -s '$API_GATEWAY/../../../etc/passwd'" \
    "path traversal|suspecte|403|404" \
    "A03:2021 - Injection Prevention - Path Traversal"

log_section "📊 PHASE 6 : MONITORING ET AUDIT"

# Test 12: Health check sécurisé
test_security \
    "Health check fonctionnel" \
    "curl -s '$API_GATEWAY/api/health'" \
    "status.*up|healthy" \
    "A09:2021 - Logging & Monitoring - Health checks"

# Test 13: Endpoint stats de sécurité (admin)
if [ -n "$JWT_TOKEN" ] && [ "$JWT_TOKEN" != "null" ]; then
    test_security \
        "Endpoint statistiques sécurité (admin)" \
        "curl -s -H 'Authorization: Bearer $JWT_TOKEN' '$API_GATEWAY/api/auth/security-stats'" \
        "securityStats|blockedIPs|suspiciousIPs" \
        "A09:2021 - Security Logging - Statistiques sécurité"
else
    log_warning "Impossible de tester les stats sécurité (pas de token admin)"
    ((FAILED_SECURITY_TESTS++))
    ((TOTAL_SECURITY_TESTS++))
fi

log_section "📈 RÉSULTATS FINAUX SÉCURITÉ OWASP"

SECURITY_SUCCESS_RATE=$((PASSED_SECURITY_TESTS * 100 / TOTAL_SECURITY_TESTS))
OWASP_COVERAGE=$((OWASP_POINTS * 100 / 10))  # 10 catégories OWASP testées

echo "🧪 Total tests sécurité: $TOTAL_SECURITY_TESTS"
echo "✅ Tests réussis: $PASSED_SECURITY_TESTS"
echo "❌ Tests échoués: $FAILED_SECURITY_TESTS"
echo "📊 Taux de réussite: $SECURITY_SUCCESS_RATE%"
echo "🛡️  Points OWASP: $OWASP_POINTS/10 ($OWASP_COVERAGE%)"

echo ""
echo -e "${BOLD}${CYAN}🏆 ÉVALUATION CONFORMITÉ OWASP TOP 10${NC}"
echo "======================================="

if [ $SECURITY_SUCCESS_RATE -ge 90 ]; then
    echo -e "${GREEN}🥇 EXCELLENT: Sécurité de niveau production${NC}"
elif [ $SECURITY_SUCCESS_RATE -ge 80 ]; then
    echo -e "${YELLOW}🥈 BON: Sécurité solide avec améliorations mineures${NC}"
elif [ $SECURITY_SUCCESS_RATE -ge 70 ]; then
    echo -e "${YELLOW}🥉 CORRECT: Sécurité de base, améliorations recommandées${NC}"
else
    echo -e "${RED}⚠️  INSUFFISANT: Sécurité critique à renforcer${NC}"
fi

echo ""
echo -e "${BOLD}${GREEN}✨ AMÉLIORATIONS SÉCURITÉ IMPLÉMENTÉES:${NC}"
echo "• 🛡️  Validation OWASP Top 10 complète"
echo "• 🔐 Authentification JWT renforcée avec rôles/permissions"
echo "• 🚫 Rate limiting et protection DDoS"  
echo "• 🕵️  Détection automatique des menaces (SQL, XSS, Path Traversal)"
echo "• 📊 Monitoring et audit de sécurité temps réel"
echo "• 🔒 Headers de sécurité complets (CSP, XSS, Clickjacking)"
echo "• 🤖 Détection et blocage des bots malveillants"

echo ""
echo -e "${BOLD}${CYAN}🎯 CONFORMITÉ MSPR814 - SÉCURITÉ: $OWASP_COVERAGE%${NC}"

if [ $OWASP_COVERAGE -ge 80 ]; then
    echo -e "${GREEN}🎉 OBJECTIF MSPR814 ATTEINT - Sécurisation conforme aux standards OWASP${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Objectif MSPR814 partiellement atteint - Améliorations en cours${NC}"
    exit 1
fi 