'use strict';

let _ = require('highland');
let vamp = require('vamp-node-client');

let api = new vamp.Api();
let http = new vamp.Http();
let logger = new vamp.Log();

api.config().each(function (config) {
  let mesos = config['vamp.container-driver.mesos.url'];
  let marathon = config['vamp.container-driver.marathon.url'];
  let zookeeper = config['vamp.persistence.key-value-store.zookeeper.servers'];
  let elasticsearch = config['vamp.pulse.elasticsearch.url'];

  _(http.get(mesos + '/master/slaves').then(JSON.parse)).each(function (response) {

    let instances = response.slaves.length;

    let vga = {
      "id": "/vamp/vamp-gateway-agent",
      "env": {
        "VAMP_KEY_VALUE_STORE_TYPE": "zookeeper",
        "VAMP_KEY_VALUE_STORE_CONNECTION": zookeeper,
        "VAMP_KEY_VALUE_STORE_PATH": "/vamp/gateways/haproxy/1.7/configuration",
        "VAMP_ELASTICSEARCH_URL": elasticsearch
      },
      "cpus": 0.2,
      "mem": 256.0,
      "instances": instances,
      "acceptedResourceRoles": [
        "slave_public",
        "*"
      ],
      "container": {
        "type": "DOCKER",
        "docker": {
          "image": "magneticio/vamp-gateway-agent:katana",
          "network": "HOST",
          "portMappings": [],
          "privileged": true,
          "parameters": []
        }
      },
      "constraints": [
        ["hostname", "UNIQUE"]
      ],
      "healthChecks": [
        {
          "path": "/health",
          "protocol": "HTTP",
          "port": 1988,
          "gracePeriodSeconds": 30,
          "intervalSeconds": 10,
          "timeoutSeconds": 5,
          "maxConsecutiveFailures": 3
        }
      ],
      "labels": {}
    };

    logger.log('checking if deployed: /vamp/vamp-gateway-agent');

    _(http.get(marathon + '/v2/apps/vamp/vamp-gateway-agent').then(JSON.parse).catch(function () {
      return null;
    })).each(function (app) {

      if (app) {
        logger.log('already deployed, checking number of instances...');
        logger.log('deployed instances: ' + app.app.instances);
        logger.log('expected instances: ' + instances);

        if (app.app.instances == instances) {
          logger.log('done.');
          return;
        }
      }

      logger.log('deploying...');

      http.request(marathon + '/v2/apps', {method: 'POST'}, JSON.stringify(vga)).then(function () {
        logger.log('done.');
      }).catch(function (response) {
        logger.log('error - ' + response.statusCode);
        return null;
      })
    });
  });
});
