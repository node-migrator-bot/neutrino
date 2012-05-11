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
module.exports = ViewHub;

var util = require('util'),
    events = require('events'),
    http = require('http'),
    socketio = require('socket.io');

util.inherits(ViewHub, events.EventEmitter);

//noinspection JSUnusedLocalSymbols
/**
 * Create new instance of server view - client view bridge.
 * @param {neutrino.core.Config} config Neutrino config object.
 * @constructor
 */
function ViewHub(config) {

    var self = this,
        workerConfig = config.$('worker') || {};

    events.EventEmitter.call(self);

    self.port_ = workerConfig.port || self.port_;
    var httpServer = http.createServer();

    httpServer.listen(self.port_);

    var io = socketio.listen(httpServer, {
        logger:neutrino.logger
    });

    io.sockets.on('connection', function (socket) {
        self.newConnectionHandler_(socket);
    });
}

/**
 * Current socket.io port of view hub.
 * @type {Number}
 * @private
 */
ViewHub.prototype.port_ = neutrino.defaults.worker.port;

/**
 * Send request response to client.
 * @param {String} viewName Name of view.
 * @param {Object} responseObject Object with response data.
 * @param {String} sessionId User session ID.
 * @param {String} requestId Request ID.
 */
ViewHub.prototype.sendResponse = function (viewName, responseObject, sessionId, requestId) {

    var self = this,
        response = {
            requestId:requestId,
            sessionId:sessionId,
            viewName:viewName,
            response:responseObject
        };
    self.emit('response' + requestId, response);

};

//noinspection JSUnusedLocalSymbols
/**
 * Send new value for client view.
 * @param {String} viewName View title.
 * @param {String} propertyName Changed property name.
 * @param {*} oldValue Old property value.
 * @param {*} newValue New property value.
 * @param {String} sessionId User session ID.
 */
ViewHub.prototype.sendNewValue = function (viewName, propertyName, oldValue, newValue, sessionId) {

    var self = this;
    self.emit('sendNewValue', viewName, propertyName, oldValue, newValue, sessionId);

};

/**
 * Generate request ID.
 * @return {Number}
 * @private
 */
ViewHub.prototype.generateRequestId_ = function () {
    return new Date().getTime() + Math.random();
};

/**
 * Add additional information to request.
 * @param {Object} request Request object.
 * @param {function(Object)} callback Callback with result request.
 * @private
 */
ViewHub.prototype.normalizeRequest_ = function (socket, request, callback) {

    var self = this,
        now = new Date().getTime();

    request.id = self.generateRequestId_();
    if (!socket.sessionIds) {
        socket.sessionIds = {};
    }

    neutrino.sessionManager.set({lastAccess:now}, function (error) {

        if (error) {
            neutrino.sessionManager.create({lastAccess:now}, function (error, sessionId) {
                request.sessionId = sessionId;

                socket.sessionIds[sessionId] = true;

                callback(request);
            });
            return;
        }
        socket.sessionIds[request.sessionId] = true;
        callback(request);

    });

};

//noinspection JSValidateJSDoc
/**
 * Handle new socket connection.
 * @param {socket.io.socket} socket Socket object.
 * @private
 */
ViewHub.prototype.newConnectionHandler_ = function (socket) {

    var self = this,
        sessionId = '',
        socketAddress = {
            address:socket.handshake.address.address,
            port:socket.handshake.address.port
        };

    socket.on('error', function (error) {
        throw error;
    });

    socket.on('disconnect', function () {
        self.disconnectHandler_(socketAddress, sessionId);
    });

    socket.on('getModelRequest', function (request) {
        self.getModelRequestHandler_(socket, request);
    });

    socket.on('invokeMethodRequest', function (request) {
        self.invokeMethodRequestHandler_(request);
    });

    socket.on('editRequest', function (request) {
        self.editRequestHandler_(request);
    });

    socket.on('subscribeRequest', function (request) {
        self.subscribeRequestHandler_(request);
    });

    socket.on('unsubscribeRequest', function (request) {
        self.unsubscribeRequestHandler_(request);
    });

    self.on('sendNewValue', function (viewName, propertyName, oldValue, newValue, sessionId) {
        if (socket.sessionIds.hasOwnProperty(sessionId)) {
            socket.emit('newValue', viewName, propertyName, oldValue, newValue);
        }
    });
};

