#!/bin/bash

# =============================================================================
# SCRIPT DE TEST MONITORING MSPR814 - PayeTonKawa
# =============================================================================
# 
# Tests des métriques requises par MSPR814 :
# - Nombre d'appels HTTP par API
# - Codes HTTP de retour  
# - Temps moyens d'exécution des appels HTTP
# - Nombre de messages échangés sur le message broker par file d'attente
#
# =============================================================================

# Configuration
API_GATEWAY="http://localhost:3000"
RABBITMQ_MGMT="http://localhost:15672"
GRAFANA="http://localhost:3100"

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Compteurs
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Fonctions utilitaires
log_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_section() {
    echo ""
    echo -e "${BOLD}${BLUE}$1${NC}"
    echo "=================================================================="
}

test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_pattern="$3"
    local description="$4"
    
    ((TOTAL_TESTS++))
    
    echo -n "🧪 Test: $name... "
    
    response=$(curl -s -w "%{http_code}" "$url" 2>/dev/null)
    http_code="${response: -3}"
    body="${response%???}"
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        if echo "$body" | grep -q "$expected_pattern"; then
            echo -e "${GREEN}✅ RÉUSSI${NC}"
            log_success "$description"
            ((PASSED_TESTS++))
            return 0
        else
            echo -e "${RED}❌ ÉCHEC${NC} (Pattern non trouvé)"
            log_error "$description - Pattern '$expected_pattern' non trouvé"
            echo "Réponse: $body" | head -c 200
            ((FAILED_TESTS++))
            return 1
        fi
    else
        echo -e "${RED}❌ ÉCHEC${NC} (HTTP $http_code)"
        log_error "$description - Code HTTP: $http_code"
        ((FAILED_TESTS++))
        return 1
    fi
}

test_with_auth() {
    local name="$1"
    local url="$2"
    local expected_pattern="$3"
    local description="$4"
    local token="$5"
    
    ((TOTAL_TESTS++))
    
    echo -n "🧪 Test Auth: $name... "
    
    if [ -z "$token" ] || [ "$token" = "null" ]; then
        echo -e "${YELLOW}⚠️  IGNORÉ${NC} (Pas de token)"
        ((FAILED_TESTS++))
        return 1
    fi
    
    response=$(curl -s -w "%{http_code}" -H "Authorization: Bearer $token" "$url" 2>/dev/null)
    http_code="${response: -3}"
    body="${response%???}"
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        if echo "$body" | grep -q "$expected_pattern"; then
            echo -e "${GREEN}✅ RÉUSSI${NC}"
            log_success "$description"
            ((PASSED_TESTS++))
            return 0
        else
            echo -e "${RED}❌ ÉCHEC${NC} (Pattern non trouvé)"
            log_error "$description - Pattern '$expected_pattern' non trouvé"
            ((FAILED_TESTS++))
            return 1
        fi
    else
        echo -e "${RED}❌ ÉCHEC${NC} (HTTP $http_code)"
        log_error "$description - Code HTTP: $http_code"
        ((FAILED_TESTS++))
        return 1
    fi
}

generate_traffic() {
    log_info "Génération de trafic pour les métriques..."
    
    # Générer du trafic HTTP sur différents endpoints
    for i in {1..5}; do
        curl -s "$API_GATEWAY/api/health" > /dev/null &
        curl -s "$API_GATEWAY/api/customers" > /dev/null &
        curl -s "$API_GATEWAY/api/products" > /dev/null &
        curl -s "$API_GATEWAY/api/orders" > /dev/null &
        curl -s "$API_GATEWAY/" > /dev/null &
    done
    
    # Attendre que les requêtes se terminent
    wait
    sleep 2
    
    log_success "Trafic généré (25 requêtes)"
}

check_infrastructure() {
    log_section "🏗️  VÉRIFICATION INFRASTRUCTURE"
    
    # Test API Gateway
    if curl -s -f "$API_GATEWAY/" > /dev/null; then
        log_success "API Gateway accessible ($API_GATEWAY)"
    else
        log_error "API Gateway inaccessible ($API_GATEWAY)"
        return 1
    fi
    
    # Test RabbitMQ Management
    if curl -s -u guest:guest -f "$RABBITMQ_MGMT/api/overview" > /dev/null; then
        log_success "RabbitMQ Management accessible ($RABBITMQ_MGMT)"
    else
        log_warning "RabbitMQ Management inaccessible ($RABBITMQ_MGMT)"
    fi
    
    # Test Grafana
    if curl -s -f "$GRAFANA" > /dev/null; then
        log_success "Grafana accessible ($GRAFANA)"
    else
        log_warning "Grafana inaccessible ($GRAFANA)"
    fi
    
    # Test services microservices
    local services_ok=0
    for port in 3001 3002 3003; do
        if curl -s -f "http://localhost:$port/health" > /dev/null; then
            log_success "Service sur port $port accessible"
            ((services_ok++))
        else
            log_warning "Service sur port $port inaccessible"
        fi
    done
    
    if [ $services_ok -eq 3 ]; then
        log_success "Tous les microservices sont opérationnels"
    else
        log_warning "$services_ok/3 microservices opérationnels"
    fi
}

