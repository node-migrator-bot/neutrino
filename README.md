#neutrino - framework for distributed web-service development.[![Build Status](https://secure.travis-ci.org/DenisRechkunov/neutrino.png)](http://travis-ci.org/DenisRechkunov/neutrino)

##Description

The main aim of the project is to solve a scaling issue for node.js web-services. Node.js has an implementation of cluster but it's only locally on one physical machine.

Neutrino gives ability to create web-service which is distributed geographically on different physical or virtual servers around the world. Also neutrino can automatically balance your cluster and synchronize state of its worker nodes it also uses safe protocol for communication using key pair and TLS (optional). As a main data storage it uses MongoDB which also have a good scaling features. 

Neutrino isn't just a framework for server but client-side code too. It uses Socket.IO as a data channel between client and server script and provides with high-level engine for neutrino usage.

Neutrino has MVC pattern implementation with observable properties in model, auto validators in controller and subscription engine on client to receive model's changes in real time.

If you need to send data to whole distributed neutrino system you can create "event service". It will send data to master node which will send it to most free node for data processing.

##Installation

To install neutrino package just use NPM:

    npm install neutrino

Or download last release in tags tab of this page.


##Examples

To start neutrino system you must start master and at least one worker node.

    var neutrino = require('neutrino');

    neutrino.configure({
        ... // config options
    });

    neutrino.createMaster();
    neutrino.createWorker();

If you want to start more workers you need change worker node's host and/or port configuration. See [default config](https://github.com/DenisRechkunov/neutrino/blob/master/defaults.json) for details.
All config options were passed to "configure" method will override default config options, but you don't need to set all config options here, just options which differs from defaults.

Model example

	module.exports = TestModel;
	
	var util = require('util');
	util.inherits(TestModel, neutrino.mvc.ModelBase);
	
	function TestModel(config, modelFileName) {
	
	    neutrino.mvc.ModelBase.call(this, config, modelFileName, {
	        testProperty1:'testValue1',
			testProperty2:'testValue2',
			_testPrivateProperty1:'testPrivateValue1',
			testPrivateProperty2_:'testPrivateValue2'
	    });

		this.on('data', function (sender, data) {

			// here processing data from event service with name equal sender

		});
	}
	
	TestModel.prototype.testMethod = function (callback, someArg1, someArg2, someArg3) {
	    //processing args and invoke callback with result
		callback('hello world');
	};
	
	TestModel.prototype.testPrivateMethod_ = function (callback, someArg1, someArg2, someArg3) {
	    callback(someArg1 + someArg2 + someArg3);
	};
	
	TestModel.prototype.sendToEventServiceExample = function (serviceName, dataObject) {
	    this.emit('sendData', serviceName, dataObject);
	};

Controller example

	module.exports = TestController;
	
	var util = require('util');
	util.inherits(TestController, neutrino.mvc.ControllerBase);
	
	function TestController(config, modelFileName, model, view) {
	
	    neutrino.mvc.ModelBase.call(this, config, modelFileName, model, view);
	}
	
	TestController.prototype.accessValidator = function (sessionId, callback) {
	    // check user by sessionId for whole model access and invoke callback
		callback(new Error('Access denied'));
	};

	TestController.prototype.testProperty1GetValidtor = function(sessionId, callback){
		// check user by sessionId for model property get access
		callback(null);
	};

	TestController.prototype.testProperty1SetValidtor = function(newValue, sessionId, callback){
		// check user by sessionId for model property set access and new value validation
		callback(null);
	};

	TestController.prototype.testMethodInvokeValidator = function(sessionId, callback, 
		someArg1, someArg2, someArg3){
		// check user by sessionId for model method invoke access and invocation arguments
		callback(new Error('Wrong arguments'));
	};
	
Event service example

	module.exports = TestService;
	
	var util = require('util'),
	    events = require('events');
	
	util.inherits(TestService, events.EventEmitter);
	
	function TestService() {
	
	    var self = this;
	    events.EventEmitter.call(self);
	    setInterval(function () {
	
	        self.emit('data', 'testModelName', {
	            messageText:'testMessage' 
	        }); 
	        // this message object will be received by model with filename 'testModelName'
	    
	    	self.emit('data', null, {
	            messageText:'testMessage2' 
	        }); 
	        // this message object will be received by all models
	    
		}, 5000);
	}
	
	TestService.prototype.handleData = function (modelName,data) {
    	//processing data from any model
	};

Client-side usage example

	<html>
		<head>
			<!-- Use a master node address here -->
			<script src="http://localhost:8080/client.js"></script>
			
			<script>
				window.onload = function(){
					
					var client = new neutrino.ViewHubClient('http://localhost:8080');
					
					client.on('connect',function(address){
						alert('connected: '+address.host+':'+address.port);
					});
					
					client.on('reconnect',function(address){
						alert('reconnected: '+address.host+':'+address.port);
					});
					
					client.on('disconnect',function(){
						alert('disconnected');
					});
					
					client.subscribe('testModelFileName',
						function(propertyName,oldValue,newValue){
							console.log('testModelFileName changed:'+propertyName+' '+oldValue+'->'+newValue);
						},
						function(error){
							if(error){
								console.log(error);
							}else{
								console.log('subscribe success');
							}
						}
					);
					
					client.setValue('testModelFileName','setTestPropertyName',
						'hello world, random is '+Math.random(),function(error){

						if(error){
							console.log(error);
						}else{
							console.log('set success');
						}
					});

					client.invoke('testModelFileName','testMethodName',function(error,result){
						if(error){
							console.log(error);
						}else{
							console.log(result);
						}
					}, 'arg1Text','arg2Text','arg3Text');
					
					client.getModel('testModelFileName',function(error,model){
						if(error){
							console.log(error);
						}else{
							// here we have current model state object
							console.log(JSON.stringify(model));
						}
					});
				};
			</script>
		</head>
	
		<body>
			
		</body>
	</html>

##Project development

To be a contributor of this project, please read [Google JavaScript Style Guide](http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml) and follow the guide instructions before commit or pull request. To document new code please use [JsDoc toolkit](http://code.google.com/p/jsdoc-toolkit/) and its [tag reference](http://code.google.com/p/jsdoc-toolkit/wiki/TagReference).

Denis Rechkunov <denis.rechkunov@gmail.com>