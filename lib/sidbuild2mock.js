(function () {
	// EXTERNAL LIBS
	var fs = require( 'fs' )
		, util = require( 'util' )
		, exec = require('child_process').exec
		, async = require('async')
		, os = require('os')
		, path = require('path')
		, fsx = require('fs-extra')
		, buildify = require('buildify')
		, data = require('./config').getInstance()

		, argv = require('optimist').default({ 
			env: 'dev'
			, s: false
		})
		.usage('Usage: $0 --env [dev/stg/prd] --cmd [build/deploy|migrate] -s [true/false]')
    	.demand(['cmd'])
		.argv;



	var env = {
		DEVELOPMENT: 'dev'
		, STAGING: 'stg'
		, PRODUCTION: 'prd'
	};

	var config;
	var queue = [];
	var sid = {
		constants: data
		, buildify: buildify
	};

	/**
	 * Sets default configuration as defined in triggering
	 * build script
	 * @param  {object} aConfig Configuration object
	 * @return {object} this
	 */
	sid.default = function( aConfig ){
		data.merge( aConfig );
		return sid;
	};

	/**
	 * Initialized the build script
	 * @param  {Function} aCallBack Callback that triggers custom builds in build.js
	 * @return {void}
	 */
	sid.init = function( aCallback ) {
		data.merge( argv );

		var q = [];
		q.push( readConfiguration );
		q.push( initConfiguration );

		// maybe conditional when
		// in actual 'deploy' argv mode
		q.push( setupDirectories );

		// callback to build.js (entry point) script
		// to execute custom build tasks
		q.push(function( aNext ) {
			aCallback( argv.env );
		});

		async.waterfall( q );

		return sid;
	};

	/**
	 * Adds a task to the execution queue
	 * @param {function} aFn task function
	 * @return {object}	this
	 */
	sid.add = function( aFn, aArgs ) {
		queue.push( { fn: aFn, args: aArgs } );
		return sid;
	};

	/**	 * Executes queued tasks
	 * @return {object} this
	 */
	sid.run = function( aNext ) {
		if( queue.length == 0 ) {
			console.info("No tasks queued.");
			return sid;
		}

		queue.push( 
			{ fn: 
				function( aNext ) {
					console.info('\nDone executing build: '+data.config.name );
					process.exit( 0 );
				}
			}
		);

		var commands = [];

		var item;
		for( var i = 0; item = queue[ i++ ]; ) {

			if( item.args != undefined ) {
				commands.push( async.apply( item.fn, item.args ) );
			} else {
				commands.push( item.fn );
			}
		}

		async.waterfall(
			commands
		);
	};

	sid.deploy = {
		run: function( aNext ) {

		}
	};


	/**
	 * Reads in configuration file,
	 * preloads server config (parts of module)
	 * then merges with project config
	 * @param  {Function} aNext Queued callback
	 * @return {void}
	 */
	var readConfiguration = function( aNext ) {

		var init = true;
		// 
		if( fsx.existsSync( data.config.project ) ) {
			data.log( '[Info]  Loading config:  '+data.config.project );
			var projectConfigContent = fs.readFileSync( data.config.project, 'utf8' );
			data.merge( JSON.parse( projectConfigContent ) );
		} else {
			var dir = path.dirname( data.config.project );
			if( !fsx.existsSync( dir ) ) {
				fsx.mkdirsSync( dir );
			}

			console.error("\n[Error] No project configuration found at: ", data.config.project);
			console.error("[Info]  Creating.. ", data.config.project);
			var projectConfigPath = path.resolve( __dirname, '../config/templates/config.project.json');
			fsx.copyFileSync( projectConfigPath, data.config.project );
			init = false;
		}

		if( fsx.existsSync( data.config.user ) ) {
		data.log( '[Info]  Loading config: '+data.config.user );
			var userConfigContent = fs.readFileSync( data.config.user, 'utf8' );
			data.merge( JSON.parse( userConfigContent ) );

		// only create config.user if we are not executing
		// on a build agent
		} else if( !data.config.isBuildServer ) {
			var dir = path.dirname( data.config.user );
			if( !fsx.existsSync( dir ) ) {
				fsx.mkdirsSync( dir );
			}
			console.error("\n[Error] No user configuration found at: ", data.config.user);
			console.error("[Info]  Creating.. ", data.config.user);
			var userConfigPath = path.resolve( __dirname, '../config/templates/config.user.json');
			fsx.copyFileSync( userConfigPath, data.config.user );
			init = false;	
		}

		if( !init ) {
			console.info("\n\n[Info]  Please modify the newly created config files before running the build script again.");
			process.exit( 1 );
		}

		// read in from build.info.json
		console.info('\nsidBuild2 0.0.1' );
		// l( data.config );
		aNext();
	}

	/**
	 * Finalizes configuration
	 * Overriding build agent specific paths
	 * if needed
	 * @return {void}
	 */
	var initConfiguration = function( aNext ) {
		console.info([
			'\n"'+data.config.name+'" (build.'+data.config.build.number+')'
			, 'on: '+ os.hostname()+','
			, 'NodeJS v.'+process.versions.node
		].join(' '));

		var nodeVersion = process.versions.node.split('.');
		if( 
			parseInt( nodeVersion[ 0 ], 10 ) >= 0
			&& parseInt( nodeVersion[ 1 ], 10 ) >= 8 
			&& parseInt( nodeVersion[ 1 ], 10 ) >= 7
		) {

		} else {
			console.info( "Please install a node version of v0.8.7 or newer, to run this script.");
			process.exit( 1 );
		}


		switch( os.hostname() ) {
			case 'ubuntu-build-agent-1':
				break;
			default:
				break;
		}
		aNext();
	};

	var setupDirectories = function( aNext ) {
		data.config.deploy.sourcePrefix = data.config.deploy.source+'_'+data.config.env;
		data.config.deploy.source = data.config.deploy.source+'_'+data.config.env

		if( !fsx.existsSync( data.config.source ) ) {
			console.error( '[FATAL]', data.config.source, 'does not exist.');
			process.exit( 1 );
		}
		
		fsx.copy( data.config.source, data.config.deploy.source, function(err){
			if( err ) {
				throw err;
			} else {
				data.log('[Info]  OUTPUT', path.resolve( data.config.deploy.source ), '\n' );
				aNext();
			}
		});
	};


	// process fallbacks
	// process.on('exit', function () {
	// 	console.info('exit: cleaning up.');
	// 	cleanUp();
	// });

	// process.on('uncaughtException', function (err) {
	// 	console.log('\n[FATAL]  Caught exception: ', err.stack);
	// 	process.exit( 1 );
	// });



	// Hook into commonJS module systems
	if( typeof( module ) !== 'undefined' && 'exports' in module ) {
		module.exports = sid;
	}


})();