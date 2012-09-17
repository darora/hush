var everyauth = require('everyauth'),
  db = require('./db'),
  conf = require('../conf').auth;
//global
everyauth.everymodule.findUserById( function (userId, callback) {
  db.findUserById(userId, callback);
});
everyauth.debug = true;

//fb
everyauth.facebook
  .appId(conf.fb.appId)
  .appSecret(conf.fb.appSecret)
  .handleAuthCallbackError( function (req, res) {
    // TODO
    console.log("callback error");

  })
  .findOrCreateUser( function (session, accessToken, accessTokExtra, fbUserMetadata) {
    var user = fbUserMetadata;
    user.type = 'fb';
    user.accessToken = accessToken;
    //expects promise
    currentAccessToken = accessToken;
    var promise = new this.Promise();
    db.findOrCreateUser(user, function(err, result){
      if (err) {
        console.log(err);
        return promise.fail(err);
      } else {
        return promise.fulfill(user);
      }
    });
    return promise;
  })
  .scope('email')
  .entryPath('/auth/facebook')
  .callbackPath('/auth/facebook/callback')
  .redirectPath('/');
everyauth.everymodule.handleLogout( function (req, res) {
  // The logout method is added for you by everyauth, too
  req.logout();
  return res.redirect('/');
});