var merge = require('deepmerge')
	, util = require("util")
	, path = require('path')
	, os = require('os')
	, EventEmitter = process.EventEmitter
	, instance;

function Constants() {

	EventEmitter.call(this);

	var buildServerHostNames = ['ubuntu-build-agent-1','ubuntu-build-agent-2'];
	var currentDeploymentPointer = 0;

	this.env = {
		DEVELOPMENT: 'dev'
		, STAGING: 'stg'
		, PRODUCTION: 'prd'
	};

	this.config = {
		verbose: true
		, isBuildServer: buildServerHostNames.indexOf( os.hostname() ) > -1
		, build: {
			number:-1
		}
		, buildInfo: path.resolve( __dirname, '../config/build.info.json' )
		, deploy: {
			source: 'deploy'
		}
	};
	this.timestamp = Math.round( ( new Date() ).getTime() / 1000 );

	this.getNextDeploymentConfiguration = function() {
		var config = this.config.deploy[ this.config.env ][ currentDeploymentPointer ];

		// server configuration only
		// keeps one default auth pair at index 0
		if( this.config.isBuildServer ) {
			var serverConfig = this.config.deploy[ this.config.env ][ 0 ];
			config.user = serverConfig.user;
			config.port = serverConfig.port;
			config.privateKey = serverConfig.privateKey;
			config.passphrase = serverConfig.passphrase;
		}

		currentDeploymentPointer++;
		return config;
	}

	this.merge = function( aConfig ) {
		this.config = merge( this.config, aConfig );
	};


	this.getEnvConfig = function( aEnv ) {
		// return 
	}

	this.log = function( ) {
		if( this.config.verbose ) {
			console.log.apply( this, arguments );
		}
	};

}

util.inherits( Constants, EventEmitter );


module.exports = {
	getInstance: function() {
		return instance || ( instance = new Constants() );
	}
};