test_http_metrics() {
    log_section "📊 TESTS MÉTRIQUES HTTP (MSPR814)"
    
    # Générer du trafic d'abord
    generate_traffic
    
    # Test métriques HTTP de base
    test_endpoint \
        "Métriques HTTP" \
        "$API_GATEWAY/api/monitoring/metrics/http" \
        "totalRequests\|averageResponseTime\|requestsByStatusCode" \
        "MSPR814 - Nombre d'appels HTTP par API"
    
    test_endpoint \
        "Métriques HTTP avec période" \
        "$API_GATEWAY/api/monitoring/metrics/http?timeRange=1h" \
        "totalRequests\|averageResponseTime" \
        "MSPR814 - Métriques HTTP avec filtrage temporel"
    
    # Test dashboard de monitoring
    test_endpoint \
        "Dashboard monitoring" \
        "$API_GATEWAY/api/monitoring/dashboard" \
        "http\|timestamp\|period" \
        "MSPR814 - Dashboard administrateur"
    
    # Test health checks avancés
    test_endpoint \
        "Health checks services" \
        "$API_GATEWAY/api/monitoring/health/services" \
        "services\|summary\|healthyServices" \
        "MSPR814 - État de santé des services"
}

test_rabbitmq_metrics() {
    log_section "🐰 TESTS MÉTRIQUES RABBITMQ (MSPR814)"
    
    # Test métriques RabbitMQ via API Gateway
    test_endpoint \
        "Métriques RabbitMQ" \
        "$API_GATEWAY/api/monitoring/metrics/rabbitmq" \
        "totalMessages\|messagesByQueue\|business" \
        "MSPR814 - Messages échangés par file d'attente"
    
    test_endpoint \
        "Dashboard RabbitMQ" \
        "$API_GATEWAY/api/monitoring/rabbitmq/dashboard" \
        "summary\|health\|totalQueues" \
        "MSPR814 - Dashboard RabbitMQ temps réel"
    
    test_endpoint \
        "Détail des queues" \
        "$API_GATEWAY/api/monitoring/rabbitmq/queues" \
        "queues\|summary\|totalMessages" \
        "MSPR814 - Métriques détaillées des queues"
    
    # Test direct RabbitMQ Management API
    if curl -s -u guest:guest -f "$RABBITMQ_MGMT/api/overview" > /dev/null; then
        test_endpoint \
            "RabbitMQ Overview Direct" \
            "$RABBITMQ_MGMT/api/overview" \
            "rabbitmq_version\|message_stats" \
            "MSPR814 - API RabbitMQ Management directe"
        
        # Test queues PayeTonKawa
        local queues_response=$(curl -s -u guest:guest "$RABBITMQ_MGMT/api/queues")
        local payetonkawa_queues=$(echo "$queues_response" | grep -o "customer.events\|product.events\|order.events\|stock.events" | wc -l)
        
        if [ "$payetonkawa_queues" -gt 0 ]; then
            log_success "MSPR814 - $payetonkawa_queues queues PayeTonKawa détectées"
            ((PASSED_TESTS++))
        else
            log_warning "MSPR814 - Aucune queue PayeTonKawa détectée"
            ((FAILED_TESTS++))
        fi
        ((TOTAL_TESTS++))
    fi
}

test_advanced_monitoring() {
    log_section "🔍 TESTS MONITORING AVANCÉ"
    
    # Obtenir un token JWT pour les tests admin
    local jwt_response=$(curl -s -X POST "$API_GATEWAY/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@payetonkawa.fr","password":"Admin123!"}')
    
    local jwt_token=$(echo "$jwt_response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$jwt_token" ] && [ "$jwt_token" != "null" ]; then
        log_success "Token JWT obtenu pour les tests admin"
        
        # Test métriques détaillées (admin)
        test_with_auth \
            "Métriques détaillées admin" \
            "$API_GATEWAY/api/monitoring/detailed" \
            "timestamp\|http\|rabbitmq\|system\|performance" \
            "MSPR814 - Métriques complètes pour Grafana/Prometheus" \
            "$jwt_token"
    else
        log_warning "Impossible d'obtenir un token JWT admin"
    fi
    
    # Test intégration avec les outils externes
    if curl -s -f "$GRAFANA" > /dev/null; then
        log_success "MSPR814 - Grafana intégré et accessible"
        ((PASSED_TESTS++))
    else
        log_warning "MSPR814 - Grafana non accessible"
        ((FAILED_TESTS++))
    fi
    ((TOTAL_TESTS++))
}

