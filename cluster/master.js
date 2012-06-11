/* 
 * neutrino
 *
 * Copyright (c) 2012 Denis Rechkunov and project contributors.
 *
 * neutrino's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, 
 * publish, distribute, sublicense, and/or sell copies of the Software, 
 * and to permit persons to whom the Software is furnished to do so, 
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS 
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 * This license applies to all parts of neutrino that are not externally
 * maintained libraries.
 */
module.exports = Master;

var util = require('util'),
    fs = require('fs'),
    path = require('path'),
    url = require('url'),
    http = require('http');

/**
 * Create new instance of cluster master.
 * @param {neutrino.core.Config} config Neutrino config object.
 * @constructor
 */
function Master(config) {

    var self = this,
        masterConfig = config.$('master') || {};

    self.config_ = config;
    self.charset_ = masterConfig.charset || self.charset_;
    self.clientScriptFolder_ = masterConfig.clientScriptFolder || self.clientScriptFolder_;
    self.eventServicesFolder_ = masterConfig.eventServicesFolder || self.eventServicesFolder_;
    self.eventBusServer_ = new neutrino.cluster.EventBusServer(config);
    self.balancer_ = new neutrino.cluster.Balancer();
    self.httpServer_ = http.createServer(function (request, response) {
        self.httpRequestHandler_(request, response);
    });

    self.httpServerPort_ = masterConfig.httpPort || self.httpServerPort_;

    self.workers_ = {};
    self.eventServices_ = {};

    self.eventBusServer_.on('serviceMessage', function (messageObject) {
        neutrino.logger.trace(util.format('Connection: %s. %s', messageObject.connection, messageObject.message));
    });

    self.eventBusServer_.on('masterMessage', function (messageObject, workerId) {
        self.messageHandler_(messageObject, workerId);
    });

    self.eventBusServer_.on('workerConnected', function (workerId) {
        self.balancer_.addWorker(workerId);
        self.workers_[workerId] = {};
    });

    self.eventBusServer_.on('workerDisconnected', function (workerId) {
        self.balancer_.removeWorker(workerId);
        delete self.workers_[workerId];
    });

    self.initEventServices_();
    self.createClientScript_();
}

/**
 * Current config object.
 * @type {neutrino.core.Config}
 * @private
 */
Master.prototype.config_ = null;

/**
 * Current charset.
 * @type {String}
 * @private
 */
Master.prototype.charset_ = neutrino.defaults.charset;

/**
 * EBS server for cluster communication.
 * @type {neutrino.cluster.EventBusServer}
 * @private
 */
Master.prototype.eventBusServer_ = null;

/**
 * Cluster balancer.
 * @type {neutrino.cluster.Balancer}
 * @private
 */
Master.prototype.balancer_ = null;

/**
 * Current worker nodes collection.
 * @type {Object}
 * @private
 */
Master.prototype.workers_ = null;

//noinspection JSValidateJSDoc
/**
 * HTTP server for client application asking for free node.
 * @type {http.Server}
 * @private
 */
Master.prototype.httpServer_ = null;

/**
 * Port of master HTTP server.
 * @type {Number}
 * @private
 */
Master.prototype.httpServerPort_ = neutrino.defaults.master.httpPort;

/**
 * Cached client script.
 * @type {String}
 * @private
 */
Master.prototype.clientScript_ = '';

/**
 * Current client script folder.
 * @type {String}
 * @private
 */
Master.prototype.clientScriptFolder_ = neutrino.defaults.master.clientScriptFolder;

/**
 * Current event services folder.
 * @type {String}
 * @private
 */
Master.prototype.eventServicesFolder_ = neutrino.defaults.master.eventServicesFolder;

/**
 * Current event services hash table.
 * @type {Object}
 * @private
 */
Master.prototype.eventServices_ = null;

/**
 * Start cluster master.
 */
Master.prototype.start = function () {

    var self = this;
    self.eventBusServer_.start();
    self.httpServer_.listen(self.httpServerPort_);
};

/**
 * Get address of free worker node.
 * @return {String}
 */
Master.prototype.getFreeWorker = function () {

    var self = this,
        freeWorkerId = self.balancer_.getWorker();

    return self.workers_[freeWorkerId];
};

/**
 * Handle all cluster messages.
 * @param {Object} messageObject Incoming message object.
 * @param {String} workerId Message sender ID.
 * @private
 */
