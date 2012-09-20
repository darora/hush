/*global require:true */
require.config({
	paths: {
		'jquery': "libs/jquery-1.8.0",
		'utils': "jqutils",
		'underscore': "libs/underscore",
		'backbone': "libs/backbone",
		'app' : "scripts/app",
		'views' : "scripts/views",
		'templates' : "templates/template",
		'models' : "scripts/models"
	}
});
require(['app'],
function(App){
	var x = new App();
	x.start();
  window.Shadowbox.init();
});