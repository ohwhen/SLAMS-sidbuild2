if( require.resolve( 'sidbuild2' ) ) {
	module.exports = require('sidbuild2');
} else {
	module.exports = require('./lib/sidbuild2mock');
}