Master.prototype.messageHandler_ = function (messageObject, workerId) {

    if (!messageObject.type) {
        return;
    }

    var self = this,
        handlerName = util.format('%sHandler_', messageObject.type);

    if (!(handlerName in self)) {
        return;
    }

    self[handlerName](messageObject, workerId);
};

//noinspection JSUnusedGlobalSymbols
/**
 * Handle worker address message.
 * @param {Object} messageObject Incoming message object.
 * @param {String} workerId Message sender ID.
 * @private
 */
Master.prototype.addressHandler_ = function (messageObject, workerId) {

    var self = this;
    self.workers_[workerId] = messageObject.value;

};

//noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols
/**
 * Handle workers sync message.
 * @param {Object} messageObject Incoming message object.
 * @private
 */
Master.prototype.syncHandler_ = function (messageObject) {

    var self = this;
    self.eventBusServer_.sendToWorker(messageObject);

};

//noinspection JSUnusedGlobalSymbols
/**
 * Handle worker load message. Worker sends its load estimation.
 * @param {Object} messageObject Incoming message object.
 * @param {String} workerId Message sender ID.
 * @private
 */
Master.prototype.loadHandler_ = function (messageObject, workerId) {

    var self = this;
    self.balancer_.setWeight(workerId, messageObject.value);

};

/**
 * Handle data messages from models and rout it to event services.
 * @param {Object} messageObject Message from worker.
 * @param {String} workerId Sender worker ID.
 * @private
 */
Master.prototype.dataHandler_ = function (messageObject, workerId) {

    var self = this;

    if (!messageObject.value ||
        !messageObject.value.serviceName ||
        !self.eventServices_[messageObject.value.serviceName]) {
        return;
    }
    var serviceReceiver = self.eventServices_[messageObject.value.serviceName];

    if (!('handleData' in serviceReceiver) || typeof(serviceReceiver.handleData) !== 'function') {
        return;
    }

    serviceReceiver.handleData(messageObject.value.modelName, messageObject.value.data);

};

/**
 * Init all events services of master node.
 * @private
 */
Master.prototype.initEventServices_ = function () {

    var self = this;

    fs.readdir(self.eventServicesFolder_, function (error, files) {

        if (error) {
            throw new Error('Event services folder "' + self.eventServicesFolder_ + '" was not found!');
        }

        files.forEach(function (file) {

            if (path.extname(file) !== '.js') {
                return;
            }

            var servicePath = path.resolve(util.format('%s/%s', self.eventServicesFolder_, file)),
                serviceName = path.basename(file, '.js'),
                Service = require(servicePath),
                service = new Service(self.config_);

            service.on('data', function (modelName, data) {
                self.eventBusServer_.sendToWorker({
                    sender:serviceName,
                    type:'data',
                    value:{modelName:modelName, data:data}
                }, self.balancer_.getWorker());
            });

            self.eventServices_[serviceName] = service;

        });
    });

};

/**
 * Create cached version of client script.
 * @private
 */
Master.prototype.createClientScript_ = function () {

    var self = this;

    fs.readdir(self.clientScriptFolder_, function (error, files) {

        if (error) {
            throw new Error('Client scripts folder "' + self.clientScriptFolder_ + '" was not found!');
        }

        files.forEach(function (file) {

            var path = util.format('%s/%s', self.clientScriptFolder_, file);

            fs.readFile(path, self.charset_, function (error, data) {
                if (error) {
                    throw error;
                }
                self.clientScript_ += data + '\n';
            });
        });
    });

};

/**
 * Handle all HTTP requests
 * @param {Object} request HTTP request.
 * @param {Object} response HTTP response.
 * @private
 */
Master.prototype.httpRequestHandler_ = function (request, response) {

    var self = this,
        now = new Date();

    response.setHeader('Server', 'neutrino');
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Expires', 'Thu, 01 Jan 1970 00:00:01 GMT');
    response.setHeader('Last-Modified', now.toGMTString());
    response.setHeader('Date', now.toGMTString());
    response.setHeader('Cache-Control', 'no-cache, must-revalidate');
    response.setHeader('Pragma', 'no-cache');

    var parsedUrl = url.parse(request.url);
    switch (parsedUrl.pathname) {
        case '/client.js':
            response.writeHead(200, {
                'Content-Type':'application/x-javascript'
            });
            response.end(self.clientScript_);
            return;

        case '/getWorker':
            var workerInfo = self.getFreeWorker() || {},
                json = JSON.stringify(workerInfo);
            response.writeHead(200, {
                'Content-Type':'application/json'
            });
            response.end(json);
            return;

        default:
            response.writeHead(404);
            response.end();
    }

};