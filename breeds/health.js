'use strict';

let _ = require('highland');
let vamp = require('vamp-node-client');

let api = new vamp.Api();
let logger = new vamp.Log();
let metrics = new vamp.ElasticsearchMetrics(api);

// Time window in seconds
let window = 30;

// Helper function for multiplying (collecting) multiple health values
let collectHealth = function (x1, x2) {
    return x1 * x2;
};

/**
 * Retrieves the health based on a lookupName and publish the data with the specified tags
 */
function health(lookupName, tags, serviceHealth = 1) {
    let errorCode = 500;
    let term = {ft: lookupName};
    let range = {ST: {gte: errorCode}};

    return metrics.count(term, range, window).map(function (total) {
        return total > 0 ? 0 : 1;
    }).tap(function (health) {
        publish(tags, health * serviceHealth);
    });
}

/**
 * Predicate to check whether the underlying container scheduler is reporting ServiceHealth
 */
function healthChecksDefined(serviceHealth) {
    return serviceHealth.healthy + serviceHealth.unhealthy != serviceHealth.running;
}

/**
 * Calculates the average health of the underlying container scheduler if the serviceHealth is defined
 */
function healthOfHealthChecks(serviceHealth) {
    return serviceHealth == null ? 1 : (healthChecksDefined(serviceHealth) ? 1 : (serviceHealth.running / serviceHealth.healthy));
}

/**
 * Publishes the health to the VAMP api based on an array of tags
 */
function publish(tags, health) {
    logger.log('health: [' + JSON.stringify(tags) + '] - ' + health);
    api.event(tags, health, 'health');
}

/**
 * Retrieves the health and publishes the health for each gateway and associated route
 */
api.gateways().flatMap(function (gateway) {
    // gateway health
    return health(gateway.lookup_name, ['gateways:' + gateway.name, 'gateway', 'health']).flatMap(function () {
        return api.namify(gateway.routes).flatMap(function (route) {
            // route health
            return health(route.lookup_name, ['gateways:' + gateway.name, 'route', 'routes:' + route.name, 'health']);
        });
    });
}).done(function () {
});

/**
 * Retrieves and publish the health of each individual service and complete cluster
 */
api.deployments().each(function (deployment) {
    api.namify(deployment.clusters).flatMap(function (cluster) {
        return api.namify(cluster.gateways).flatMap(function (gateway) {
            return _(cluster.services).flatMap(function (service) {
                return api.namify(gateway.routes).find(function (route) {
                    return route.name === service.breed.name;
                }).flatMap(function (route) {
                    // service health based on corresponding route health * configured health checks
                    return health(
                        route.lookup_name, [
                            'deployments:' + deployment.name,
                            'clusters:' + cluster.name,
                            'service', 'services:' + service.breed.name,
                            'health'],
                        healthOfHealthChecks(service.healthChecks));
                });
            });
        }).reduce1(collectHealth).tap(function (health) {
            // cluster health
            publish(['deployments:' + deployment.name, 'clusters:' + cluster.name, 'cluster', 'health'], health);
        });
    }).reduce1(collectHealth).tap(function (health) {
        // deployment health
        publish(['deployments:' + deployment.name, 'deployment', 'health'], health);
    }).done(function () {
    });
});
