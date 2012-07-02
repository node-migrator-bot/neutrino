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
        workerConfig = config.$('worker') || {},
        sslConfig = workerConfig.ssl || {};

    events.EventEmitter.call(self);

    self.id = util.format('%d:%d:%d', process.pid, new Date().getTime(), Math.random());
    self.host_ = workerConfig.host || self.host_;
    self.port_ = workerConfig.port_ || self.port_;
    self.secure_ = self.secure_ = typeof (sslConfig.enabled) === 'undefined' ? self.secure_ : sslConfig.enabled;
    self.loadSendInterval_ = workerConfig.loadSendInterval || self.loadSendInterval_;

    self.logicSet_ = new neutrino.core.LogicSet(config, self);
    self.eventBusClient_ = new neutrino.cluster.EventBusClient(config);

    var eventBusClientEvents = neutrino.cluster.EventBusClient.events;

    self.eventBusClient_.on(eventBusClientEvents.serviceMessage, function (messageObject) {
        neutrino.logger.trace(util.format('Connection: %s. %s', messageObject.connection, messageObject.message));
    });

    self.eventBusClient_.on(eventBusClientEvents.messageFromMaster, function (messageObject) {
        if (!self.validateMessage_(messageObject)) {
            return;
        }
        self.messageHandler_(messageObject);
    });

    self.eventBusClient_.on(eventBusClientEvents.workerConnected, function () {

        self.addressUpdate_();
        self.loadEstimationUpdate_();

    });

    self.loadEstimationUpdateInterval_ = setInterval(function () {
        self.loadEstimationUpdate_();
    }, self.loadSendInterval_);
}

/**
 * Enum of worker events.
 * @enum {String}
 */
Worker.events = {
    messageForModels:'messageForModels'
};

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
Worker.prototype.loadEstimation = 0;

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
 * Is worker client connection secure.
 * @type {Boolean}
 * @private
 */
Worker.prototype.secure_ = neutrino.defaults.worker.ssl.enabled;

/**
 * Send load estimation to master.
 * @private
 */
Worker.prototype.loadEstimationUpdate_ = function () {

    var self = this;

    self.eventBusClient_.sendToMaster({
        type:neutrino.cluster.messageTypes.load,
        value:self.loadEstimation
    });
};

/**
 * Send load estimation to master.
 * @private
 */
Worker.prototype.addressUpdate_ = function () {

    var self = this;

    self.eventBusClient_.sendToMaster({
        type:neutrino.cluster.messageTypes.address,
        value:{host:self.host_, port:self.port_, secure:self.secure_}
    });

};
/**
 * Set new host and port for incoming client connections.
 * @param {String} host Host address.
 * @param {Number} port Port number.
 */
Worker.prototype.setCurrentAddress = function (host, port) {
    var self = this;
    self.host_ = host;
    self.port_ = port;
    self.addressUpdate_();
};

/**
 * Start new worker node.
 */
Worker.prototype.start = function () {

    var self = this;
    self.eventBusClient_.connect();

};

/**
 * Validate incoming message and return true if it's valid.
 * @param {Object} messageObject Message object.
 * @return {Boolean}
 * @private
 */
Worker.prototype.validateMessage_ = function (messageObject) {

    var self = this;
    return messageObject &&
        messageObject.type &&
        messageObject.sender &&
        messageObject.sender != self.id;
};

/**
 * Handle all incoming messages.
 * @param {Object} messageObject Incoming message object.
 */
Worker.prototype.messageHandler_ = function (messageObject) {

    var self = this;

    self.emit(Worker.events.messageForModels, messageObject.type, messageObject.sender, messageObject.value);
};

/**
 * Send synchronization message to master.
 * @param {String} modelName Sender model name.
 * @param {Object} data Synchronization data.
 */
Worker.prototype.sendSyncMessage = function (modelName, data) {

    var self = this;

    self.eventBusClient_.sendToMaster({
        type:neutrino.cluster.messageTypes.sync,
        sender:self.id,
        value:{modelName:modelName, data:data}
    });
};

/**
 * Send data message to specified event service on master.
 * @param {String} modelName Sender model name.
 * @param {String} serviceName Receiver service name.
 * @param {Object} data Data to send.
 */
Worker.prototype.sendDataMessage = function (modelName, serviceName, data) {

    var self = this;

    self.eventBusClient_.sendToMaster({
        type:neutrino.cluster.messageTypes.data,
        sender:self.id,
        value:{modelName:modelName, serviceName:serviceName, data:data}
    });
};