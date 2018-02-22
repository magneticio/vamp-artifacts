'use strict';

let type = process.env.VAMP_ELASTICSEARCH_EVENT_TYPE;
if (!type) throw 'no type';

let _ = require('highland');
let vamp = require('vamp-node-client');

let api = new vamp.Api();
let logger = new vamp.Log();
let metrics = new vamp.ElasticsearchMetrics(api);

function publish(deployment, allocation) {
  logger.log('allocation for [' + deployment.name + ']: ' + JSON.stringify(allocation));
  metrics.event([type, 'deployments:' + deployment.name], allocation, type).done(function () {
  });
}

api.deployments().each(function (deployment) {
  let allocation = {cpu: 0, memory: 0, instances: 0};
  for (let name in deployment.clusters) {
    if (deployment.clusters.hasOwnProperty(name)) {
      _(deployment.clusters[name].services).each(function (service) {
        let scale = service.scale;
        allocation.instances += scale.instances;
        allocation.cpu += scale.instances * scale.cpu;
        allocation.memory += scale.instances * parseInt(scale.memory, 10);
      });
    }
  }

  allocation.cpu = Math.round(allocation.cpu * 100) / 100;
  allocation.memory = Math.round(allocation.memory * 100) / 100;
  allocation.instances = Math.round(allocation.instances * 100) / 100;

  publish(deployment, allocation);
});
