// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
exports = {};
(function () {


    exports.inherits = function (ctor, superCtor) {
        ctor.super_ = superCtor;
        ctor.prototype = Object.create(superCtor.prototype, {
            constructor:{
                value:ctor,
                enumerable:false,
                writable:true,
                configurable:true
            }
        });
    };

    var isArray = Array.isArray;

    function EventEmitter() {
    }

    exports.EventEmitter = EventEmitter;

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
    var defaultMaxListeners = 10;
    EventEmitter.prototype.setMaxListeners = function (n) {
        if (!this._events) this._events = {};
        this._maxListeners = n;
    };


    EventEmitter.prototype.emit = function () {
        var type = arguments[0];
        // If there is no 'error' event listener then throw.
        if (type === 'error') {
            if (!this._events || !this._events.error ||
                (isArray(this._events.error) && !this._events.error.length)) {
                if (arguments[1] instanceof Error) {
                    throw arguments[1]; // Unhandled 'error' event
                } else {
                    throw new Error("Uncaught, unspecified 'error' event.");
                }
                return false;
            }
        }

        if (!this._events) return false;
        var handler = this._events[type];
        if (!handler) return false;

        if (typeof handler == 'function') {
            switch (arguments.length) {
                // fast cases
                case 1:
                    handler.call(this);
                    break;
                case 2:
                    handler.call(this, arguments[1]);
                    break;
                case 3:
                    handler.call(this, arguments[1], arguments[2]);
                    break;
                // slower
                default:
                    var l = arguments.length;
                    var args = new Array(l - 1);
                    for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
                    handler.apply(this, args);
            }
            return true;

        } else if (isArray(handler)) {
            var l = arguments.length;
            var args = new Array(l - 1);
            for (var i = 1; i < l; i++) args[i - 1] = arguments[i];

            var listeners = handler.slice();
            for (var i = 0, l = listeners.length; i < l; i++) {
                listeners[i].apply(this, args);
            }
            return true;

        } else {
            return false;
        }
    };

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
    EventEmitter.prototype.addListener = function (type, listener) {
        if ('function' !== typeof listener) {
            throw new Error('addListener only takes instances of Function');
        }

        if (!this._events) this._events = {};

        // To avoid recursion in the case that type == "newListeners"! Before
        // adding it to the listeners, first emit "newListeners".
        this.emit('newListener', type, listener);

        if (!this._events[type]) {
            // Optimize the case of one listener. Don't need the extra array object.
            this._events[type] = listener;
        } else if (isArray(this._events[type])) {

            // If we've already got an array, just append.
            this._events[type].push(listener);

        } else {
            // Adding the second element, need to change to array.
            this._events[type] = [this._events[type], listener];

        }

        // Check for listener leak
        if (isArray(this._events[type]) && !this._events[type].warned) {
            var m;
            if (this._maxListeners !== undefined) {
                m = this._maxListeners;
            } else {
                m = defaultMaxListeners;
            }

            if (m && m > 0 && this._events[type].length > m) {
                this._events[type].warned = true;
                console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
                console.trace();
            }
        }

        return this;
    };

    EventEmitter.prototype.on = EventEmitter.prototype.addListener;

    EventEmitter.prototype.once = function (type, listener) {
        if ('function' !== typeof listener) {
            throw new Error('.once only takes instances of Function');
        }

        var self = this;

        function g() {
            self.removeListener(type, g);
            listener.apply(this, arguments);
        }

        ;

        g.listener = listener;
        self.on(type, g);

        return this;
    };

    EventEmitter.prototype.removeListener = function (type, listener) {
        if ('function' !== typeof listener) {
            throw new Error('removeListener only takes instances of Function');
        }

        // does not use listeners(), so no side effect of creating _events[type]
        if (!this._events || !this._events[type]) return this;

        var list = this._events[type];

        if (isArray(list)) {
            var position = -1;
            for (var i = 0, length = list.length; i < length; i++) {
                if (list[i] === listener ||
                    (list[i].listener && list[i].listener === listener)) {
                    position = i;
                    break;
                }
            }

            if (position < 0) return this;
            list.splice(position, 1);
            if (list.length == 0)
                delete this._events[type];
        } else if (list === listener ||
            (list.listener && list.listener === listener)) {
            delete this._events[type];
        }

        return this;
    };

    EventEmitter.prototype.removeAllListeners = function (type) {
        if (arguments.length === 0) {
            this._events = {};
            return this;
        }

        // does not use listeners(), so no side effect of creating _events[type]
        if (type && this._events && this._events[type]) this._events[type] = null;
        return this;
    };

    EventEmitter.prototype.listeners = function (type) {
        if (!this._events) this._events = {};
        if (!this._events[type]) this._events[type] = [];
        if (!isArray(this._events[type])) {
            this._events[type] = [this._events[type]];
        }
        return this._events[type];
    };


})();


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
neutrino = {};
neutrino.exports = exports;

