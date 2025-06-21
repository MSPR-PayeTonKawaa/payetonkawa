#!/bin/bash

# ===========================================
# SCRIPT DE CONFIGURATION RABBITMQ PAYETONKAWA
# ===========================================

set -e

# Configuration
RABBITMQ_HOST="localhost:15672"
RABBITMQ_USER="payetonkawa"
RABBITMQ_PASS="rabbitmq123"
VHOST="/payetonkawa"

echo "🐰 Configuration RabbitMQ PayeTonKawa..."

# Fonction pour attendre que RabbitMQ soit prêt
wait_for_rabbitmq() {
    echo "⏳ Attente de RabbitMQ..."
    until curl -s -u "$RABBITMQ_USER:$RABBITMQ_PASS" "http://$RABBITMQ_HOST/api/overview" > /dev/null 2>&1; do
        echo "   Attente de RabbitMQ..."
        sleep 2
    done
    echo "✅ RabbitMQ est prêt !"
}

# Fonction pour créer un exchange
create_exchange() {
    local name=$1
    local type=$2
    echo "📨 Création de l'exchange: $name ($type)"
    curl -s -u "$RABBITMQ_USER:$RABBITMQ_PASS" \
        -X PUT \
        -H "Content-Type: application/json" \
        -d "{\"type\":\"$type\",\"durable\":true}" \
        "http://$RABBITMQ_HOST/api/exchanges$(echo $VHOST | sed 's|/|%2F|g')/$name" > /dev/null
}

# Fonction pour créer une queue
create_queue() {
    local name=$1
    local dlx=${2:-""}
    local dlx_key=${3:-""}
    echo "📋 Création de la queue: $name"
    
    local args="{\"durable\":true"
    if [[ -n "$dlx" ]]; then
        args="$args,\"arguments\":{\"x-dead-letter-exchange\":\"$dlx\",\"x-dead-letter-routing-key\":\"$dlx_key\",\"x-message-ttl\":3600000}"
    fi
    args="$args}"
    
    curl -s -u "$RABBITMQ_USER:$RABBITMQ_PASS" \
        -X PUT \
        -H "Content-Type: application/json" \
        -d "$args" \
        "http://$RABBITMQ_HOST/api/queues$(echo $VHOST | sed 's|/|%2F|g')/$name" > /dev/null
}

# Fonction pour créer un binding
create_binding() {
    local exchange=$1
    local queue=$2
    local routing_key=$3
    echo "🔗 Binding: $exchange -> $queue ($routing_key)"
    curl -s -u "$RABBITMQ_USER:$RABBITMQ_PASS" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "{\"routing_key\":\"$routing_key\"}" \
        "http://$RABBITMQ_HOST/api/bindings$(echo $VHOST | sed 's|/|%2F|g')/e/$exchange/q/$queue" > /dev/null
}

# Attendre que RabbitMQ soit prêt
wait_for_rabbitmq

# Créer les exchanges
echo "🏗️  Création des exchanges..."
create_exchange "payetonkawa.events" "topic"
create_exchange "payetonkawa.dlx" "direct"
create_exchange "payetonkawa.retry" "direct"

# Créer les Dead Letter Queues d'abord
echo "💀 Création des Dead Letter Queues..."
create_queue "customer.dlq"
create_queue "product.dlq"
create_queue "order.dlq"
create_queue "stock.dlq"

# Créer les queues principales avec DLX
echo "📋 Création des queues principales..."
create_queue "customer.events" "payetonkawa.dlx" "customer.dlq"
create_queue "product.events" "payetonkawa.dlx" "product.dlq"
create_queue "order.events" "payetonkawa.dlx" "order.dlq"
create_queue "stock.updates" "payetonkawa.dlx" "stock.dlq"

# Créer les bindings
echo "🔗 Création des bindings..."
create_binding "payetonkawa.events" "customer.events" "customer.*"
create_binding "payetonkawa.events" "product.events" "product.*"
create_binding "payetonkawa.events" "order.events" "order.*"
create_binding "payetonkawa.events" "stock.updates" "stock.*"

# Bindings pour DLX
create_binding "payetonkawa.dlx" "customer.dlq" "customer.dlq"
create_binding "payetonkawa.dlx" "product.dlq" "product.dlq"
create_binding "payetonkawa.dlx" "order.dlq" "order.dlq"
create_binding "payetonkawa.dlx" "stock.dlq" "stock.dlq"

echo ""
echo "🎉 Configuration RabbitMQ terminée avec succès !"
echo "🌐 Management UI: http://localhost:15672"
echo "🔑 Credentials: $RABBITMQ_USER / $RABBITMQ_PASS"
echo "🏠 VHost: $VHOST"
echo ""
echo "📊 Queues créées:"
echo "   • customer.events (customer.*)"
echo "   • product.events (product.*)"
echo "   • order.events (order.*)"
echo "   • stock.updates (stock.*)"
echo ""
echo "💀 Dead Letter Queues:"
echo "   • customer.dlq, product.dlq, order.dlq, stock.dlq" 