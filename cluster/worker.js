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
module.exports = Worker;

var util = require('util');

function Worker(config) {
    var self = this;

    self.eventBusClient_ = new neutrino.cluster.EventBusClient(config);

    self.eventBusClient_.on('serviceMessage', function (messageObject) {
        neutrino.logger.trace(util.format('Connection: %s. %s', messageObject.connection, messageObject.message));
    });

    self.eventBusClient_.on('workerMessage', function (messageObject) {
        self.messageHandler_(messageObject);
    });
}

Worker.prototype.eventBusClient_ = null;

Worker.prototype.start = function () {
    var self = this;
    self.eventBusClient_.connect();

    self.eventBusClient_.sendToMaster({
        type:'address',
        value:'localhost:' + Math.random() * 1000
    });

};

Worker.prototype.messageHandler = function (messageObject) {

};