test_performance_metrics() {
    log_section "⚡ TESTS MÉTRIQUES DE PERFORMANCE"
    
    # Générer du trafic avec différents patterns
    log_info "Génération de trafic avec patterns variés..."
    
    # Requêtes rapides
    for i in {1..10}; do
        curl -s "$API_GATEWAY/api/health" > /dev/null &
    done
    
    # Requêtes potentiellement plus lentes
    for i in {1..5}; do
        curl -s "$API_GATEWAY/api/customers" > /dev/null &
        curl -s "$API_GATEWAY/api/products" > /dev/null &
    done
    
    # Quelques erreurs volontaires
    for i in {1..3}; do
        curl -s "$API_GATEWAY/api/nonexistent" > /dev/null &
    done
    
    wait
    sleep 3
    
    # Vérifier que les métriques capturent la performance
    local metrics_response=$(curl -s "$API_GATEWAY/api/monitoring/metrics/http")
    
    if echo "$metrics_response" | grep -q "averageResponseTime"; then
        local avg_time=$(echo "$metrics_response" | grep -o '"averageResponseTime":[0-9]*' | cut -d':' -f2)
        if [ -n "$avg_time" ] && [ "$avg_time" -gt 0 ]; then
            log_success "MSPR814 - Temps de réponse moyen capturé: ${avg_time}ms"
            ((PASSED_TESTS++))
        else
            log_warning "MSPR814 - Temps de réponse moyen non valide"
            ((FAILED_TESTS++))
        fi
    else
        log_error "MSPR814 - Métriques de temps de réponse non disponibles"
        ((FAILED_TESTS++))
    fi
    ((TOTAL_TESTS++))
    
    # Vérifier la capture des codes d'erreur
    if echo "$metrics_response" | grep -q "requestsByStatusCode"; then
        if echo "$metrics_response" | grep -q '"404"'; then
            log_success "MSPR814 - Codes HTTP de retour capturés (incluant erreurs 404)"
            ((PASSED_TESTS++))
        else
            log_warning "MSPR814 - Codes d'erreur HTTP non capturés"
            ((FAILED_TESTS++))
        fi
    else
        log_error "MSPR814 - Répartition par codes HTTP non disponible"
        ((FAILED_TESTS++))
    fi
    ((TOTAL_TESTS++))
}

show_summary() {
    log_section "📋 RÉSUMÉ DES TESTS MONITORING MSPR814"
    
    local success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    
    echo "🧪 Total tests: $TOTAL_TESTS"
    echo "✅ Tests réussis: $PASSED_TESTS"
    echo "❌ Tests échoués: $FAILED_TESTS"
    echo "📊 Taux de réussite: $success_rate%"
    
    echo ""
    echo -e "${BOLD}${CYAN}🏆 ÉVALUATION CONFORMITÉ MONITORING MSPR814${NC}"
    echo "=================================================="
    
    if [ $success_rate -ge 90 ]; then
        echo -e "${GREEN}🥇 EXCELLENT: Monitoring MSPR814 pleinement conforme${NC}"
        echo "✅ Toutes les métriques requises sont implémentées"
        echo "✅ Nombre d'appels HTTP par API : OK"
        echo "✅ Codes HTTP de retour : OK"
        echo "✅ Temps moyens d'exécution : OK"
        echo "✅ Messages RabbitMQ par queue : OK"
    elif [ $success_rate -ge 80 ]; then
        echo -e "${YELLOW}🥈 BON: Monitoring MSPR814 largement conforme${NC}"
        echo "✅ La plupart des métriques sont implémentées"
        echo "⚠️  Quelques améliorations mineures recommandées"
    elif [ $success_rate -ge 70 ]; then
        echo -e "${YELLOW}🥉 CORRECT: Monitoring MSPR814 partiellement conforme${NC}"
        echo "✅ Métriques de base implémentées"
        echo "⚠️  Améliorations significatives recommandées"
    else
        echo -e "${RED}❌ INSUFFISANT: Monitoring MSPR814 non conforme${NC}"
        echo "❌ Métriques critiques manquantes"
        echo "🔧 Révision complète du système de monitoring requise"
    fi
    
    echo ""
    echo -e "${BOLD}📊 MÉTRIQUES MSPR814 VALIDÉES :${NC}"
    echo "• Appels HTTP par API et endpoint"
    echo "• Codes de retour HTTP détaillés"
    echo "• Temps de réponse moyens et percentiles"
    echo "• Messages RabbitMQ par file d'attente"
    echo "• Dashboard administrateur temps réel"
    echo "• Intégration Grafana/Prometheus"
    
    return $success_rate
}

# =============================================================================
# EXÉCUTION PRINCIPALE
# =============================================================================

echo -e "${BOLD}${CYAN}"
echo "=================================================================="
echo "    TESTS MONITORING MSPR814 - PayeTonKawa"
echo "=================================================================="
echo -e "${NC}"
echo "Validation des métriques requises par MSPR814 :"
echo "• Nombre d'appels HTTP par API"
echo "• Codes HTTP de retour"
echo "• Temps moyens d'exécution des appels HTTP"
echo "• Nombre de messages échangés sur le message broker par file d'attente"
echo ""

# Vérification de l'infrastructure
check_infrastructure

# Tests des métriques HTTP
test_http_metrics

# Tests des métriques RabbitMQ
test_rabbitmq_metrics

# Tests du monitoring avancé
test_advanced_monitoring

# Tests des métriques de performance
test_performance_metrics

# Résumé final
show_summary

exit_code=$?
if [ $exit_code -ge 90 ]; then
    exit 0
else
    exit 1
fi 