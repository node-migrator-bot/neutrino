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

module.exports = EventBusClient;

var net = require('net'),
    util = require('util'),
    path = require('path'),
    tls = require('tls'),
    fs = require('fs'),
    events = require('events');

util.inherits(EventBusClient, events.EventEmitter);

/**
 * Create new instance of neutrino event bus client.
 * @param {neutrino.core.Config} config Neutrino config object.
 * @constructor
 */
function EventBusClient(config) {

    var self = this;
    events.EventEmitter.call(self);

    var eventBusConfig = config.$('eventBus') || {};

    self.charset_ = config.$('charset') || self.charset_;

    self.masterSecret_ = eventBusConfig.masterSecret || self.masterSecret_;
    self.workerSecret_ = eventBusConfig.workerSecret || self.workerSecret_;
    self.serverHost_ = eventBusConfig.serverAddress || self.serverHost_;
    self.serverPort_ = eventBusConfig.serverPort || self.serverPort_;
    self.messageQueue_ = [];
    self.serverAddressString_ = util.format('%s:%d',
        self.serverHost_,
        self.serverPort_);

    self.initTlsConfig_();
}

/**
 * Enum of event bus client events.
 * @enum {String}
 */
EventBusClient.events = {
    serviceMessage:'serviceMessage',
    workerConnected:'workerConnected',
    workerDisconnected:'workerDisconnected',
    messageFromMaster:'messageFromMaster'
};

/**
 * Secret token for master of event bus.
 * @type {String}
 * @private
 */
EventBusClient.prototype.masterSecret_ = neutrino.defaults.eventBus.masterSecret;

/**
 * Secret token for worker of event bus.
 * @type {String}
 * @private
 */
EventBusClient.prototype.workerSecret_ = neutrino.defaults.eventBus.workerSecret;

/**
 * TLS configuration object.
 * @type {Object}
 * @private
 */
EventBusClient.prototype.tlsConfig_ = neutrino.defaults.eventBus.tls;

/**
 * Message queue for delayed sending.
 * @type {Array}
 * @private
 */
EventBusClient.prototype.messageQueue_ = null;

/**
 * Current charset.
 * @type {String}
 * @private
 */
EventBusClient.prototype.charset_ = neutrino.defaults.charset;

/**
 * EBS host address.
 * @type {String}
 * @private
 */
EventBusClient.prototype.serverHost_ = neutrino.defaults.eventBus.serverAddress;

/**
 * EBS port.
 * @type {Number}
 * @private
 */
EventBusClient.prototype.serverPort_ = neutrino.defaults.eventBus.serverPort;

/**
 * EBS address and port string.
 * @type {String}
 * @private
 */
EventBusClient.prototype.serverAddressString_ = '';

/**
 * Reconnect interval for connection lost.
 * @type {Number}
 * @private
 */
EventBusClient.prototype.reconnectInterval_ = neutrino.defaults.eventBus.reconnectInterval;

/**
 * Current socket state flag.
 * @type {Boolean}
 * @private
 */
EventBusClient.prototype.isConnected_ = false;

//noinspection JSValidateJSDoc
/**
 * TCP socket object.
 * @type {net.Socket}
 * @private
 */
EventBusClient.prototype.socketNamespace_ = null;

/**
 * Current socket address.
 * @type {Object}
 * @private
 */
EventBusClient.prototype.socketAddress_ = null;

/**
 * Current socket address and port string.
 * @type {String}
 * @private
 */
EventBusClient.prototype.socketAddressString_ = '';

/**
 * Init TLS key files.
 * @private
 */
EventBusClient.prototype.initTlsConfig_ = function () {

    var self = this;

    if (!self.tlsConfig_.enabled) {
        return;
    }

    if (self.tlsConfig_.keyPath) {
        var absoluteKeyPath = path.resolve(self.tlsConfig_.keyPath);
        self.tlsConfig_.key = fs.readFileSync(absoluteKeyPath);
    }

    if (self.tlsConfig_.certPath) {
        var absoluteCertPath = path.resolve(self.tlsConfig_.certPath);
        self.tlsConfig_.cert = fs.readFileSync(absoluteCertPath);
    }

    if (self.tlsConfig_.pfxPath) {
        var absolutePfxPath = path.resolve(self.tlsConfig_.pfxPath);
        self.tlsConfig_.pfx = fs.readFileSync(absolutePfxPath);
    }

    if (self.tlsConfig_.caPaths) {

        self.tlsConfig_.ca = [];
        self.tlsConfig_.caPaths.forEach(function (item) {
            var aboluteCaPath = path.resolve(item);
            ca.push(fs.readFileSync(aboluteCaPath));
        });
    }
};

