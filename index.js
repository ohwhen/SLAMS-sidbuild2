try {
	module.exports = require('sidbuild2');
} catch( e ) {
	
} finally {
	module.exports = require('./lib/sidbuild2mock');
}