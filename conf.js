// # Auth variables
var auth = function(){
	if (process.env.NODE_ENV == "production") {
		// Use Production App API Keys
    throw "Please configure Facebook Application ID & Secret and remove this statement from /conf.js";
		return {
			fb: {
				appId: '',
				appSecret: ''
			}
		};
	} else {
		// Use Dev App API Keys
		return {
			fb: {
				appId: '',
				appSecret: ''
			}
		};
	}
};

exports.auth = auth();