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

function LogicSet(config) {

    var self = this,
        mvcConfig = config.$('mvc') || {};

    event.EventEmitter.call(self);

    self.config_ = config;

    self.modelsFolder_ = mvcConfig.modelsFolder_ || self.modelsFolder_;
    self.controllersFolder_ = mvcConfig.controllersFolder_ || self.controllersFolder_;
    self.viewsFolder_ = mvcConfig.viewsFolder_ || self.viewsFolder_;

    self.bridge_ = new neutrino.mvc.ViewBridge(config);

    self.models_ = {};
    self.controllers_ = {};
    self.views_ = {};

    self.initModels_();
}

LogicSet.prototype.config_ = null;

LogicSet.prototype.bridge_ = null;

LogicSet.prototype.modelsFolder_ = neutrino.defaults.mvc.modelsFolder_;
LogicSet.prototype.controllersFolder_ = neutrino.defaults.mvc.controllersFolder_;
LogicSet.prototype.viewsFolder_ = neutrino.defaults.mvc.viewsFolder_;

LogicSet.prototype.models_ = null;
LogicSet.prototype.views_ = null;
LogicSet.prototype.controllers_ = null;

LogicSet.prototype.linkView_ = function (viewName) {

    var self = this,
        view = self.views_[viewName];

    view.on('showError', function (errorMessage, sessionId) {
        self.bridge_.sendError(viewName, errorMessage, sessionId);
    });

    view.on('showModel', function (model, sessionId) {
        self.bridge_.sendModel(viewName, model, sessionId);
    });

    view.on('updateValue', function (propertyName, oldValue, newValue) {
        self.bridge_.sendNewValue(viewName, propertyName, oldValue, newValue);
    });

    self.bridge_.on('modelRequest', function (requestViewName, sessionId) {
        if (requestViewName !== viewName) {
            return;
        }
        view.getModel(sessionId);
    });

    self.bridge_.on('editRequest', function (requestViewName, propertyName, newValue, sessionId) {
        if (requestViewName !== viewName) {
            return;
        }
        view.edit(propertyName, newValue, sessionId);
    });
};

LogicSet.prototype.initModels_ = function () {

    var self = this;

    fs.readdir(self.modelsFolder_, function (error, files) {

        if (error) {
            throw new Error('Models folder "' + self.modelsFolder_ + '" was not found!');
        }

        files.forEach(function (file) {

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
            var model = new modelConstructor(self.config_),
                view = new viewConstructor(self.config_, self.bridge_),
                controller = new controllerConstructor(self.config_, model, view),

                modelName = path.basename(file, '.js');

            self.models_[modelName] = model;
            self.controllers_[modelName] = controller;
            self.views_[modelName] = view;

            self.linkView_(modelName);

            self.emit('modelLoaded', {
                name:modelName,
                path:modelPath
            });

        });
    });
};