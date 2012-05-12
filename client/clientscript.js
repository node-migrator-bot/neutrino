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

/**
 * Create new instance of neutrino view hub client.
 * @param {String} masterUrl URL to master node.
 * @constructor
 */
neutrino.ViewHubClient = function (masterUrl) {

    var self = this;
    self.subscriptions_ = {};
    self.cookieProvider_ = new neutrino.CookieProvider();
    self.eventEmitter_ = new exports.EventEmitter();
    self.eventEmitter_.on('socketReady', function () {
        self.isSocketReady_ = true;
    });
    self.sessionId = self.cookieProvider_.getCookie('sid');
    self.connect_(masterUrl);

};

/**
 * Is socket ready to send messages.
 * @type {Boolean}
 * @private
 */
neutrino.ViewHubClient.prototype.isSocketReady_ = false;

/**
 * Current instance of event emitter.
 * @type {EventEmitter}
 * @private
 */
neutrino.ViewHubClient.prototype.eventEmitter_ = null;

/**
 * Generate new request ID.
 * @return {Number}
 * @private
 */
neutrino.ViewHubClient.prototype.generateRequestId_ = function () {
    return new Date().getTime() + Math.random();
};

/**
 * Current cookie provider.
 * @type {neutrino.CookieProvider}
 * @private
 */
neutrino.ViewHubClient.prototype.cookieProvider_ = null;

/**
 * Client subscriptions collection.
 * @type {Object}
 * @private
 */
neutrino.ViewHubClient.prototype.subscriptions_ = null;

/**
 * Current socket instance.
 * @type {Object}
 * @private
 */
neutrino.ViewHubClient.prototype.socket_ = null;

/**
 * Get worker node address and connect to it.
 * @param {String} masterUrl Master node URL.
 * @private
 */
neutrino.ViewHubClient.prototype.connect_ = function (masterUrl) {

    var self = this;

    microAjax(masterUrl + '/getWorker', function (result) {

        var workerAddress = (new Function("return " + result))(),
            workerAddressUrl = 'http://' + workerAddress.host + ':' + workerAddress.port;

        if (!workerAddress.host || !workerAddress.port) {
            throw new Error('Neutrino has no worker nodes');
        }

        self.socket_ = io.connect(workerAddressUrl);

        self.socket_.on('newValue', function (viewName, propertyName, oldValue, newValue) {
            self.newValueHandler_(viewName, propertyName, oldValue, newValue);
        });

        self.socket_.on('invokeMethodResponse', function (response) {
            self.responseHandler_(response);
        });

        self.socket_.on('subscribeResponse', function (response) {
            self.responseHandler_(response);
        });

        self.socket_.on('unsubscribeResponse', function (response) {
            self.responseHandler_(response);
        });

        self.socket_.on('editResponse', function (response) {
            self.responseHandler_(response);
        });

        self.socket_.on('getModelResponse', function (response) {
            self.responseHandler_(response);
        });

        self.socket_.on('reconnect', function () {
            self.reconnectHandler_();
        });
        self.eventEmitter_.emit('socketReady');

    });

};

/**
 * Invoke method from neutrino view.
 * @param {String} viewName Name of view.
 * @param {String} methodName Name of method.
 * @param {function(Error,*)} callback Result handler.
 * @param {*} ... Optional arguments.
 */
