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
neutrino.configure();

neutrino.logger = {
    trace:function () {
    },
    error:function () {
    },
    debug:function () {
    },
    warn:function () {
    },
    info:function () {

    }
};

var dbProvider = new neutrino.io.DbProvider(neutrino.currentConfig),
    logicSetEvents = neutrino.core.LogicSet.events,
    modelEvents = neutrino.mvc.ModelBase.events;

exports['Model synchronization engine and change event'] = function (test) {

    //noinspection JSUnusedLocalSymbols
    var config = {
            "eventBus":{
                "serverPort":8081
            },
            mvc:{
                modelsCollectionName:'testModels1',
                modelsFolder:"./tests/models"
            }
        },
        loaded = 0,
        master = neutrino.createMaster(config),
        worker1 = neutrino.createWorker(config),
        worker2 = neutrino.createWorker(config);

    test.expect(6);

    worker1.logicSet_.on(logicSetEvents.loaded, function () {
        loaded++;
        startTest();
    });

    worker2.logicSet_.on(logicSetEvents.loaded, function () {
        loaded++;
        startTest();
    });

    function startTest() {

        if (loaded !== 2) {
            return;
        }
        test.deepEqual(worker1.logicSet_.models_['test'].test.$(), 'testValue');
        test.deepEqual(worker2.logicSet_.models_['test'].test.$(), 'testValue');

        worker2.logicSet_.models_['test'].on(modelEvents.changed, function (propertyName, oldValue, newValue) {

            test.deepEqual(propertyName, 'test');
            test.deepEqual(oldValue, 'testValue');
            test.deepEqual(newValue, 'testValue2');

            dbProvider.getCollection(config.mvc.modelsCollectionName, function (collection) {
                collection.drop();
                test.done();
            });
        });

        worker1.logicSet_.models_['test'].test.$('testValue2');
        test.deepEqual(worker1.logicSet_.models_['test'].test.$(), 'testValue2');

    }

};

exports['Model state saving and recovery'] = function (test) {

    //noinspection JSUnusedLocalSymbols
    var config = {
            "eventBus":{
                "serverPort":8082
            },
            mvc:{
                modelsCollectionName:'testModels2',
                modelsFolder:"./tests/models"
            }
        },
        master = neutrino.createMaster(config),
        worker1 = neutrino.createWorker(config);

    test.expect(4);

    worker1.logicSet_.on(logicSetEvents.loaded, function () {

        test.deepEqual(worker1.logicSet_.models_['test'].test.$(), 'testValue');

        worker1.logicSet_.models_['test'].test.$('testValue3');

        worker1.logicSet_.models_['test'].on(modelEvents.propertySaved, function (propertyName, newValue) {

            test.deepEqual(propertyName, 'test');
            test.deepEqual(newValue, 'testValue3');

            var newWorker = neutrino.createWorker(config);

            newWorker.logicSet_.on(logicSetEvents.loaded, function () {
                test.deepEqual(newWorker.logicSet_.models_['test'].test.$(), 'testValue3');
                dbProvider.getCollection(config.mvc.modelsCollectionName, function (collection) {
                    collection.drop();
                    test.done();
                });
            });
        });

    });

};

exports['Receive incoming data from event service'] = function (test) {

    //noinspection JSUnusedLocalSymbols
    var config = {
            "eventBus":{
                "serverPort":8083
            },
            "master":{
                "eventServicesFolder":"./tests/services"
            },
            mvc:{
                modelsCollectionName:'testModels3',
                modelsFolder:"./tests/models"
            }
        },
        master = neutrino.createMaster(config),
        worker1 = neutrino.createWorker(config);

    test.expect(1);

    worker1.logicSet_.on(logicSetEvents.loaded, function () {
        worker1.logicSet_.models_['test'].on(modelEvents.dataFromService, function (sender, data) {

            test.deepEqual(data.message, 'testMessage');

            dbProvider.getCollection(config.mvc.modelsCollectionName, function (collection) {
                collection.drop();
                test.done();
            });
        });
    });

};

exports['Send data to event service'] = function (test) {

    //noinspection JSUnusedLocalSymbols
    var config = {
            "eventBus":{
                "serverPort":8084
            },
            "master":{
                "eventServicesFolder":"./tests/services"
            },
            mvc:{
                modelsCollectionName:'testModels4',
                modelsFolder:"./tests/models"
            }
        },
        master = neutrino.createMaster(config),
        worker1 = neutrino.createWorker(config);

    test.expect(1);

    worker1.logicSet_.on(logicSetEvents.loaded, function () {
        worker1.logicSet_.models_['test'].on(modelEvents.dataFromService, function (sender, data) {

            if (sender !== 'testservice2') {
                return;
            }

            test.deepEqual(data.message, 'dataReceived');

            dbProvider.getCollection(config.mvc.modelsCollectionName, function (collection) {
                collection.drop();
                test.done();
            });
        });
        worker1.logicSet_.models_['test'].sendToServiceTest('testservice2', 'dataReceived');
    });

};