//TODO::cut out the require config into a separate file & then use it instead of hardlinking to jquery file 
require.config({
	paths: {
		'jquery': "../libs/jquery-1.8.0",
		'underscore': "../libs/underscore"
	}
});
require(['jquery', 'underscore'],
       function($, _) {
         FB.init({
           appId  : window.appID,
           frictionlessRequests: true
         });

         //TODO::Need to add in an appropriate invite message
         // var sendInviteViaSelector = function() {
         //   FB.ui({
         //     method: 'apprequests',
         //     message: 'Discuss the important issues of the day, without any censorship'
         //   }, inviteCallback);
         // };

         // var inviteCallback = function(res) {
         //   console.log(res);
         // };
         
         var getURLParameter = function(name) {
           return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
         };
         
         $(function() {
           var ids = getURLParameter("ids");
           ids = ids.replace(/%2C/ig, ",");
           ids = ids.split(",");
           //fire off requests, then close after all responses are in
           this.ln = ids.length;
           this.counter = 0;
           var that = this;
           _(ids).each(function(id, index) {
             FB.api(id, 'delete', function(res) {
               that.counter++;
             });
           });
           //while (this.counter < this.ln);
         });

       });
