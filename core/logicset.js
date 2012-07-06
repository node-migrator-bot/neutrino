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
module.exports = LogicSet;

var http = require('http'),
    path = require('path'),
    event = require('events'),
    util = require('util'),
    fs = require('fs');

util.inherits(LogicSet, event.EventEmitter);

/**
 * Create new instance of neutrino logic set.
 * @param {neutrino.core.Config} config Neutrino config object.
 * @param {neutrino.cluster.Worker} worker Worker which is the owner of this logic set.
 * @constructor
 */
function LogicSet(config, worker) {

    var self = this,
        mvcConfig = config.$('mvc') || {};

    event.EventEmitter.call(self);

    self.worker_ = worker;
    self.config_ = config;

    self.modelsFolder_ = mvcConfig.modelsFolder || self.modelsFolder_;
    self.controllersFolder_ = mvcConfig.controllersFolder || self.controllersFolder_;
    self.viewsFolder_ = mvcConfig.viewsFolder || self.viewsFolder_;

    self.viewHub_ = new neutrino.mvc.ViewHub(config);
    var viewHubEvents = neutrino.mvc.ViewHub.events;

    self.viewHub_.on(viewHubEvents.clientConnected, function () {
        self.worker_.loadEstimation++;
    });
    self.viewHub_.on(viewHubEvents.clientDisconnected, function () {
        self.worker_.loadEstimation--;
    });
    self.viewHub_.on(viewHubEvents.httpServerStarted, function (host, port) {
        self.worker_.setCurrentAddress(host, port);
    });

    self.models_ = {};
    self.controllers_ = {};
    self.views_ = {};

    self.worker_.on(neutrino.cluster.Worker.events.messageForModels, function (type, sender, value) {
        self.messageForModelsHandler_(type, sender, value);
    });

    self.worker_.on(neutrino.cluster.Worker.events.sharedMessage, function (messageObject) {
        if (!messageObject || !messageObject.viewName || !messageObject.sessionId) {
            return;
        }
        self.viewHub_.sendNotification(messageObject.viewName, messageObject.sessionId,
            messageObject.data, true);
    });

    self.viewHub_.on(viewHubEvents.routeNotification, function (viewName, sessionId, notificationObject) {
        self.worker_.sendSharedMessage({
            sessionId:sessionId,
            data:notificationObject,
            viewName:viewName
        });
    });

    self.initModels_();
}

/**
 * Enum of logic set events.
 * @enum {String}
 */
LogicSet.events = {
    loaded:'loaded'
};

/**
 * Owner worker.
 * @type {neutrino.cluster.Worker}
 * @private
 */
LogicSet.prototype.worker_ = null;

/**
 * Current config object.
 * @type {neutrino.core.Config}
 * @private
 */
LogicSet.prototype.config_ = null;

/**
 * Current server-client view bridge.
 * @type {neutrino.mvc.ViewHub}
 * @private
 */
LogicSet.prototype.viewHub_ = null;

/**
 * Current models folder.
 * @type {String}
 * @private
 */
LogicSet.prototype.modelsFolder_ = neutrino.defaults.mvc.modelsFolder;

/**
 * Current controllers folder.
 * @type {String}
 * @private
 */
LogicSet.prototype.controllersFolder_ = neutrino.defaults.mvc.controllersFolder;

/**
 * Current view folder.
 * @type {String}
 * @private
 */
LogicSet.prototype.viewsFolder_ = neutrino.defaults.mvc.viewsFolder;

/**
 * Hash table of models.
 * @type {Object}
 * @private
 */
LogicSet.prototype.models_ = null;

/**
 * Hash table of controllers.
 * @type {Object}
 * @private
 */
LogicSet.prototype.controllers_ = null;

/**
 * Hash table of views.
 * @type {Object}
 * @private
 */
LogicSet.prototype.views_ = null;

/**
 * Handle messages for specified model or all models.
 * @param {String} type Type of message.
 * @param {String} sender Name of sender which sends this message
 * @param {Object} value Message object.
 * @private
 */
LogicSet.prototype.messageForModelsHandler_ = function (type, sender, value) {

    var self = this,
        messageHandlerName = util.format('%sMessageHandler', type);

    if (value.modelName && value.modelName in self.models_) {

        if (typeof(self.models_[value.modelName][messageHandlerName]) === 'function') {
            self.models_[value.modelName][messageHandlerName](sender, value.data);
        }
        return;
    }

    for (var modelName in self.models_) {

        if (!self.models_.hasOwnProperty(modelName) ||
            typeof(self.models_[modelName][messageHandlerName]) !== 'function') {
            continue;
        }

        self.models_[modelName][messageHandlerName](sender, value.data);

    }

};

