var fs = require('fs');
var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var everyauth = require('everyauth');
var auth = require('./models/auth');
var _ = require('underscore');
var validator = require('express-validator');

var redis = _.find(process.argv, function(arg){
  return arg === "--noredis";
});

var logFile = fs.createWriteStream("./exp.log", {flags: 'a'});

var app = express();
app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(validator);
  app.use(express.logger({stream:logFile}));
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('@asdf@werqt*3@$!'));
  // use redis unless --noredis flag is passed
  if (redis) {
    app.use(express.session());
  } else {
    var redisstore = require('connect-redis')(express);
    var sessionstore = new redisstore();
    app.use(express.session({
      store: sessionstore,
      cookie: {maxAge: 1000*60*60*24*14}
    }));
  }
  app.use(everyauth.middleware());
  app.use(app.router);
  app.use(express["static"](path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

// ROUTES
var routes_filter = [routes.isLoggedIn];

// GET
app.get('/welcome', routes.landing);
app.get('/', routes_filter, routes.allposts);
app.get('/allposts', routes_filter, routes.allposts);
app.get('/friends', routes_filter, routes.friends);
app.get('/yourwall', routes_filter, routes.yourwall);
app.get('/mostpopular',routes_filter,routes.mostpopular);
app.get('/posts/:post_id', routes_filter, routes.singlepostview);

// API Calls
app.get('/posts', routes_filter, routes.getposts);
app.delete('/posts', routes_filter, routes.deletepost);
app.get('/notifications',routes_filter,routes.notifications);
app.post('/posts', routes_filter, routes.createpost);
app.post('/comments', routes_filter, routes.comments);
app.post('/notifications',routes_filter,routes.updateNotifications);
app.post('/vote',routes_filter,routes.vote);
app.post('/share',routes_filter,routes.share);

app.post('/fetchURL', routes_filter, routes.fetchURL);

app.get('/post', routes.postView);

// TMP ROUTE
app.get('/policies', routes.policies);

app.get('/search', routes.search);
app.get('/search/:search_string', routes_filter, routes.searchResults);
// Facebook invites stuff
// app.get('/invite', routes_filter, routes.inviteFriends);
app.get('/handleInvites', routes.handleFBrequests);
app.get('/deleteInvites',routes.deleteRequest);
app.post('/saveInvites',routes.saveRequest);

// Start Application
http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});