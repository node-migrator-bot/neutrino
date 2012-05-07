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

var neutrino = require('../index.js');
neutrino.currentConfig = config = new neutrino.core.Config({
    mvc:{
        modelsFolder_:"./tests/models"
    }
});

var master = new neutrino.cluster.Master(neutrino.currentConfig),
    worker1 = new neutrino.cluster.Worker(neutrino.currentConfig),
    worker2 = new neutrino.cluster.Worker(neutrino.currentConfig);

exports['Model synchronization engine'] = function (test) {

    var loaded = 0;
    worker1.logicSet_.on('modelLoaded', function () {
        loaded++;
        startTest();
    });

    worker2.logicSet_.on('modelLoaded', function () {
        loaded++;
        startTest();
    });

    function startTest() {
        if (loaded !== 2) {
            return;
        }

        test.deepEqual(worker1.logicSet_.models_['test'].test.$(), 'testValue');
        test.deepEqual(worker2.logicSet_.models_['test'].test.$(), 'testValue');

        worker1.logicSet_.models_['test'].test.$('testValue2');
        test.deepEqual(worker1.logicSet_.models_['test'].test.$(), 'testValue2');
        setTimeout(function () {
            test.deepEqual(worker2.logicSet_.models_['test'].test.$(), 'testValue2');
        }, 100);
        test.done();
    }

};