(function () {

    neutrino.ViewHubClient = ViewHubClient;

    neutrino.exports.inherits(ViewHubClient, neutrino.exports.EventEmitter);
    /**
     * Create new instance of neutrino view hub client.
     * @param {String} masterUrl URL to master node.
     * @constructor
     */
    function ViewHubClient(masterUrl) {

        var self = this;

        neutrino.exports.EventEmitter.call(self);

        self.setMaxListeners(0);

        self.masterUrl = masterUrl;
        self.ajax_ = new AjaxProvider();
        self.subscriptions_ = {};
        self.cookieProvider_ = new CookieProvider();
        self.on('socketReady', function () {
            self.isSocketReady_ = true;
        });

        self.sessionId = self.cookieProvider_.getCookie('sid');
        self.connect_(masterUrl);

    }

    /**
     * Current AJAX provider.
     * @type {AjaxProvider}
     * @private
     */
    ViewHubClient.prototype.ajax_ = null;

    /**
     * Current master URL.
     * @type {String}
     */
    ViewHubClient.prototype.masterUrl = '';

    /**
     * Is socket ready to send messages.
     * @type {Boolean}
     * @private
     */
    ViewHubClient.prototype.isSocketReady_ = false;

    /**
     * Current instance of event emitter.
     * @type {EventEmitter}
     * @private
     */
    ViewHubClient.prototype.eventEmitter_ = null;

    /**
     * Generate new request ID.
     * @return {Number}
     * @private
     */
    ViewHubClient.prototype.generateRequestId_ = function () {
        return new Date().getTime() + Math.random();
    };

    /**
     * Current cookie provider.
     * @type {neutrino.CookieProvider}
     * @private
     */
    ViewHubClient.prototype.cookieProvider_ = null;

    /**
     * Client subscriptions collection.
     * @type {Object}
     * @private
     */
    ViewHubClient.prototype.subscriptions_ = null;

    /**
     * Current socket instance.
     * @type {Object}
     * @private
     */
    ViewHubClient.prototype.socketNamespace_ = null;

    /**
     * Get worker node address and connect to it.
     * @private
     */
    ViewHubClient.prototype.connect_ = function () {

        var self = this;

        self.ajax_.requestJson(self.masterUrl + '/getWorker', function (error, result) {

            if (error || !result || !result.host || !result.port) {
                setTimeout(function () {
                    self.connect_();
                }, 5000);
                return;
            }

            var workerAddressUrl = 'http://' + result.host + ':' + result.port;

            self.socketNamespace_ = io.connect(workerAddressUrl, {
                resource:"viewhub",
                reconnect:false
            });

            self.socketNamespace_.on('newValue', function (viewName, propertyName, oldValue, newValue) {
                self.newValueHandler_(viewName, propertyName, oldValue, newValue);
            });

            self.socketNamespace_.on('invokeMethodResponse', function (response) {
                self.responseHandler_(response);
            });

            self.socketNamespace_.on('subscribeResponse', function (response) {
                self.responseHandler_(response);
            });

            self.socketNamespace_.on('unsubscribeResponse', function (response) {
                self.responseHandler_(response);
            });

            self.socketNamespace_.on('editResponse', function (response) {
                self.responseHandler_(response);
            });

            self.socketNamespace_.on('getModelResponse', function (response) {
                self.responseHandler_(response);
            });

            self.socketNamespace_.on('connect', function () {
                self.connectHandler_();
                self.emit('connect', result);
            });

            self.socketNamespace_.on('disconnect', function () {
                self.disconnectHandler_();
                self.emit('disconnect');
            });

            self.emit('socketReady');

        });

    };

    /**
     * Invoke method from neutrino view.
     * @param {String} viewName Name of view.
     * @param {String} methodName Name of method.
     * @param {function(Error,*)} callback Result handler.
     * @param {*} [params] Optional arguments.
     */
    ViewHubClient.prototype.invoke = function (viewName, methodName, callback, params) {

        var self = this,
            requestId = self.generateRequestId_(),
            args = Array.prototype.slice.call(arguments, 3),
            execute = function () {

                if (!viewName || !methodName) {
                    callback && callback(new Error('View name and method name must be specified'));
                    return;
                }

                self.once('response' + requestId, function (response) {
                    self.removeAllListeners('response' + requestId);
                    if (!response.success) {
                        callback && callback(new Error('Server declined method invocation'));
                        return;
                    }

                    callback && callback(null, response.result);
                });
                self.socketNamespace_.emit('invokeMethodRequest', {
                    viewName:viewName,
                    methodName:methodName,
                    args:args,
                    sessionId:self.sessionId,
                    id:requestId
                });

            };

        if (self.isSocketReady_) {
            execute();
        } else {
            self.once('socketReady', execute);
        }
    };

    /**
     * Get current model state object.
     * @param {String} viewName Name of view.
     * @param {function(Error, Object)} callback Result handler.
     */
    ViewHubClient.prototype.getModel = function (viewName, callback) {

        var self = this,
            requestId = self.generateRequestId_(),
            execute = function () {

                if (!viewName) {
                    callback && callback(new Error('View name must be specified'));
                    return;
                }

                self.once('response' + requestId, function (response) {
                    self.removeAllListeners('response' + requestId);
                    if (!response.success) {
                        callback && callback(new Error('Server declined model request'));
                        return;
                    }

                    callback && callback(null, response.model);
                });
                self.socketNamespace_.emit('getModelRequest', {
                    viewName:viewName,
                    sessionId:self.sessionId,
                    id:requestId
                });

            };

        if (self.isSocketReady_) {
            execute();
        } else {
            self.once('socketReady', execute);
        }
    };

    /**
     * Set new value of property on server.
     * @param {String} viewName Name of view.
     * @param {String} propertyName Name of property to change value.
     * @param {*} newValue New value of property.
     * @param {function(Error)} callback Result handler.
     */
    ViewHubClient.prototype.setValue = function (viewName, propertyName, newValue, callback) {

        var self = this,
            requestId = self.generateRequestId_(),
            execute = function () {

                if (!viewName || !propertyName) {
                    callback && callback(new Error('View name and property name must be specified'));
                    return;
                }

                self.once('response' + requestId, function (response) {
                    self.removeAllListeners('response' + requestId);
                    if (!response.success) {
                        callback && callback(new Error('Server declined new value of property'));
                        return;
                    }

                    callback && callback(null);
                });
                self.socketNamespace_.emit('editRequest', {
                    viewName:viewName,
                    propertyName:propertyName,
                    newValue:newValue,
                    sessionId:self.sessionId,
                    id:requestId
                });

            };

        if (self.isSocketReady_) {
            execute();
        } else {
            self.once('socketReady', execute);
        }
    };

    /**
     * Subscribe handler to view update.
     * @param {String} viewName Name of view.
     * @param {function(String,*,*)} handler Handler for new value message.
     * @param {function(Error)} callback Subscription result callback (optional).
     */
    ViewHubClient.prototype.subscribe = function (viewName, handler, callback) {

        if (!viewName || !handler) {
            callback && callback(new Error('View name and handler must be specified'));
            return;
        }

        var self = this,
            requestId = self.generateRequestId_(),
            execute = function () {

                self.once('response' + requestId, function (response) {
                    self.removeAllListeners('response' + requestId);
                    if (!response.success) {
                        callback && callback(new Error('Server declined subscription'));
                        return;
                    }

                    if (!self.subscriptions_[viewName]) {
                        self.subscriptions_[viewName] = [];
                    }

                    self.subscriptions_[viewName].push(handler);
                    callback && callback(null);
                });
                self.socketNamespace_.emit('subscribeRequest', {viewName:viewName, sessionId:self.sessionId, id:requestId});

            };

        if (self.isSocketReady_) {
            execute();
        } else {
            self.once('socketReady', execute);
        }

    };

    /**
     * Unsubscribe handler from view update.
     * @param {String} viewName Name of view.
     * @param {function(String,*,*)} handler Handler was subscribed.
     * @param {function(Error)} callback Operation result callback (optional).
     */
    ViewHubClient.prototype.unsubscribe = function (viewName, handler, callback) {

        if (!viewName || !handler) {
            callback && callback(new Error('View name and handler must be specified'));
            return;
        }

        if (!self.subscriptions_[viewName] || self.subscriptions_[viewName].length === 0) {
            callback && callback(new Error('This view has no subscriptions yet'));
            return;
        }

        var self = this,
            requestId = self.generateRequestId_(),
            execute = function () {
                self.once('response' + requestId, function (response) {
                    self.removeAllListeners('response' + requestId);

                    var removeIndex = self.subscriptions_[viewName].indexOf(handler);
                    self.subscriptions_.splice(removeIndex, 1);

                    if (!response.success) {
                        callback && callback(new Error('Server declined unsubscribe message'));
                    } else {
                        callback && callback(null);
                    }

                });
                self.socketNamespace_.emit('unsubscribeRequest', {viewName:viewName, sessionId:self.sessionId, id:requestId});
            };

        if (self.isSocketReady_) {
            execute();
        } else {
            self.once('socketReady', execute);
        }
    };

    /**
     * Close connection and connect to other node.
     */
    ViewHubClient.prototype.disconnectHandler_ = function () {

        var self = this;
        self.isSocketReady_ = false;
        self.socketNamespace_.removeAllListeners();
        self.connect_();

    };

    /**
     * Resubscribe all client subscriptions.
     * @private
     */
    ViewHubClient.prototype.connectHandler_ = function () {

        var self = this;

        for (var viewName in self.subscriptions_) {
            if (!self.subscriptions_.hasOwnProperty(viewName)) {
                continue;
            }
            var requestId = self.generateRequestId_();
            self.socketNamespace_.emit('subscribeRequest', {viewName:viewName, sessionId:self.sessionId, id:requestId});
        }

    };

    /**
     * Handle all operation responses.
     * @param {Object} response response from neutrino server.
     * @private
     */
    ViewHubClient.prototype.responseHandler_ = function (response) {

        if (!response.requestId || !response.sessionId) {
            return;
        }

        var self = this;
        if (!self.sessionId) {
            self.sessionId = response.sessionId;
            self.cookieProvider_.setCookie('sid', response.sessionId);
        }

        self.emit('response' + response.requestId, response.responseBody);

    };

    /**
     * Handle all new value messages and call all subscription callbacks.
     * @param {String} viewName Name of view.
     * @param {String} propertyName Changed property name.
     * @param {String} oldValue Old property value.
     * @param {String} newValue New property value.
     * @private
     */
    ViewHubClient.prototype.newValueHandler_ = function (viewName, propertyName, oldValue, newValue) {

        var self = this;
        if (!self.subscriptions_.hasOwnProperty(viewName)) {
            return;
        }

        self.subscriptions_[viewName].forEach(function (item) {
            item(propertyName, oldValue, newValue);
        });
    };

    /**
     * Create new instance of neutrino cookie provider.
     * @constructor
     */
    function CookieProvider() {

    }

    /**
     * Set cookie.
     * @param {String} name Cookie name.
     * @param {String} value Cookie value.
     * @param {String} expires Cookie expiration date.
     * @param {String} path Cookie path.
     * @param {String} domain Cookie domain.
     * @param {String} secure Is this cookie secure.
     * @return {Boolean}
     */
    CookieProvider.prototype.setCookie = function (name, value, expires, path, domain, secure) {
        if (!name || !value) return false;
        var str = name + '=' + encodeURIComponent(value);

        if (expires) str += '; expires=' + expires.toGMTString();
        if (path)    str += '; path=' + path;
        if (domain)  str += '; domain=' + domain;
        if (secure)  str += '; secure';

        document.cookie = str;
        return true;
    };

    /**
     * Get cookie by name.
     * @param {String} name Cookie name.
     * @return {Object}
     */
    CookieProvider.prototype.getCookie = function (name) {
        var pattern = "(?:; )?" + name + "=([^;]*);?";
        var regexp = new RegExp(pattern);

        if (regexp.test(document.cookie))
            return decodeURIComponent(RegExp["$1"]);

        return null;
    };

//noinspection JSUnusedGlobalSymbols
    /**
     * Remove cookie by specified properties.
     * @param {String} name Cookie name.
     * @param {String} path Cookie path.
     * @param {String} domain Cookie domain.
     * @return {Boolean}
     */
    CookieProvider.prototype.removeCookie = function (name, path, domain) {
        var self = this;
        //noinspection JSCheckFunctionSignatures
        self.setCookie(name, null, new Date(0), path, domain);
        return true;
    };

    /**
     * Ajax implementation.
     * @constructor
     */
    function AjaxProvider() {

    }

    /**
     * Create new AJAX request object.
     * @return {ActiveXObject|XMLHttpRequest}
     * @private
     */
    AjaxProvider.prototype.createRequest_ = function () {

        var request;

        if (typeof(ActiveXObject) !== 'undefined') {
            try {
                request = new ActiveXObject("Msxml2.XMLHTTP");
            } catch (e) {
                request = new ActiveXObject("Microsoft.XMLHTTP");
            }
        } else {
            request = new XMLHttpRequest();
        }

        return request;
    };

    /**
     * Do request to specified URL.
     * @param {String} url Specified URL for request.
     * @param {function(Error,String) callback Result and error handler.
        */
    AjaxProvider.prototype.request = function (url, callback) {

        var self = this;
        var request = self.createRequest_();

        request.open("GET", url, true);
        request.send(null);

        if (callback) {

            var statusChecker = function () {
                if (request.readyState != 4) {
                    setTimeout(statusChecker, 10);
                }

                if (request.status == 200) {
                    callback(null, request.responseText);
                } else {
                    callback(new Error(request.status), null);
                }
            };

            setTimeout(statusChecker, 10);

        }

    };

    /**
     * Get JSON from specified URL.
     * @param {String} url specified URL.
     * @param {function(Error,Object) callback Error and result handler.
        */
    AjaxProvider.prototype.requestJson = function (url, callback) {

        var self = this;
        self.request(url, function (error, result) {
            try {
                var resultObject = (new Function("return " + result))();
                callback(null, resultObject);
            } catch (e) {
                callback(e, null);
            }

        });
    };

})();
