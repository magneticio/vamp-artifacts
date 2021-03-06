'use strict';

let _ = require('highland');
let vamp = require('vamp-node-client');

let api = new vamp.Api();
var http = new vamp.Http();

let httpStatus = function (url) {
  return _(http.get(url).catch(function () {
    return false;
  }));
};

let createKibanaIndex = function (elasticsearch, index) {
  return _(http.get(elasticsearch + '/.kibana/config/_search').then(JSON.parse)).flatMap(function (response) {
    let hit;
    let kibana;

    for (let i = 0; i < response.hits.hits.length; i++) {
      hit = response.hits.hits[i];
      if (hit._index === '.kibana') {
        kibana = hit;
        break;
      }
    }

    if (kibana._source.defaultIndex) return _([true]);

    kibana._source['defaultIndex'] = index;

    return _(http.request(elasticsearch + '/' + hit._index + '/' + hit._type + '/' + hit._id, {method: 'POST'}, JSON.stringify(hit._source))).flatMap(function () {
      return _(http.request(elasticsearch + '/.kibana/index-pattern/' + index, {method: 'POST'}, JSON.stringify({
          'title': index,
          'timeFieldName': '@timestamp',
          'fields': '[{"name":"bc","type":"number","count":0,"scripted":false,"indexed":true,"analyzed":false,"doc_values":true},{"name":"B","type":"number","count":0,"scripted":false,"indexed":true,"analyzed":false,"doc_values":true},{"name":"_index","type":"string","count":0,"scripted":false,"indexed":false,"analyzed":false,"doc_values":false},{"name":"tsc","type":"string","count":0,"scripted":false,"indexed":true,"analyzed":true,"doc_values":false},{"name":"hr","type":"string","count":0,"scripted":false,"indexed":true,"analyzed":true,"doc_values":false},{"name":"hs","type":"string","count":0,"scripted":false,"indexed":true,"analyzed":true,"doc_values":false},{"name":"source","type":"string","count":0,"scripted":false,"indexed":true,"analyzed":true,"doc_values":false},{"name":"type","type":"string","count":0,"scripted":false,"indexed":true,"analyzed":true,"doc_values":false},{"name":"ft","type":"string","count":0,"scripted":false,"indexed":true,"analyzed":true,"doc_values":false},{"name":"Tc","type":"number","count":0,"scripted":false,"indexed":true,"analyzed":false,"doc_values":true},{"name":"bq","type":"number","count":0,"scripted":false,"indexed":true,"analyzed":false,"doc_values":true},{"name":"sc","type":"number","count":0,"scripted":false,"indexed":true,"analyzed":false,"doc_values":true},{"name":"Tq","type":"number","count":0,"scripted":false,"indexed":true,"analyzed":false,"doc_values":true},{"name":"beat.version","type":"string","count":0,"scripted":false,"indexed":true,"analyzed":true,"doc_values":false},{"name":"Tr","type":"number","count":0,"scripted":false,"indexed":true,"analyzed":false,"doc_values":true},{"name":"sq","type":"number","count":0,"scripted":false,"indexed":true,"analyzed":false,"doc_values":true},{"name":"CC","type":"string","count":0,"scripted":false,"indexed":true,"analyzed":true,"doc_values":false},{"name":"Tt","type":"number","count":0,"scripted":false,"indexed":true,"analyzed":false,"doc_values":true},{"name":"ST","type":"number","count":0,"scripted":false,"indexed":true,"analyzed":false,"doc_values":true},{"name":"b","type":"string","count":0,"scripted":false,"indexed":true,"analyzed":true,"doc_values":false},{"name":"ac","type":"number","count":0,"scripted":false,"indexed":true,"analyzed":false,"doc_values":true},{"name":"Tw","type":"number","count":0,"scripted":false,"indexed":true,"analyzed":false,"doc_values":true},{"name":"offset","type":"number","count":0,"scripted":false,"indexed":true,"analyzed":false,"doc_values":true},{"name":"ci","type":"string","count":0,"scripted":false,"indexed":true,"analyzed":true,"doc_values":false},{"name":"input_type","type":"string","count":0,"scripted":false,"indexed":true,"analyzed":true,"doc_values":false},{"name":"message","type":"string","count":0,"scripted":false,"indexed":true,"analyzed":true,"doc_values":false},{"name":"cp","type":"number","count":0,"scripted":false,"indexed":true,"analyzed":false,"doc_values":true},{"name":"CS","type":"string","count":0,"scripted":false,"indexed":true,"analyzed":true,"doc_values":false},{"name":"beat.name","type":"string","count":0,"scripted":false,"indexed":true,"analyzed":true,"doc_values":false},{"name":"beat.hostname","type":"string","count":0,"scripted":false,"indexed":true,"analyzed":true,"doc_values":false},{"name":"rc","type":"number","count":0,"scripted":false,"indexed":true,"analyzed":false,"doc_values":true},{"name":"r","type":"string","count":0,"scripted":false,"indexed":true,"analyzed":true,"doc_values":false},{"name":"@timestamp","type":"date","count":0,"scripted":false,"indexed":true,"analyzed":false,"doc_values":true},{"name":"s","type":"string","count":0,"scripted":false,"indexed":true,"analyzed":true,"doc_values":false},{"name":"t","type":"string","count":0,"scripted":false,"indexed":true,"analyzed":true,"doc_values":false},{"name":"_source","type":"_source","count":0,"scripted":false,"indexed":false,"analyzed":false,"doc_values":false},{"name":"fc","type":"number","count":0,"scripted":false,"indexed":true,"analyzed":false,"doc_values":true},{"name":"_id","type":"string","count":0,"scripted":false,"indexed":false,"analyzed":false,"doc_values":false},{"name":"_type","type":"string","count":0,"scripted":false,"indexed":false,"analyzed":false,"doc_values":false},{"name":"_score","type":"number","count":0,"scripted":false,"indexed":false,"analyzed":false,"doc_values":false}]'
        }
      )));
    }).map(function () {
      return false;
    });
  });
};

