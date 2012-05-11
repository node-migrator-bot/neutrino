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
    masterConfig = new neutrino.core.Config({
        "eventBus":{
            "serverPort":8085
        }
    }),
    master = new neutrino.createMaster(masterConfig);

exports['Get model'] = function (test) {

    var config = {
            "eventBus":{
                "serverPort":8085
            },
            mvc:{
                modelsCollectionName:'testModelsViewTest1',
                modelsFolder:"./tests/models"
            },
            worker:{
                port:50889
            }
        },
        worker = neutrino.createWorker(config),
        logicSet = worker.logicSet_;

    test.expect(4);
    logicSet.on('modelLoaded', function () {

        var myRequestId = new Date().getTime(),
            mySessionId = new Date().getTime() + Math.random();

        logicSet.views_['test'].on('showResponse', function (responseObject, sessionId, requestId) {

            test.deepEqual(responseObject.success.true);
            test.deepEqual(responseObject.model.test, 'testValue');
            test.deepEqual(sessionId, mySessionId);
            test.deepEqual(requestId, myRequestId);

            dbProvider.getCollection(config.mvc.modelsCollectionName, function (collection) {
                collection.drop();
                test.done();
            });
        });
        logicSet.views_['test'].getModel(mySessionId, myRequestId);
    });
};

exports['Set value and receive update'] = function (test) {

    var config = {
            "eventBus":{
                "serverPort":8085
            },
            mvc:{
                modelsCollectionName:'testModelsViewTest2',
                modelsFolder:"./tests/models"
            },
            worker:{
                port:50890
            }
        },
        worker = neutrino.createWorker(config),
        logicSet = worker.logicSet_;

    test.expect(8);
    logicSet.on('modelLoaded', function () {

        var myRequestId = new Date().getTime(),
            mySessionId = new Date().getTime() + Math.random();

        logicSet.views_['test'].on('updateValue', function (propertyName, oldValue, newValue, sessionId) {

            test.deepEqual(logicSet.models_['test'].test.$(), 'newTestValue');
            test.deepEqual(propertyName, 'test');
            test.deepEqual(oldValue, 'testValue');
            test.deepEqual(newValue, 'newTestValue');
            test.deepEqual(sessionId, mySessionId);

            dbProvider.getCollection(config.mvc.modelsCollectionName, function (collection) {
                collection.drop();
                test.done();
            });
        });
        logicSet.views_['test'].on('showResponse', function (responseObject, sessionId, requestId) {
            test.deepEqual(responseObject.success, true);
            test.deepEqual(sessionId, mySessionId);
            test.deepEqual(requestId, myRequestId);
        });
        logicSet.views_['test'].subscribe(mySessionId, myRequestId);
        logicSet.views_['test'].setValue('test', 'newTestValue', mySessionId, myRequestId);
    });
};

exports['Invoke method and receive a result'] = function (test) {

    var config = {
            "eventBus":{
                "serverPort":8085
            },
            mvc:{
                modelsCollectionName:'testModelsViewTest3',
                modelsFolder:"./tests/models"
            },
            worker:{
                port:50891
            }
        },
        worker = neutrino.createWorker(config),
        logicSet = worker.logicSet_;

    test.expect(4);
    logicSet.on('modelLoaded', function () {

        var myRequestId = new Date().getTime(),
            mySessionId = new Date().getTime() + Math.random();

        logicSet.views_['test'].on('showResponse', function (responseObject, sessionId, requestId) {
            test.deepEqual(responseObject.success, true);
            test.deepEqual(sessionId, mySessionId);
            test.deepEqual(requestId, myRequestId);
            test.deepEqual(responseObject.result, 'returnedTestValue');

            dbProvider.getCollection(config.mvc.modelsCollectionName, function (collection) {
                collection.drop();
                test.done();
            });
        });

        logicSet.views_['test'].invoke('testMethod', ['returnedTestValue'], mySessionId, myRequestId);
    });
};

exports['Get private property error delivery'] = function (test) {

    var config = {
            "eventBus":{
                "serverPort":8085
            },
            mvc:{
                modelsCollectionName:'testModelsViewTest4',
                modelsFolder:"./tests/models"
            },
            worker:{
                port:50892
            }
        },
        worker = neutrino.createWorker(config),
        logicSet = worker.logicSet_;

    test.expect(4);
    logicSet.on('modelLoaded', function () {

        var myRequestId = new Date().getTime(),
            mySessionId = new Date().getTime() + Math.random();

        logicSet.views_['test'].on('showResponse', function (responseObject, sessionId, requestId) {
            test.deepEqual(requestId, myRequestId);
            test.deepEqual(sessionId, mySessionId);
            test.deepEqual(responseObject.success, false);
            test.deepEqual(responseObject.error.message, 'Can not invoke private methods');
            dbProvider.getCollection(config.mvc.modelsCollectionName, function (collection) {
                collection.drop();
                test.done();
            });
        });

        logicSet.views_['test'].invoke('privateTest_', ['returnedTestValue'], mySessionId, myRequestId);
    });

};