/**
 * Connect to EBS.
 */
EventBusClient.prototype.connect = function () {

    var self = this;

    if (self.tlsConfig_.enabled) {

        self.socketNamespace_ = tls.connect(self.serverPort_, self.serverHost_, self.tlsConfig_,
            function () {
                self.connectionHandler_();
            });
        self.socketNamespace_.socket.on('close', function () {
            self.closeHandler_();
        });

    } else {

        self.socketNamespace_ = net.connect(self.serverPort_, self.serverHost_,
            function () {
                self.connectionHandler_();
            });
        self.socketNamespace_.on('close', function () {
            self.closeHandler_();
        });

    }

    self.socketNamespace_.setEncoding(self.charset_);

    self.socketNamespace_.on('data', function (data) {
        var items = data.split('\r\n');
        items.forEach(function (item) {
            self.incomingMessageHandler_(item);
        });
    });

};

/**
 * Handle EBS connection.
 * @private
 */
EventBusClient.prototype.connectionHandler_ = function () {

    var self = this;

    self.socketAddress_ = self.socketNamespace_.address();
    self.socketAddressString_ = util.format('%s:%d',
        self.socketAddress_.address,
        self.socketAddress_.port);

    self.isConnected_ = true;

    self.emit(EventBusClient.events.serviceMessage, {
        connection:util.format('%s->%s', self.socketAddressString_, self.serverAddressString_),
        message:self.tlsConfig_.enabled ? 'TLS/SSL connection established' : 'Connection established'
    });

    self.emit(EventBusClient.events.workerConnected);

    var messageToSend = self.messageQueue_;
    self.messageQueue_ = [];

    messageToSend.forEach(function (messageObject) {
        self.sendToMaster(messageObject);
    });
};

/**
 * Handle socket close event.
 * @private
 */
EventBusClient.prototype.closeHandler_ = function () {

    var self = this;

    self.isConnected_ = false;

    setTimeout(function () {
        self.connect();
    }, self.reconnectInterval_);

    self.emit(EventBusClient.events.workerDisconnected);

    self.emit(EventBusClient.events.serviceMessage, {
        connection:util.format('%s->%s', self.socketAddressString_, self.serverAddressString_),
        message:'Connection lost'
    });
};

/**
 * Handle new incoming message from master.
 * @param {String} message Message JSON from master.
 * @private
 */
EventBusClient.prototype.incomingMessageHandler_ = function (message) {

    if (message.length === 0) {
        return;
    }

    var self = this,
        messageObject;

    try {
        messageObject = JSON.parse(message);
        if (!messageObject.secret || messageObject.secret !== self.masterSecret_) {
            //noinspection ExceptionCaughtLocallyJS
            throw new Error('Wrong secret from master');
        }
    } catch (e) {
        self.socketNamespace_.destroy();
        throw e;
    }

    self.emit(EventBusClient.events.messageFromMaster, messageObject);
    self.emit(EventBusClient.events.serviceMessage, {
        connection:util.format('%s->%s', self.serverAddressString_, self.socketAddressString_),
        message:util.format('Master sent message, type - %s', messageObject.type)
    });
};

/**
 * Send message to Master.
 * @param {Object} messageObject Message object for Master.
 */
EventBusClient.prototype.sendToMaster = function (messageObject) {

    var self = this;

    if (!self.isConnected_) {
        self.messageQueue_.push(messageObject);
        return;
    }

    messageObject.secret = self.workerSecret_;

    var message = JSON.stringify(messageObject);

    self.socketNamespace_.write(message + '\r\n');

    self.emit(EventBusClient.events.serviceMessage, {
        connection:util.format('%s->%s', self.socketAddressString_, self.serverAddressString_),
        message:util.format('Worker sent message, type - %s', messageObject.type)
    });
};