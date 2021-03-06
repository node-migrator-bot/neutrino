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
module.exports = EventBusServer;

var net = require('net'),
    path = require('path'),
    tls = require('tls'),
    fs = require('fs'),
    events = require('events'),
    util = require('util');

util.inherits(EventBusServer, events.EventEmitter);

/**
 * Create new instance of the Event Bus Server.
 * @param {neutrino.core.Config} config Neutrino config object.
 * @constructor
 */
function EventBusServer(config) {

    var self = this,
        eventBusConfig = config.$('eventBus') || {};

    events.EventEmitter.call(self);

    self.masterSecret_ = eventBusConfig.masterSecret || self.masterSecret_;
    self.workerSecret_ = eventBusConfig.workerSecret || self.workerSecret_;
    self.serverPort_ = eventBusConfig.serverPort || self.serverPort_;
    self.tlsConfig_ = eventBusConfig.tls || self.tlsConfig_;
    self.charset_ = config.$('charset') || self.charset_;

    self.sockets_ = [];
    self.workers_ = {};

    self.initTlsConfig_();

    self.server_ = self.tlsConfig_.enabled ?
        tls.createServer(self.tlsConfig_, function (socket) {
            self.incomingConnectionHandler_(socket);
        }) :
        net.createServer(function (socket) {
            self.incomingConnectionHandler_(socket);
        });

    self.on(EventBusServer.events.messageFromMaster, function (messageObject, workerId) {
        self.processMessageFromMaster_(messageObject, workerId);
    });
}

/**
 * Enum of event bus server events.
 * @enum {String}
 */
EventBusServer.events = {
    serviceMessage:'serviceMessage',
    messageFromMaster:'messageFromMaster',
    messageFromWorker:'messageFromWorker',
    workerConnected:'workerConnected',
    workerDisconnected:'workerDisconnected'
};

/**
 * Secret token for master of event bus.
 * @type {String}
 * @private
 */
EventBusServer.prototype.masterSecret_ = neutrino.defaults.eventBus.masterSecret;

/**
 * Secret token for worker of event bus.
 * @type {String}
 * @private
 */
EventBusServer.prototype.workerSecret_ = neutrino.defaults.eventBus.workerSecret;

/**
 * TLS configuration object.
 * @type {Object}
 * @private
 */
EventBusServer.prototype.tlsConfig_ = neutrino.defaults.eventBus.tls;

/**
 * Port which EBS will listen.
 * @type {number}
 * @private
 */
EventBusServer.prototype.serverPort_ = neutrino.defaults.eventBus.serverPort;

/**
 * Array of connected sockets.
 * @type {Array}
 * @private
 */
EventBusServer.prototype.sockets_ = null;

/**
 * Hash table of workers sockets.
 * @type {Object}
 * @private
 */
EventBusServer.prototype.workers_ = null;

//noinspection JSValidateJSDoc
/**
 * TCP server which EBS use to connect with EBCs;
 * @type {net.Server}
 * @private
 */
EventBusServer.prototype.server_ = null;

/**
 * Charset name.
 * @type {String}
 * @private
 */
EventBusServer.prototype.charset_ = neutrino.defaults.charset;

/**
 * Server address string.
 * @type {String}
 * @private
 */
EventBusServer.prototype.serverAddressString_ = '';

/**
 * Init TLS key files.
 * @private
 */
