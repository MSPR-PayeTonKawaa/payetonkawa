# 🐰 RabbitMQ Message Broker - PayeTonKawa

## 🎯 **Vue d'ensemble**

Service de message broker indépendant pour la communication asynchrone entre les microservices PayeTonKawa.

## 🏗️ **Architecture**

```
📨 RabbitMQ Service (Ports 5672/15672)
├── Exchange: payetonkawa.events (Topic)
├── Exchange: payetonkawa.dlx (Direct - Dead Letter)
├── Exchange: payetonkawa.retry (Direct - Retry)
│
├── Queues Métier:
│   ├── customer.events    (customer.*)
│   ├── product.events     (product.*)
│   ├── order.events       (order.*)
│   └── stock.updates      (stock.*)
│
└── Dead Letter Queues:
    ├── customer.dlq
    ├── product.dlq
    ├── order.dlq
    └── stock.dlq
```

## 🚀 **Démarrage**

### **Prérequis**
- Docker et Docker Compose
- Réseau `payetonkawa-network` créé

### **Lancement**
```bash
cd rabbitmq
docker-compose up -d
```

### **Vérification**
```bash
# Statut du conteneur
docker ps | grep rabbitmq

# Logs
docker logs payetonkawa-rabbitmq

# Health check
docker exec payetonkawa-rabbitmq rabbitmq-diagnostics ping
```

## 🌐 **Accès**

- **AMQP Port** : `localhost:5672`
- **Management UI** : http://localhost:15672
- **Credentials** : `payetonkawa` / `rabbitmq123`
- **VHost** : `/payetonkawa`

## 📨 **Événements Métier**

### **Customer Events**
- `customer.created` : Nouveau client créé
- `customer.updated` : Client modifié
- `customer.deleted` : Client supprimé

### **Product Events**
- `product.created` : Nouveau produit créé
- `product.updated` : Produit modifié
- `product.deleted` : Produit supprimé

### **Order Events**
- `order.created` : Nouvelle commande créée
- `order.confirmed` : Commande confirmée
- `order.shipped` : Commande expédiée
- `order.delivered` : Commande livrée
- `order.cancelled` : Commande annulée

### **Stock Events**
- `stock.updated` : Stock produit modifié
- `stock.low` : Stock faible détecté
- `stock.depleted` : Rupture de stock

## 🔄 **Flux de Communication**

### **Création de commande → Décrément stock**
```
1. Service Commandes publie: order.created
2. Service Produits écoute: order.events
3. Service Produits décrémente le stock automatiquement
4. Service Produits publie: stock.updated
```

### **Mise à jour client → Synchronisation**
```
1. Service Clients publie: customer.updated
2. Service Commandes écoute: customer.events
3. Service Commandes met à jour les données client en cache
```

## ⚙️ **Configuration**

### **Paramètres de performance**
- **TTL Messages** : 1 heure (3600000ms)
- **Max Retries** : 3 tentatives
- **Memory Watermark** : 60%
- **Disk Free Limit** : 2GB

### **Haute disponibilité**
- **Queues durables** : Survie aux redémarrages
- **Dead Letter Queues** : Gestion des erreurs
- **Cluster ready** : Prêt pour le clustering

## 📊 **Monitoring**

### **Management UI**
- Queues et messages en temps réel
- Connexions actives
- Throughput et performance

### **Métriques Prometheus**
- Port 15692 exposé pour Prometheus
- Métriques détaillées disponibles

## 🔧 **Maintenance**

### **Purger les queues**
```bash
docker exec payetonkawa-rabbitmq rabbitmqctl purge_queue customer.events -p /payetonkawa
```

### **Lister les queues**
```bash
docker exec payetonkawa-rabbitmq rabbitmqctl list_queues -p /payetonkawa
```

### **Monitoring des connexions**
```bash
docker exec payetonkawa-rabbitmq rabbitmqctl list_connections
```

## 🚨 **Troubleshooting**

### **Problèmes courants**

1. **Connexion refusée**
   - Vérifier que le conteneur est démarré
   - Vérifier le réseau Docker

2. **Authentification échouée**
   - Vérifier les credentials dans les services
   - Vérifier le VHost `/payetonkawa`

3. **Messages non consommés**
   - Vérifier les bindings
   - Vérifier que les consumers sont actifs

### **Logs détaillés**
```bash
docker logs -f payetonkawa-rabbitmq
```

## 🔐 **Sécurité**

- Utilisateur dédié `payetonkawa`
- VHost isolé `/payetonkawa`
- Pas d'accès guest
- SSL désactivé en développement (à activer en production)

## 📈 **Scalabilité**

- Configuration cluster prête
- Queues distribuées
- Load balancing automatique
- Monitoring intégré 