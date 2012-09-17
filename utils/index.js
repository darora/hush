// UTILITY FUNCTIONS
var auth = require('../conf').auth;
var _ = require('underscore');

var relativeTime = {
	future : "in %s",
	past : "%s ago",
	s : "a few seconds",
	m : "a minute",
	mm : "%d minutes",
	h : "an hour",
	hh : "%d hours",
	d : "a day",
	dd : "%d days",
	M : "a month",
	MM : "%d months",
	y : "a year",
	yy : "%d years"
};

var readabledate = function(dateobj){
	var milliseconds = Date.now() - dateobj.getTime(),
		seconds = Math.round(Math.abs(milliseconds) / 1000),
		minutes = Math.round(seconds / 60),
		hours = Math.round(minutes / 60),
		days = Math.round(hours / 24),
		years = Math.round(days / 365),
		
		args =	seconds < 45 && "a few seconds" ||
				minutes === 1 && "a minute" ||
				minutes < 45 && minutes + " minutes" ||
				hours === 1 && "an hour" ||
				hours < 22 && hours + " hours" ||
				days === 1 && "a day" ||
				days <= 25 && days + " days" ||
				days <= 45 && "a month" ||
				days < 345 && Math.round(days / 30) + " months" ||
				years === 1 && "a year" || years + " years";
	return args + " ago";
};

var isadmin = function(fbid){
	var admins = [
		"540642211", // div
		"500275482", // ben
		"1423912466", //jack
		"1046605279", // michael
		"660293626" // omer
	];

	var found = _.find(admins, function(admin){
		return admin == fbid;
	});

	if (found) {
		return true;
	} else {
		return false;
	}
};

//Mobile detection
var ismobile = function(req){
  var ua = req.header('user-agent');
  var mobile = /mobile/i.test(ua);
  return mobile;
};

//Basic Views Variables
var bootstrap = function(req){
	var x = {};
	
	x.env = process.env.NODE_ENV == "production" ? "prod" : "dev";
	x.useragent = ismobile(req);
	x.title = "Hush";

	x.app_id = auth.fb.appId;

	//everyauth view helpers dont work.
	//bootstrap user obj to view variable.
	x.loggedIn = req.loggedIn;
	if (req.loggedIn) {
		x.user = req.user;
		x.user.isadmin = isadmin(req.user.id);
	}
	return x;
};

//exports
exports.ismobile = ismobile;
exports.isadmin = isadmin;
exports.bootstrap = bootstrap;
exports.readabledate = readabledate;