EventBusServer.prototype.initTlsConfig_ = function () {

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
 * Start to listen for incoming connections.
 */
EventBusServer.prototype.start = function () {

    var self = this;

    self.server_.listen(self.serverPort_, function () {
        var serverAddress = self.server_.address();
        self.serverAddressString_ = util.format('%s:%d', serverAddress.address, serverAddress.port);
        self.emit(EventBusServer.events.serviceMessage, {
            connection:self.serverAddressString_,
            message:self.tlsConfig_.enabled ? 'EBS started with TLS/SSL' : ' EBS started'
        });
    });

};

/**
 * Send event message to all Workers of the cluster.
 * @param {object} messageObject Event message.
 * @param {string} workerId Worker ID (Optional).
 */
EventBusServer.prototype.sendToWorker = function (messageObject, workerId) {

    var self = this;
    self.emit(EventBusServer.events.messageFromMaster, messageObject, workerId);
};

//noinspection JSValidateJSDoc
/**
 * Process incoming connection.
 * @param {net.Socket} socket Incoming connection socket.
 * @private
 */
EventBusServer.prototype.incomingConnectionHandler_ = function (socket) {

    var self = this,
        socketAddress = util.format('%s:%d', socket.remoteAddress, socket.remotePort),
        workerId = self.generateWorkerId_(socket);

    socket.setEncoding(self.charset_);

    socket.on('close', function () {
        self.removeSocket_(socket, workerId);
        self.emit(EventBusServer.events.serviceMessage, {
            connection:util.format('%s->%s', socketAddress, self.serverAddressString_),
            message:'Worker disconnected'
        });
        self.emit(EventBusServer.events.workerDisconnected, workerId);
    });

    socket.on('data', function (data) {
        var items = data.split('\r\n');
        items.forEach(function (item) {
            self.processMessageFromWorker_(socket, item);
        });
    });

    self.sockets_.push(socket);

    self.workers_[workerId] = {socket:socket, isAuthorized:false};

    self.emit(EventBusServer.events.serviceMessage, {
        connection:util.format('%s->%s', socketAddress, self.serverAddressString_),
        message:'Worker connected'
    });
    self.emit(EventBusServer.events.workerConnected, workerId);
};

//noinspection JSValidateJSDoc
/**
 * Process message from worker and send to master.
 * @param {net.Socket} socket Connected socket.
 * @param {String} message JSON message string.
 * @private
 */
EventBusServer.prototype.processMessageFromWorker_ = function (socket, message) {

    if (message.length === 0) {
        return;
    }

    var self = this,
        messageObject,
        workerId = self.generateWorkerId_(socket);

    try {
        messageObject = JSON.parse(message);
        if (!messageObject.secret || messageObject.secret !== self.workerSecret_) {
            //noinspection ExceptionCaughtLocallyJS
            throw new Error('Wrong secret from ' + workerId);
        }
    } catch (e) {
        socket.destroy();
        throw e;
    }
    self.workers_[workerId].isAuthorized = true;
    self.emit(EventBusServer.events.serviceMessage, {
        connection:util.format('%s:%d->%s',
            socket.remoteAddress,
            socket.remotePort,
            self.serverAddressString_),
        message:util.format('Worker sent message, type - %s', messageObject.type)
    });
    self.emit(EventBusServer.events.messageFromWorker, messageObject, workerId);
};

/**
 * Process message from Master and send it to worker(s).
 * @param {Object} messageObject Message object to send.
 * @param {String} workerId Id of worker (optional).
 * @private
 */
EventBusServer.prototype.processMessageFromMaster_ = function (messageObject, workerId) {

    var self = this;

    messageObject.secret = self.masterSecret_;

    var message = JSON.stringify(messageObject);

    if (workerId) {

        if (!(workerId in self.workers_) || !self.workers_[workerId].isAuthorized) {
            return;
        }

        var socket = self.workers_[workerId].socket,
            socketAddress = socket.address();
        socket.write(message + '\r\n');


        self.emit(EventBusServer.events.serviceMessage, {
            connection:util.format('%s->%s:%d',
                self.serverAddressString_,
                socketAddress.address,
                socketAddress.port),
            message:util.format('Master sent message, type - %s', messageObject.type)
        });

    } else {

        var currentWorkerId;
        self.sockets_.forEach(function (socket) {
            currentWorkerId = self.generateWorkerId_(socket);
            if (!self.workers_[currentWorkerId].isAuthorized) {
                return;
            }
            socket.write(message + '\r\n');
        });
        self.emit(EventBusServer.events.serviceMessage, {
            connection:self.serverAddressString_,
            message:util.format('Master sent broadcast message, type - %s', messageObject.type)
        });
    }
};

//noinspection JSValidateJSDoc
/**
 * Generate worker ID by it's socket information.
 * @param {net.Socket} socket Worker socket object.
 * @return {String}
 * @private
 */
EventBusServer.prototype.generateWorkerId_ = function (socket) {

    return util.format('%s:%d', socket.remoteAddress, socket.remotePort);
};

//noinspection JSValidateJSDoc
/**
 * Remove socket from EBS list.
 * @param {net.Socket} socket Connected socket.
 * @param {String} workerId Address of socket was closed.
 * @private
 */
EventBusServer.prototype.removeSocket_ = function (socket, workerId) {

    var self = this,
        socketIndex = self.sockets_.indexOf(socket);

    self.sockets_.splice(socketIndex, 1);
    delete self.workers_[workerId];

};