neutrino.ViewHubClient.prototype.invoke = function (viewName, methodName, callback) {

    var self = this,
        requestId = self.generateRequestId_(),
        args = Array.prototype.slice.call(arguments, 3),
        execute = function () {

            if (!viewName || !methodName) {
                callback && callback(new Error('View name and method name must be specified'));
                return;
            }

            self.eventEmitter_.once('response' + requestId, function (response) {
                self.eventEmitter_.removeAllListeners('response' + requestId);
                if (!response.success) {
                    callback && callback(new Error('Server declined method invocation'));
                    return;
                }

                callback && callback(null, response.result);
            });
            self.socket_.emit('invokeMethodRequest', {
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
        self.eventEmitter_.once('socketReady', execute);
    }
};

/**
 * Get current model state object.
 * @param {String} viewName Name of view.
 * @param {function(Error, Object)} callback Result handler.
 */
neutrino.ViewHubClient.prototype.getModel = function (viewName, callback) {

    var self = this,
        requestId = self.generateRequestId_(),
        execute = function () {

            if (!viewName) {
                callback && callback(new Error('View name must be specified'));
                return;
            }

            self.eventEmitter_.once('response' + requestId, function (response) {
                self.eventEmitter_.removeAllListeners('response' + requestId);
                if (!response.success) {
                    callback && callback(new Error('Server declined model request'));
                    return;
                }

                callback && callback(null, response.model);
            });
            self.socket_.emit('getModelRequest', {
                viewName:viewName,
                sessionId:self.sessionId,
                id:requestId
            });

        };

    if (self.isSocketReady_) {
        execute();
    } else {
        self.eventEmitter_.once('socketReady', execute);
    }
};

/**
 * Set new value of property on server.
 * @param {String} viewName Name of view.
 * @param {String} propertyName Name of property to change value.
 * @param {*} newValue New value of property.
 * @param {function(Error)} callback Result handler.
 */
neutrino.ViewHubClient.prototype.setValue = function (viewName, propertyName, newValue, callback) {

    var self = this,
        requestId = self.generateRequestId_(),
        execute = function () {

            if (!viewName || !propertyName) {
                callback && callback(new Error('View name and property name must be specified'));
                return;
            }

            self.eventEmitter_.once('response' + requestId, function (response) {
                self.eventEmitter_.removeAllListeners('response' + requestId);
                if (!response.success) {
                    callback && callback(new Error('Server declined new value of property'));
                    return;
                }

                callback && callback(null);
            });
            self.socket_.emit('editRequest', {
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
        self.eventEmitter_.once('socketReady', execute);
    }
};

/**
 * Subscribe handler to view update.
 * @param {String} viewName Name of view.
 * @param {function(String,*,*)} handler Handler for new value message.
 * @param {function(Error)} callback Subscription result callback (optional).
 */
neutrino.ViewHubClient.prototype.subscribe = function (viewName, handler, callback) {

    if (!viewName || !handler) {
        callback && callback(new Error('View name and handler must be specified'));
        return;
    }

    var self = this,
        requestId = self.generateRequestId_(),
        execute = function () {

            self.eventEmitter_.once('response' + requestId, function (response) {
                self.eventEmitter_.removeAllListeners('response' + requestId);
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
            self.socket_.emit('subscribeRequest', {viewName:viewName, sessionId:self.sessionId, id:requestId});

        };

    if (self.isSocketReady_) {
        execute();
    } else {
        self.eventEmitter_.once('socketReady', execute);
    }

};

/**
 * Unsubscribe handler from view update.
 * @param {String} viewName Name of view.
 * @param {function(String,*,*)} handler Handler was subscribed.
 * @param {function(Error)} callback Operation result callback (optional).
 */
neutrino.ViewHubClient.prototype.unsubscribe = function (viewName, handler, callback) {

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
            self.eventEmitter_.once('response' + requestId, function (response) {
                self.eventEmitter_.removeAllListeners('response' + requestId);

                var removeIndex = self.subscriptions_[viewName].indexOf(handler);
                self.subscriptions_.splice(removeIndex, 1);

                if (!response.success) {
                    callback && callback(new Error('Server declined unsubscribe message'));
                } else {
                    callback && callback(null);
                }

            });
            self.socket_.emit('unsubscribeRequest', {viewName:viewName, sessionId:self.sessionId, id:requestId});
        };

    if (self.isSocketReady_) {
        execute();
    } else {
        self.eventEmitter_.once('socketReady', execute);
    }
};

/**
 * Resubscribe all client subscriptions.
 * @private
 */
neutrino.ViewHubClient.prototype.reconnectHandler_ = function () {

    var self = this;

    for (var viewName in self.subscriptions_) {
        if (!self.subscriptions_.hasOwnProperty(viewName)) {
            continue;
        }
        var requestId = self.generateRequestId_();
        self.socket_.emit('subscribeRequest', {viewName:viewName, sessionId:self.sessionId, id:requestId});
    }

};

/**
 * Handle all operation responses.
 * @param {Object} response response from neutrino server.
 * @private
 */
neutrino.ViewHubClient.prototype.responseHandler_ = function (response) {

    if (!response.requestId || !response.sessionId) {
        return;
    }

    var self = this;
    if (!self.sessionId) {
        self.sessionId = response.sessionId;
        self.cookieProvider_.setCookie('sid', response.sessionId);
    }

    self.eventEmitter_.emit('response' + response.requestId, response.responseBody);

};

/**
 * Handle all new value messages and call all subscription callbacks.
 * @param {String} viewName Name of view.
 * @param {String} propertyName Changed property name.
 * @param {String} oldValue Old property value.
 * @param {String} newValue New property value.
 * @private
 */
neutrino.ViewHubClient.prototype.newValueHandler_ = function (viewName, propertyName, oldValue, newValue) {

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
neutrino.CookieProvider = function CookieProvider() {

};

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
neutrino.CookieProvider.prototype.setCookie = function (name, value, expires, path, domain, secure) {
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
neutrino.CookieProvider.prototype.getCookie = function (name) {
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
neutrino.CookieProvider.prototype.removeCookie = function (name, path, domain) {
    var self = this;
    //noinspection JSCheckFunctionSignatures
    self.setCookie(name, null, new Date(0), path, domain);
    return true;
};
