if( require.resolve( 'sidbuild2' ) && require('sidbuild2') !== this ) {
	module.exports = require('sidbuild2');
} else {
	module.exports = require('./lib/sidbuild2mock');
}