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
var neutrino = require('../../index.js'),
    randomValue = Math.random();

neutrino.configure();

var dbProvider = new neutrino.io.DbProvider(neutrino.currentConfig);

exports["Create collection and insert to database"] = function (test) {
    test.expect(2);
    dbProvider.getCollection('testNeutrino', function (collection) {
        collection.insert({hello:'world', test:randomValue}, function (error, object) {
            test.ifError(error);
            test.deepEqual(object[0].test, randomValue);
            test.done();
        });
    });
};

exports["Find in collection"] = function (test) {
    test.expect(3);
    dbProvider.getCollection('testNeutrino', function (collection) {
        collection.findOne({test:randomValue}, function (error, object) {
            test.ifError(error);
            test.deepEqual(object.hello, 'world');
            test.deepEqual(object.test, randomValue);
            test.done();
        });
    });
};

exports['Remove from collection'] = function (test) {
    test.expect(2);
    dbProvider.getCollection('testNeutrino', function (collection) {
        collection.remove({test:randomValue}, {safe:true}, function (error, removedCount) {
            test.ifError(error);
            test.deepEqual(removedCount, 1, 'Item to remove not found');
            test.done();
        });

    });
};

exports['Drop collection from database'] = function (test) {
    test.expect(1);
    dbProvider.getCollection('testNeutrino', function (collection) {
        collection.drop(function (error) {
            test.ifError(error);
            test.done();
        })
    });
};
