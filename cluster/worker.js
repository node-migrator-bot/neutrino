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
module.exports = Worker;

var util = require('util'),
    events = require('events');

util.inherits(Worker, events.EventEmitter);

/**
 * Create new instance of worker node.
 * @param {neutrino.core.Config} config Neutrino config object.
 * @constructor
 */
function Worker(config) {

    var self = this,
        workerConfig = config.$('worker') || {};

    events.EventEmitter.call(self);

    self.id = util.format('%d:%d:%d', process.pid, new Date().getTime(), Math.random());
    self.host_ = workerConfig.host || self.host_;
    self.port_ = workerConfig.port_ || self.port_;
    self.loadSendInterval_ = workerConfig.loadSendInterval || self.loadSendInterval_;

    self.logicSet_ = new neutrino.core.LogicSet(config, self);
    self.eventBusClient_ = new neutrino.cluster.EventBusClient(config);

    self.eventBusClient_.on('serviceMessage', function (messageObject) {
        neutrino.logger.trace(util.format('Connection: %s. %s', messageObject.connection, messageObject.message));
    });

    self.eventBusClient_.on('workerMessage', function (messageObject) {
        self.messageHandler_(messageObject);
    });

    self.loadEstimationUpdateInterval_ = setInterval(function () {
        self.loadEstimationUpdate_();
    }, self.loadSendInterval_);
}

/**
 * Current worker ID.
 * @type {String}
 */
Worker.prototype.id = '';

//noinspection JSUnusedGlobalSymbols
/**
 * Load update sending interval handler.
 * @type {Number}
 */
Worker.prototype.loadEstimationUpdateInterval_ = null;

/**
 * Current logic set of worker.
 * @type {neutrino.core.LogicSet}
 * @private
 */
Worker.prototype.logicSet_ = null;

/**
 * EBC instance.
 * @type {neutrino.cluster.EventBusClient}
 * @private
 */
Worker.prototype.eventBusClient_ = null;

/**
 * Interval for load estimation sending.
 * @type {Number}
 */
Worker.prototype.loadSendInterval_ = neutrino.defaults.worker.loadSendInterval;

/**
 * Current worker node load estimation.
 * @type {Number}
 */
Worker.prototype.loadEstimation_ = 0;

/**
 * Current worker node host name.
 * @type {String}
 * @private
 */
Worker.prototype.host_ = neutrino.defaults.worker.host;

/**
 * Current worker node port.
 * @type {Number}
 * @private
 */
Worker.prototype.port_ = neutrino.defaults.worker.port;

/**
 * Send load estimation to master.
 * @private
 */
Worker.prototype.loadEstimationUpdate_ = function () {

    var self = this;

    self.eventBusClient_.sendToMaster({
        type:'load',
        value:self.loadEstimation_
    });
};

/**
 * Start new worker node.
 */
Worker.prototype.start = function () {
    var self = this;
    self.eventBusClient_.connect();

    self.eventBusClient_.sendToMaster({
        type:'address',
        value:util.format('%s:%d', self.host_, self.port_)
    });

};

/**
 * Handle all incoming messages.
 * @param {Object} messageObject Incoming message object.
 */
Worker.prototype.messageHandler_ = function (messageObject) {

    var self = this;

    if (!messageObject || !messageObject.type) {
        return;
    }

    if (messageObject.sender && messageObject.sender === self.id) {
        return;
    }

    if (messageObject.type !== 'sync' && messageObject.type !== 'data') {
        return;
    }

    self.emit(messageObject.type, messageObject.value);
};

/**
 * Send synchronization message to master.
 * @param {Object} data Synchronization data.
 */
Worker.prototype.sendSyncMessage = function (data) {

    var self = this;

    self.eventBusClient_.sendToMaster({
        type:'sync',
        sender:self.id,
        value:data
    });
};