/**
 * Link view and view bridge.
 * @param {String} viewName Name of view to link
 * @private
 */
LogicSet.prototype.linkView_ = function (viewName) {

    var self = this,
        view = self.views_[viewName],
        viewEvents = neutrino.mvc.ViewBase.events,
        viewHubEvents = neutrino.mvc.ViewHub.events;

    view.on(viewEvents.updateValue, function (propertyName, oldValue, newValue, sessionId) {
        self.viewHub_.sendNewValue(viewName, propertyName, oldValue, newValue, sessionId);
    });

    view.on(viewEvents.showResponse, function (response, sessionId, requestId) {
        self.viewHub_.sendResponse(viewName, response, sessionId, requestId);
    });

    view.on(viewEvents.showNotification, function (sessionId, notificationObject) {
        self.viewHub_.sendNotification(viewName, sessionId, notificationObject);
    });

    self.viewHub_.on(viewHubEvents.modelRequest, function (requestViewName, sessionId, requestId) {
        if (requestViewName !== viewName) {
            return;
        }
        view.getModel(sessionId, requestId);
    });

    self.viewHub_.on(viewHubEvents.editRequest, function (requestViewName, propertyName, newValue, sessionId, requestId) {
        if (requestViewName !== viewName) {
            return;
        }
        view.setValue(propertyName, newValue, sessionId, requestId);
    });

    self.viewHub_.on(viewHubEvents.invokeRequest, function (requestViewName, methodName, args, sessionId, requestId) {
        if (requestViewName !== viewName) {
            return;
        }
        view.invoke(methodName, args, sessionId, requestId);
    });

    self.viewHub_.on(viewHubEvents.subscribeRequest, function (requestViewName, sessionId, requestId) {
        if (requestViewName !== viewName) {
            return;
        }
        view.subscribe(sessionId, requestId);
    });

    self.viewHub_.on(viewHubEvents.unsubscribeRequest, function (requestViewName, sessionId, requestId) {
        if (requestViewName !== viewName && requestViewName !== '*') {
            return;
        }
        view.unsubscribe(sessionId, requestId);
    });
};

/**
 * Load models and init MVC implementation.
 * @private
 */
LogicSet.prototype.initModels_ = function () {

    var self = this,
        modelEvents = neutrino.mvc.ModelBase.events;

    fs.readdir(self.modelsFolder_, function (error, files) {

        if (error) {
            return;
        }

        files.forEach(function (file) {

            if (path.extname(file) !== '.js') {
                return;
            }

            //noinspection UnnecessaryLocalVariableJS
            var modelPath = path.resolve(util.format('%s/%s', self.modelsFolder_, file)),
                controllerPath = path.resolve(util.format('%s/%s', self.controllersFolder_, file)),
                viewPath = path.resolve(util.format('%s/%s', self.viewsFolder_, file)),

                modelConstructor = require(modelPath),
                controllerConstructor,
                viewConstructor;

            neutrino.logger.trace(util.format('Model "%s" loaded', modelPath));

            try {
                controllerConstructor = require(controllerPath);
                neutrino.logger.trace(util.format('Custom controller "%s" loaded', controllerPath));
            } catch (e) {
                controllerConstructor = neutrino.mvc.ControllerBase;
                neutrino.logger.trace(util.format('Base controller for model "%s" loaded', modelPath));
            }

            try {
                viewConstructor = require(viewPath);
                neutrino.logger.trace(util.format('Custom view "%s" loaded', viewPath));
            } catch (e) {
                viewConstructor = neutrino.mvc.ViewBase;
                neutrino.logger.trace(util.format('Base view for model "%s" loaded', modelPath));
            }

            //noinspection UnnecessaryLocalVariableJS
            var modelName = path.basename(file, '.js'),
                model = new modelConstructor(self.config_, modelName),
                view = new viewConstructor(self.config_, modelName),
                controller = new controllerConstructor(self.config_, modelName, model, view);

            model.on(LogicSet.events.loaded, function () {
                self.emit(LogicSet.events.loaded, {
                    name:modelName,
                    path:modelPath
                });
            });

            model.on(modelEvents.syncRequired, function (message) {
                self.worker_.sendSyncMessage(modelName, message);
            });

            model.on(modelEvents.sentToService, function (serviceName, data) {
                self.worker_.sendDataMessage(modelName, serviceName, data);
            });

            self.models_[modelName] = model;
            self.controllers_[modelName] = controller;
            self.views_[modelName] = view;

            self.linkView_(modelName);

        });
    });
};