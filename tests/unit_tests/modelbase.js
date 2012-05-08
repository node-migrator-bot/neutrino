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

var neutrino = require('../../index.js');
neutrino.currentConfig = config = new neutrino.core.Config();
neutrino.init_();
neutrino.logger = {
    trace:function () {
    },
    error:function () {
    },
    debug:function () {
    },
    warn:function () {
    }
};
dbProvider = new neutrino.io.DbProvider(neutrino.currentConfig);

exports['Model synchronization engine and change event'] = function (test) {

    var config = new neutrino.core.Config({
            "eventBus":{
                "serverPort":50777
            },
            mvc:{
                modelsCollectionName:'testModels1',
                modelsFolder_:"./tests/models"
            }
        }),
        master = new neutrino.cluster.Master(config),
        worker1 = new neutrino.cluster.Worker(config),
        worker2 = new neutrino.cluster.Worker(config),
        loaded = 0;

    master.start();
    worker1.start();
    worker2.start();

    test.expect(6);

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

        worker2.logicSet_.models_['test'].on('changed', function (propertyName, oldValue, newValue) {

            test.deepEqual(propertyName, 'test');
            test.deepEqual(oldValue, 'testValue');
            test.deepEqual(newValue, 'testValue2');

            dbProvider.getCollection(config.$('mvc').modelsCollectionName, function (collection) {
                collection.drop();
                test.done();
            });
        });

        worker1.logicSet_.models_['test'].test.$('testValue2');
        test.deepEqual(worker1.logicSet_.models_['test'].test.$(), 'testValue2');

    }

};

exports['Model state saving and recovery'] = function (test) {

    var config = new neutrino.core.Config({
            "eventBus":{
                "serverPort":50779
            },
            mvc:{
                modelsCollectionName:'testModels2',
                modelsFolder_:"./tests/models"
            }
        }),
        master = new neutrino.cluster.Master(config),
        worker1 = new neutrino.cluster.Worker(config);

    master.start();
    worker1.start();

    test.expect(4);

    worker1.logicSet_.on('modelLoaded', function () {

        test.deepEqual(worker1.logicSet_.models_['test'].test.$(), 'testValue');

        worker1.logicSet_.models_['test'].test.$('testValue3');

        worker1.logicSet_.models_['test'].on('propertySaved', function (propertyName, newValue) {

            test.deepEqual(propertyName, 'test');
            test.deepEqual(newValue, 'testValue3');

            var newWorker = new neutrino.cluster.Worker(config);
            newWorker.start();

            newWorker.logicSet_.on('modelLoaded', function () {
                test.deepEqual(newWorker.logicSet_.models_['test'].test.$(), 'testValue3');
                dbProvider.getCollection(config.$('mvc').modelsCollectionName, function (collection) {
                    collection.drop();
                    test.done();
                });
            });
        });

    });


};