/**
 * Handle socket disconnect event.
 * @param {String} socketAddress Socket address object.
 * @param {String} sessionId Session ID.
 * @private
 */
ViewHub.prototype.disconnectHandler_ = function (socketAddress, sessionId) {

    var self = this,
        requestId = self.generateRequestId_();

    self.emit('disconnected', socketAddress);
    self.emit('unsubscribe', sessionId, requestId);

};

//noinspection JSValidateJSDoc
/**
 * Basic request handler for all events.
 * @param {socket.io.socket} socket Socket object.
 * @param {Object} request Request object.
 * @param {String} socketEventName Response socket event name.
 * @return {Object}
 */
ViewHub.prototype.basicRequestHandler = function (socket, request, socketEventName, callback) {

    var self = this;

    self.normalizeRequest_(socket, request, function (validRequest) {

        self.on('response' + validRequest.id, function (response) {
            response.request = validRequest;
            socket.emit(socketEventName, response);
            self.removeAllListeners('response' + validRequest.id);
        });
        callback(validRequest);
    });

    return validRequest;
};

//noinspection JSValidateJSDoc
/**
 * Handle all model requests.
 * @param {socket.io.socket} socket Socket object.
 * @param {Object} request Request object.
 * @private
 */
ViewHub.prototype.getModelRequestHandler_ = function (socket, request) {

    var self = this;

    self.basicRequestHandler(socket, request, 'invokeMethodResponse', function (validRequest) {

        self.emit('modelRequest', validRequest.viewName, validRequest.sessionId, validRequest.id);

    });
};

//noinspection JSValidateJSDoc
/**
 * Handle all invoke method requests.
 * @param {socket.io.socket} socket Socket object.
 * @param {Object} request Request object.
 * @private
 */
ViewHub.prototype.invokeMethodRequestHandler_ = function (socket, request) {

    var self = this;

    self.basicRequestHandler(socket, request, 'invokeMethodResponse', function (validRequest) {

        self.emit('invokeRequest', validRequest.viewName, validRequest.methodName,
            validRequest.args, validRequest.sessionId, validRequest.id);

    });

};

//noinspection JSValidateJSDoc
/**
 * Handle all edit requests.
 * @param {socket.io.socket} socket Socket object.
 * @param {Object} request Request object.
 * @private
 */
ViewHub.prototype.editRequestHandler_ = function (socket, request) {

    var self = this;

    self.basicRequestHandler(socket, request, 'invokeMethodResponse', function (validRequest) {

        self.emit('editRequest', validRequest.viewName, validRequest.propertyName,
            validRequest.newValue, validRequest.sessionId, validRequest.id);
    });
};

//noinspection JSValidateJSDoc
/**
 * Handle all subscribe requests.
 * @param {socket.io.socket} socket Socket object.
 * @param {Object} request Request object.
 * @private
 */
ViewHub.prototype.subscribeRequestHandler_ = function (socket, request) {

    var self = this;

    self.basicRequestHandler(socket, request, 'invokeMethodResponse', function (validRequest) {

        self.emit('subscribeRequest', validRequest.sessionId, validRequest.id);
    });
};

//noinspection JSValidateJSDoc
/**
 * Handle all unsubscribe requests.
 * @param {socket.io.socket} socket Socket object.
 * @param {Object} request Request object.
 * @private
 */
ViewHub.prototype.unsubscribeRequestHandler_ = function (socket, request) {

    var self = this;
    self.basicRequestHandler(socket, request, 'invokeMethodResponse', function (validRequest) {

        self.emit('unsubscribeRequest', validRequest.sessionId, validRequest.id);
    });
};
