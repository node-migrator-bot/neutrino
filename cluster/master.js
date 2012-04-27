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
    http = require('http');

/**
 * Create new instance of cluster master.
 * @param {neutrino.core.Config} config Neutrino config object.
 * @constructor
 */
function Master(config) {

    var self = this,
        masterConfig = config.$('master') || {};

    self.eventBusServer_ = new neutrino.cluster.EventBusServer(config);
    self.balancer_ = new neutrino.cluster.Balancer();
    self.httpServer_ = http.createServer(function (request, response) {
        response.end(self.getFreeWorker());
    });

    self.httpServerPort_ = masterConfig.httpPort || self.httpServerPort_;

    self.workers_ = {};

    self.eventBusServer_.on('serviceMessage', function (messageObject) {
        neutrino.logger.trace(util.format('Connection: %s. %s', messageObject.connection, messageObject.message));
    });

    self.eventBusServer_.on('masterMessage', function (messageObject, workerId) {
        self.messageHandler_(messageObject, workerId);
    });

    self.eventBusServer_.on('workerConnected', function (workerId) {
        self.balancer_.addWorker(workerId);
        self.workers_[workerId] = '';
    });

    self.eventBusServer_.on('workerDisconnected', function (workerId) {
        self.balancer_.removeWorker(workerId);
        delete self.workers_[workerId];
    });
}

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

/**
 * Handle workers sync message.
 * @param {Object} messageObject Incoming message object.
 * @param {String} workerId Message sender ID.
 * @private
 */
Master.prototype.syncHandler_ = function (messageObject, workerId) {

    var self = this;
    self.eventBusServer_.sendToWorker(messageObject);

};

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