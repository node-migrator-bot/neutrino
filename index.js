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

/**
 * Main neutrino namespace.
 * @namespace
 * @global
 */
neutrino = {};
module.exports = neutrino;

neutrino.version = '0.0.2';
neutrino.defaults = require('./defaults.json');

neutrino.core = {};
neutrino.core.Config = require('./core/config.js');
neutrino.core.LogicSet = require('./core/logicset.js');

neutrino.cluster = {};

/**
 * Enum of cluster message types.
 * @enum {String}
 */
neutrino.cluster.messageTypes = {
    data:'data',
    sync:'sync',
    shared:'shared',
    load:'load',
    address:'address'
};

/**
 * Enum of socket events.
 * @enum {String}
 */
neutrino.cluster.socketEvents = {
    close:'close',
    data:'data'
};

neutrino.cluster.Balancer = require('./cluster/balancer.js');
neutrino.cluster.EventBusServer = require('./cluster/eventbusserver.js');
neutrino.cluster.EventBusClient = require('./cluster/eventbusclient.js');
neutrino.cluster.Master = require('./cluster/master.js');
neutrino.cluster.Worker = require('./cluster/worker.js');

neutrino.io = {};
neutrino.io.DbProvider = require('./io/dbprovider.js');

neutrino.mvc = {};
neutrino.mvc.modelAccessValidatorName = 'accessValidator';
neutrino.mvc.propertySetValidatorFormat = '%sSetValidator';
neutrino.mvc.propertyGetValidatorFormat = '%sGetValidator';
neutrino.mvc.methodInvokeValidatorFormat = '%sInvokeValidator';
neutrino.mvc.privateRegExp = /^((.*_)|(_.*))$/;
neutrino.mvc.ControllerBase = require('./mvc/controllerbase.js');
neutrino.mvc.ModelBase = require('./mvc/modelbase.js');
neutrino.mvc.ViewBase = require('./mvc/viewbase.js');
neutrino.mvc.ViewHub = require('./mvc/viewhub.js');
neutrino.mvc.Property = require('./mvc/property.js');

neutrino.security = {};
neutrino.security.AuthProvider = require('./security/authprovider.js');
neutrino.security.SessionManager = require('./security/sessionmanager.js');
neutrino.security.Logger = require('./security/logger.js');

process.on('uncaughtException', function (error) {
    try {
        neutrino.logger.error(error);
    } catch (e) {

    }
});

/**
 * Configure neutrino for specified config object or file path.
 * @param {String|Object} config Config obejct of file path.
 */
neutrino.configure = function (config) {

    neutrino.currentConfig = config ? new neutrino.core.Config(config) : new neutrino.core.Config();

    neutrino.logger = new neutrino.security.Logger(neutrino.currentConfig);

    if (neutrino.sessionManager) {
        neutrino.sessionManager.stopCheckExpireInterval();
    }

    neutrino.sessionManager = new neutrino.security.SessionManager(neutrino.currentConfig);

};

/**
 * Create and start new neutrino master node instance.
 * @param {Object} config Configuration object (Optional).
 * @return {neutrino.cluster.Master}
 */
neutrino.createMaster = function (config) {

    var launchConfig = config ? new neutrino.core.Config(config) : neutrino.currentConfig,
        master = new neutrino.cluster.Master(launchConfig);
    master.start();
    return master;

};

/**
 * Create and start new neutrino worker node instance.
 * @param {Object} config Configuration object (Optional).
 * @return {neutrino.cluster.Worker}
 */
neutrino.createWorker = function (config) {

    var launchConfig = config ? new neutrino.core.Config(config) : neutrino.currentConfig,
        worker = new neutrino.cluster.Worker(launchConfig);
    worker.start();
    return worker;

};