var path = require('path');

module.exports = {
	cache: true,
	debug: true,
	devtool: 'source-map',
	entry: {
		gravis: './src/main.js'
	},
	output: {
		path: __dirname,
		filename: 'dist/[name].js'
	},
	module: {
	  loaders: [
		  { test: /\.json$/, loader: 'json' },
		  {
			  test: /\.js[x]?$/,
			  exclude: /(node_modules|bower_components)/,
			  loader: 'babel?presets[]=es2015'
		  }
	  ]
	},
	resolve: {
		extensions: ['', '.js', '.jsx'],
		modulesDirectories: ["./src", "node_modules"]
	}
};