let updateKibanaGateways = function (elasticsearch) {
  return api.gateways().flatMap(function (gateway) {
    return httpStatus(elasticsearch + '/.kibana/search/' + gateway.lookup_name).flatMap(function (exists) {
      return exists ? _([true]) : _(http.request(elasticsearch + '/.kibana/search/' + gateway.lookup_name, {method: 'POST'},
          JSON.stringify({
            "title": "gateway: " + gateway.name,
            "description": "",
            "hits": 0,
            "columns": [
              "_source"
            ],
            "sort": [
              "@timestamp",
              "desc"
            ],
            "version": 1,
            "kibanaSavedObjectMeta": {
              "searchSourceJSON": '{"index":"${Logstash.index}","highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}},"require_field_match":false,"fragment_size":2147483647},"filter":[],"query":{"query_string":{"query":"type: "haproxy" AND ft: "' + gateway.lookup_name + '","analyze_wildcard":true}}}'
            }
          })
      ));
    }).flatMap(function () {
      return httpStatus(elasticsearch + '/.kibana/visualization/' + gateway.lookup_name + '_tt').flatMap(function (exists) {
        return exists ? _([true]) : _(http.request(elasticsearch + '/.kibana/visualization/' + gateway.lookup_name + '_tt', {method: 'POST'},
          JSON.stringify({
            "title": "total time: " + gateway.name,
            "visState": '{"type":"histogram","params":{"shareYAxis":true,"addTooltip":true,"addLegend":true,"scale":"linear","mode":"stacked","times":[],"addTimeMarker":false,"defaultYExtents":false,"setYExtents":false,"yAxis":{}},"aggs":[{"id":"1","type":"avg","schema":"metric","params":{"field":"Tt"}},{"id":"2","type":"date_histogram","schema":"segment","params":{"field":"@timestamp","interval":"auto","customInterval":"2h","min_doc_count":1,"extended_bounds":{}}}],"listeners":{}}',
            "description": "",
            "savedSearchId": gateway.lookup_name,
            "version": 1,
            "kibanaSavedObjectMeta": {
              "searchSourceJSON": '{"filter":[]}'
            }
          })
        ));
      });
    }).flatMap(function () {
      return httpStatus(elasticsearch + '/.kibana/visualization/' + gateway.lookup_name + '_count').flatMap(function (exists) {
        return exists ? _([true]) : _(http.request(elasticsearch + '/.kibana/visualization/' + gateway.lookup_name + '_count', {method: 'POST'},
           JSON.stringify({
            "title": "request count: " + gateway.name,
            "visState": '{"type":"histogram","params":{"shareYAxis":true,"addTooltip":true,"addLegend":true,"scale":"linear","mode":"stacked","times":[],"addTimeMarker":false,"defaultYExtents":false,"setYExtents":false,"yAxis":{}},"aggs":[{"id":"1","type":"count","schema":"metric","params":{}},{"id":"2","type":"date_histogram","schema":"segment","params":{"field":"@timestamp","interval":"auto","customInterval":"2h","min_doc_count":1,"extended_bounds":{}}}],"listeners":{}}',
            "description": "",
            "savedSearchId": gateway.lookup_name,
            "version": 1,
            "kibanaSavedObjectMeta": {
              "searchSourceJSON": '{"filter":[]}'
            }
          })
        ));
      });
    });
  });
};

api.config().flatMap(function (config) {
  let elasticsearch = config['vamp.pulse.elasticsearch.url'];
  let index = config['vamp.gateway-driver.elasticsearch.metrics.index'];
  return createKibanaIndex(elasticsearch, index).flatMap(function (exists) {
    return exists ? updateKibanaGateways(elasticsearch) : _([true]);
  });
}).each(function () {
});
