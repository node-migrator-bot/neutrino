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
module.exports = neutrino;

neutrino.version = '0.0.1';
neutrino.isMaster = false;
neutrino.defaults = require('./defaults.json');

neutrino.core = {};
neutrino.core.Config = require('./core/config.js');

neutrino.cluster = {};
neutrino.cluster.Balancer = require('./cluster/balancer.js');
neutrino.cluster.EventBusServer = require('./cluster/eventbusserver.js');
neutrino.cluster.EventBusClient = require('./cluster/eventbusclient.js');
neutrino.cluster.Master = require('./cluster/master.js');
neutrino.cluster.Worker = require('./cluster/worker.js');

neutrino.mvc = {};
neutrino.mvc.ControllerBase = require('./mvc/controllerbase.js');
neutrino.mvc.ModelBase = require('./mvc/modelbase.js');
neutrino.mvc.ViewBase = require('./mvc/viewbase.js');

neutrino.security = {};
neutrino.security.AuthProvider = require('./security/authprovider.js');
neutrino.security.Logger = require('./security/logger.js');


neutrino.start_ = function (configPath) {

    neutrino.currentConfig = new neutrino.core.Config(configPath);

    // logger init
    neutrino.logger = new neutrino.security.Logger(neutrino.currentConfig);
    process.on('uncaughtException', function (error) {
        neutrino.logger.error(error);
    });

    if (neutrino.isMaster) {
        var master = new neutrino.cluster.Master(neutrino.currentConfig);
        master.start();
    } else {
        var worker = new neutrino.cluster.Worker(neutrino.currentConfig);
        worker.start();
    }
};

neutrino.startMaster = function (configPath) {
    neutrino.isMaster = true;
    neutrino.start_(configPath);
};

neutrino.startWorker = function (configPath) {
    neutrino.start_(configPath);
};