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

    self.models_ = {};
    self.controllers_ = {};
    self.views_ = {};

    self.worker_.on('data', function (data) {

        for (var modelName in self.models_) {

            if (!self.models_.hasOwnProperty(modelName)) {
                continue;
            }
            self.models_[modelName].dataMessageHandler(data);

        }
    });

    self.worker_.on('sync', function (data) {

        for (var modelName in self.models_) {

            if (!self.models_.hasOwnProperty(modelName)) {
                continue;
            }
            self.models_[modelName].syncMessageHandler(data);

        }

    });

    self.initModels_();
}

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
 * Link view and view bridge.
 * @param {String} viewName Name of view to link
 * @private
 */
LogicSet.prototype.linkView_ = function (viewName) {

    var self = this,
        view = self.views_[viewName];

    view.on('showError', function (errorMessage, sessionId, requestId) {
        self.viewHub_.sendError(viewName, errorMessage, sessionId, requestId);
    });

    view.on('showModel', function (model, sessionId, requestId) {
        self.viewHub_.sendModel(viewName, model, sessionId, requestId);
    });

    view.on('updateValue', function (propertyName, oldValue, newValue, sessionId) {
        self.viewHub_.sendNewValue(viewName, propertyName, oldValue, newValue, sessionId);
    });

    view.on('invokeResult', function (methodName, result, sessionId, requestId) {
        self.viewHub_.sendInvokeResult(viewName, methodName, result, sessionId, requestId);
    });

    self.viewHub_.on('modelRequest', function (requestViewName, sessionId, requestId) {
        if (requestViewName !== viewName) {
            return;
        }
        view.getModel(sessionId, requestId);
    });

    self.viewHub_.on('editRequest', function (requestViewName, propertyName, newValue, sessionId, requestId) {
        if (requestViewName !== viewName) {
            return;
        }
        view.setValue(propertyName, newValue, sessionId, requestId);
    });

    self.viewHub_.on('invokeRequest', function (requestViewName, methodName, args, sessionId, requestId) {
        if (requestViewName !== viewName) {
            return;
        }
        view.invoke(methodName, args, sessionId, requestId);
    });

    self.viewHub_.on('subscribe', function (sessionId, requestId) {
        view.subscribe(sessionId, requestId);
    });

    self.viewHub_.on('unsubscribe', function (sessionId, requestId) {
        view.unsubscribe(sessionId, requestId);
    });
};

/**
 * Load models and init MVC implementation.
 * @private
 */
LogicSet.prototype.initModels_ = function () {

    var self = this;

    fs.readdir(self.modelsFolder_, function (error, files) {

        if (error) {
            throw new Error('Models folder "' + self.modelsFolder_ + '" was not found!');
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

            try {
                controllerConstructor = require(controllerPath);
            } catch (e) {
                controllerConstructor = neutrino.mvc.ControllerBase;
            }

            try {
                viewConstructor = require(viewPath);
            } catch (e) {
                viewConstructor = neutrino.mvc.ViewBase;
            }

            //noinspection UnnecessaryLocalVariableJS
            var modelName = path.basename(file, '.js'),
                model = new modelConstructor(self.config_, modelName),
                view = new viewConstructor(self.config_, modelName),
                controller = new controllerConstructor(self.config_, modelName, model, view);

            model.on('modelLoaded', function () {
                self.emit('modelLoaded', {
                    name:modelName,
                    path:modelPath
                });
            });

            model.on('sendSync', function (message) {
                self.worker_.sendSyncMessage(message);
            });

            self.models_[modelName] = model;
            self.controllers_[modelName] = controller;
            self.views_[modelName] = view;

            self.linkView_(modelName);

        });
    });
};