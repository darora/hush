//TODO::cut out the require config into a separate file & then use it instead of hardlinking to jquery file 
require.config({
  paths: {
    'jquery': "libs/jquery-1.8.0",
    'underscore': "libs/underscore",
    'backbone': "libs/backbone",
    'app' : "scripts/app",
    'views' : "scripts/views",
    'templates' : "templates/template",
    'models' : "scripts/models"
  }
});
require(['jquery'],
       function($) {
         FB.init({
           appId  : window.appID,
           frictionlessRequests: true
         });

         //TODO::Need to add in an appropriate invite message
         var sendInviteViaSelector = function() {
           FB.ui({
             method: 'apprequests',
             message: 'Discuss the important issues of the day, without any censorship'
           }, inviteCallback);
         };
         
         // TODO::We need to start recording these requests, so we can delete them once the user authorizes the application
         var inviteCallback = function(res) {
           console.log(res);
           $.post('/saveInvites',{"request": res},function(data){
            console.log(data);
           });
           window.close();
         };

         $(function() {
           setTimeout(function() {
             sendInviteViaSelector();
           }, 1000);
         });

       });
