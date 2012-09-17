var utils = require('../utils');
var db  = require('../models/db');
var auth = require('../conf').auth;
var _ = require('underscore');
var async = require('async');
var https = require('https');
var http = require('http');
var request = require('request');


/**
* LOGIN FILTERS
*/
exports.isLoggedIn = function (req,res,next) {
  if (req.loggedIn){
    return next();
  } else {
    return res.redirect('/welcome');
  }
};

/**
* REQUEST HANDLERS
*/

// # GET
// ## Langing Page

// Separate route for FB invitations.
// This way we don't have to include fb js on other pages
// -- thus avoiding information leakage.
// exports.inviteFriends = function(req, res) {
//   var variables = utils.bootstrap(req);
//   variables.fbAppId = auth.fb.appId;
//   res.render("inviteFriends", variables);
// };

exports.search = function(req, res) {
  var variables = utils.bootstrap(req);

  var searchstring = req.query.search_string;
  if (searchstring === "") {
      return res.json({
        status: "error",
        message: "please enter a search string :)"
      });
  }

  var search_string = req.sanitize('search_string').entityEncode();

  var url = 'http://localhost:9200/connections/posts/_search?q=' + search_string;

  request({
    url: url,
    json: true
  }, function(err, response, body){
    if (err) {
      console.log(err);
      return res.json({
        status: "error"
      });
    }
    var results = body.hits.hits;
    return res.json({
      status: "success",
      hits: sanitizeSearchResults(results)
    });
  });
};

var sanitizeSearchResults = function(results) {
  var sanitizer = function(obj) {
    obj["authorId"] = "you're not getting it this easy";
    return obj;
  };
  
  results = _(results).map(function(res) {
    res["_source"] = sanitizer(res["_source"]);

    _(res["_source"]["comments"]).map(function(comment){
      return sanitizer(comment);
    });

    return res;
  });

  return results;
};

// #### Search Results
exports.searchResults = function(req, res){
  var variables = utils.bootstrap(req);
  
  var search_string = req.sanitize("search_string").entityEncode();
  
  var url = 'http://localhost:9200/connections/posts/_search?q=' + search_string;
  
  request({
    url: url,
    json: true
  }, function(err, response, body){
    if (err) {
      console.log(err);
      return res.json({
        status: "error"
      });
    }
    var results = body.hits.hits;

    results = sanitizeSearchResults(results);
    results = _.pluck(results, "_source");

    db.getNotifications(req.user, function(err, notifications){
        // pass posts to `jade` file for rendering.
        variables.bootstrap = {
          view: "search",
          last: Date.now(),
          posts: results,
          admin: variables.user.isadmin,
          notifications: notifications
        };
        res.render("main", variables);
      });
  });
};


exports.handleFBrequests = function(req, res) {
  var variables = utils.bootstrap(req);
  variables.fbAppId = auth.fb.appId;
  res.render("handleInvites", variables);
};

exports.postView = function(req, res) {
  var v = utils.bootstrap(req);
  v.entry = {};
  v.app_id = auth.fb.appId;
  var post_id = req.sanitize('post_id').entityEncode();
  db.getPost(post_id, function(err, results) {
    if (err || !results) {
      console.log(err);
      return res.json({
        status: "error",
        message: "An error occured while trying to find the post you requested"
      });
    }
    v.entry.description = results.body;
    v.entry.title = "Awesome Post on Hush!";
    v.entry.image = "http://"+req.headers.host+"/images/hushlogo.png";
    v.entry.url = "http://"+req.headers.host+"/post?post_id=" + post_id;
    v.entry.comments = results.comments;
    console.log(results);
    return res.render('graph/post', v);
  });
};

exports.fetchURL = function(req, res) {
  var variables = utils.bootstrap(req);
  variables.fbAppId = auth.fb.appId;
  var url = req.sanitize('url').xss();
  var parsedURL = url.match(/.*\/\/([^\/ ]*)\/?(.*)/);
  
  var matched = "http://" + parsedURL[1] + '/'+ parsedURL[2];
  
  // plug
  return res.json({
    status: "success",
    content: 'other',
    url: url
  });

  // request({
  //   url: matched
  // }, function(err, response, body){
  //   if (response.headers['content-type'].indexOf('image/') != -1) {
  //       res.json({
  //         status: "success",
  //         content: 'image',
  //         body: body,
  //         url: url
  //       });
  //   } else {
  //     res.json({
  //       status: "OK",
  //       content: 'other',
  //       body: body,
  //       url: url
  //     });
  //   }
  // });
};

exports.landing = function(req, res){
  var variables = utils.bootstrap(req);
  variables.appid = auth.fb.appId;
  res.render("landing", variables);
};

// ## Main Application Page
// ### Main Backbone Application.
exports.allposts = function(req, res){
  var variables = utils.bootstrap(req);

  // Get all posts from db
  db.getAllPosts(0, function(err, results){
    if (err) {
      console.log(err);
      return res.send("An error occured. So sorry.");
    }
    db.getNotifications(req.user, function(err, notifications){
      // pass posts to `jade` file for rendering.
      variables.bootstrap = {
        view: "allposts",
        last: Date.now(),
        posts: results,
        admin: variables.user.isadmin,
        notifications: notifications
      };
      res.render("main", variables);
    });
  });
};

// #### Friends Feed
exports.friends = function(req, res){
  var variables = utils.bootstrap(req);
  // Get all posts from db
  db.getPostsByFriends(req.user, 0, function(err, results){
    if (err) {
      console.log(err);
      return res.send("An error occured. So sorry.");
    }
    db.getNotifications(req.user, function(err, notifications){
      // pass posts to `jade` file for rendering.
      variables.bootstrap = {
        view: "friends",
        last: Date.now(),
        posts: results,
        admin: variables.user.isadmin,
        notifications: notifications
      };
      res.render("main", variables);
    });
  });
};

// #### Your Wall
exports.yourwall = function(req, res){
  var variables = utils.bootstrap(req);
  // Get all posts from db
  // db.getAllPosts(0,function(err, results){
  db.getPostsByUser(req.user, 0, function(err, results){
    if (err) {
      console.log(err);
      return res.send("An error occured. So sorry.");
    }
    db.getNotifications(req.user, function(err, notifications){
      // pass posts to `jade` file for rendering.
      variables.bootstrap = {
        view: "yourwall",
        last: Date.now(),
        posts: results,
        admin: variables.user.isadmin,
        notifications: notifications
      };
      res.render("main", variables);
    });
  });
};

// ### Single Post View OR API call.
exports.singlepostview = function(req, res){
  var variables = utils.bootstrap(req);
  // Get all posts from db
  // db.getAllPosts(0,function(err, results){
  var post_id = req.sanitize('post_id').entityEncode();
  db.getPost(post_id, function(err, results){
    if (err) {
      console.log(err);
      return res.send("An error occured. So sorry.");
    }

    //return json
    if (req.xhr) {
      return res.json(results);
    }

    db.getNotifications(req.user, function(err, notifications){
      // pass posts to `jade` file for rendering.
      variables.bootstrap = {
        view: "singlepostview",
        last: Date.now(),
        posts: [results],
        admin: variables.user.isadmin,
        notifications: notifications
      };
      res.render("main", variables);
    });
  });
};

// official policies, crap, etc.
exports.policies = function(req, res) {
  var variables = utils.bootstrap(req);
  res.render("policies", variables);
};

// # API Calls
// ## Posts callback to create new posts
exports.createpost = function(req, res){
  // Retrieve POST data
  // If any user content goes into scripts, we need to use .xss() as well!!
  var postbody = req.sanitize('body').xss();

  // Create new post in db.
  db.createNewPost(req.user, postbody, function(err, result){
    if (err) {
      return res.json({
        "status": "error"
      });
    }

    return res.json({
      "status": "success",
      "message" : result
    });
  });
};

// ## Get Posts
exports.getposts = function(req, res){
  // query type.
  var type = req.query.type;
  var view = req.query.view;
  if (type === "all") {
    if (view === "allposts") {
      db.getAllPosts(0, function(err, results){
        if (err) {
          console.log(err);
          return res.json({
            status: "error",
            message: "An error occured. So sorry."
          });
        }
        return res.json({
          status: "success",
          results: results
        });
      });
    } else if (view === "friends") {
      db.getPostsByFriends(req.user, 0, function(err, results){
        if (err) {
          console.log(err);
          return res.json({
            status: "error",
            message: "An error occured. So sorry."
          });
        }
        return res.json({
          status: "success",
          results: results
        });
      });
    } else if(view === "mostpopular"){
      db.getPostsByRanking(function(err,results){
        if(err){
          console.log(err);
          return res.json({
            status: "error",
            message: "Oops"
          });
        }
        return res.json({
          status: "success",
          results: results

        });
      });
    } else if (view === "yourwall") {

      db.getPostsByUser(req.user, 0, function(err, results){
        if (err) {
          console.log(err);
          return res.json({
            status: "error",
            message: "An error occured. So sorry."
          });
        }
        return res.json({
          status: "success",
          results: results
        });
      });
    }
  } else if (type === "delta") {
    // store timestamp of req to prevent timeouts.
    req.timestamp = new Date().getTime();
    longPollingDeltaChanges(req, res);
  } else {
    res.json({
      status: "error",
      message: "unknown type."
    });
  }
};

exports.deletepost = function(req, res){
  var post_id = req.body.post_id;
  var isadmin = utils.isadmin(req.user.id);

  if (post_id && isadmin) {
    db.archivePost(post_id, function(err, result){
      if (err) {
        console.log(err);
        return res.json({
          status: "error"
        });
      }
      return res.json({
        status: "success"
      });
    });
  } else {
    return res.json({
      status: "error"
    });
  }

};

var longPollingDeltaChanges = function(req, res){
  var posts_id_array = req.query.posts_id_array;
  var view = req.query.view;
  var last = req.query.last;
  var last_notification = req.query.last_notification;
  last_notification = new Date(parseInt(last_notification, 10));
  last = new Date(parseInt(last, 10));

  // close out requests older than 30 seconds
  var expiration = new Date().getTime() - 30000;
  if (req.timestamp < expiration) {
    return res.json({
      status: "success",
      delta: [],
      results: []
    });
  }
  if (posts_id_array === undefined) {
    return res.json({
      status: "error",
      message: "posts_id_array is undefined",
      code:"post_id_array_undefined"
    });
  }
  db.getPostsDelta(last, posts_id_array, function(err, delta){
    if (err) {
      console.log('delta error');
      console.log(err);
      return res.json({
        status: "error",
        message: "An error occured. So sorry."
      });
    }
    if (view === "allposts") {
      db.getAllPostsNew(last, function(err, results){
        if (err) {
          console.log(err);
          return res.json({
            status: "error",
            message: "An error occured. So sorry."
          });
        }
        
        db.getNotificationsDelta(req.user, last_notification, function(err, notifications){
          if (err) {
            console.log(err);
            console.log('notif delta error');
            return res.json({
              status: "error",
              message: "An error occured. So sorry."
            });
          }
          // if no new results, wait.
          if (delta.length === 0 && results.length === 0 && notifications.length === 0) {
            setTimeout(function(){
              longPollingDeltaChanges(req, res);
            }, 1000);
            return;
          }
          return res.json({
            status: "success",
            delta: delta,
            notifications: notifications,
            results: results
          });
        });
      });
    } else if (view === "friends") {
      db.getPostsByFriendsNew(req.user, last, function(err, results){
        if (err) {
          console.log(err);
          return res.json({
            status: "error",
            message: "An error occured. So sorry."
          });
        }

        db.getNotificationsDelta(req.user, last_notification, function(err, notifications){
          if (err) {
            console.log(err);
            return res.json({
              status: "error",
              message: "An error occured. So sorry."
            });
          }
          // if no new results, wait.
          if (delta.length === 0 && results.length === 0 && notifications.length === 0) {
            setTimeout(function(){
              longPollingDeltaChanges(req, res);
            }, 1000);
            return;
          }
          return res.json({
            status: "success",
            delta: delta,
            notifications: notifications,
            results: results
          });
        });
      });
    } else if (view === "yourwall") {
      db.getPostsByUserNew(req.user, last, function(err, results){
        if (err) {
          console.log(err);
          return res.json({
            status: "error",
            message: "An error occured. So sorry."
          });
        }
        
        db.getNotificationsDelta(req.user, last_notification, function(err, notifications){
          if (err) {
            console.log(err);
            return res.json({
              status: "error",
              message: "An error occured. So sorry."
            });
          }
          // if no new results, wait.
          if (delta.length === 0 && results.length === 0 && notifications.length === 0) {
            setTimeout(function(){
              longPollingDeltaChanges(req, res);
            }, 1000);
            return;
          }
          return res.json({
            status: "success",
            delta: delta,
            notifications: notifications,
            results: results
          });
        });
      });
    } else if (view ==='mostpopular') {
      db.getPostsByRanking(function(err,results){
        if (err) {
          console.log(err);
          return res.json({
            status: "error",
            message: "Oops"
          });
        }
        db.getNotificationsDelta(req.user, last_notification, function(err, notifications){
          if (err) {
            console.log(err);
            return res.json({
              status: "error",
              message: "An error occured. So sorry."
            });
          }

          results = _.filter(results, function(post){
            var oldpost = _.find(posts_id_array, function(existing_post_id){
              return String(existing_post_id) === String(post._id);
            });
            return !oldpost;
          });

          // if no new results, wait.
          if (delta.length === 0 && results.length === 0 && notifications.length === 0) {
            setTimeout(function(){
              longPollingDeltaChanges(req, res);
            }, 1000);
            return;
          }
          return res.json({
            status: "success",
            delta: delta,
            notifications: notifications,
            results: results
          });
        });
      });
    }
  });
};

exports.notifications = function(req, res){
  var type = req.query.type;
  if(type==="start"){
    db.getNotifications(req.user,req.user.last_visit,function(err,result){
      if(err){
        console.log(err);
        return res.json({
          status: "error",
          message: "Oops"
        });
      }
      return res.json({
        status: "success",
        results: result
      });
    });
  }
  else if(type === "poll" && (req.query.delta !== undefined)){
    db.getNotifications(req.user,req.query.delta, function(err,results){
      if(err){
        console.log(err);
        return res.json({
          status: "error",
          message: "Oops"
        });
      }
      return res.json({
        status: "success",
        results: results
      });
    });
  }
  else{
    return res.json({
      status:"error",
      message:"Unknown type"
    });
  }
};

exports.updateNotifications = function(req, res){
  var notifications = req.body.notificationIds;
  db.viewedNotification(notifications, function(err, result){
    if (err) {
      return res.json({
        status: "error",
        message:"Oops"
      });
    }
    return res.json({
      status: "success"
    });
  });
};

// ## Comments callback to create new comment
exports.comments = function(req, res){
  // Retrieve POST data
  // If any user content goes into scripts, we need to use .xss() as well!!
  var commentbody = req.sanitize('body').xss();
  var postid = req.sanitize('post_id').entityEncode();

  db.addCommentToPost(req.user, postid, commentbody, function(err, result){
    if (err) {
      return res.json({
        "status" : "error"
      });
    }
    return res.json({
      "status": "success"
    });
  });
};


// # Persist a request object, so we can delete them later
exports.saveRequest = function(req,res){
  db.saveRequest(req.body.request,function(err,result){
    if (err) {
      return res.json({
        "status": "error"
      });
    }
    return res.json({
        "status": "success",
        "message": result
      });
    
  });
};

exports.deleteRequest = function(req,res){
  //find all request objects according to user's fbid
  db.findRequestByUser(req.user,function(err,requests){
    //for each request, sent an HTTP delete to fb graph
    async.forEach(requests,
      function(request,callback){
        var options = {
          host: "graph.facebook.com",
          path: request.request+"_"+req.user.id+'/'+req.user.accessToken,
          method: 'DELETE'
        };
        https.request(options,function(res){
          //if http delete is successful. delete user from that request.to
          console.log(JSON.stringify(res));
          db.deleteRequestForUser(req.user,function(err,result){
            if(err){
              console.log(err);
              return callback(err);
            }
            return callback(err);
          });
          
        }).on('error',function(e){
          console.log(e.message);
          return callback(err);
        });
      },

      function(err){
        if(err){
          console.log(err);
          return res.json({
            "status": "error"
          });
        }
        return res.json({
            "status": "done"
          });
        });
      
  });
};

//#Deprecated
exports.getLatestPosts = function(req,res){

  db.getPostsByTime(req.user,req.query.now,req.query.last,function(err,posts){
    if(err) {
      console.log(err);

      return res.json({
        "status": "error"
      });
    }
    return res.json({
      "status": "success",
      "message": posts
    });
  });
};

//# adds an upvote or downvote to a post
exports.vote = function(req,res){
  if(req.body.type==='upvote'){
    console.log('postid');
    console.log(req.body.post_id);
    db.upvote(req.user,req.body.post_id,function(err,result){
      if(err){
        console.log(err);
        return res.json({
          "status": "error"
        });
      }
      return res.json({
        "status": "success",
        "message": result
      });
  });
  }
  else if(req.body.type==='downvote'){
    db.downvote(req.user,req.body.post_id,function(err,result){
      if(err){
        console.log(err);
        return res.json({
          "status": "error"
        });
      }
      return res.json({
        "status": "success",
        "message": result
      });
  });
  }
  else if(req.body.type==='undo-upvote'){
    db.undoUpvote(req.user,req.body.post_id,function(err,result){
      if(err){
        console.log(err);
        return res.json({
          "status": "error"
        });
      }
      return res.json({
        "status": "success",
        "message": result
      });
    });
  }
  else if(req.body.type==='undo-downvote'){
    db.undoDownvote(req.user,req.body.post_id,function(err,result){
      if(err){
        console.log(err);
        return res.json({
          "status": "error"
        });
      }
      return res.json({
        "status": "success",
        "message": result
      });
    });
  }
  else {
    return res.json({
      "status": "error",
      "message": "unknown type"
    });
  }
};

exports.mostpopular = function(req,res){
    var variables = utils.bootstrap(req);
    db.getPostsByRanking(function(err,results){
      if(err){
        console.log(err);
        return res.send("Sorry an error occured");
      }
      db.getNotifications(req.user, function(err, notifications){
        // pass posts to `jade` file for rendering.
        variables.bootstrap = {
          view: "mostpopular",
          last: Date.now(),
          posts: results,
          admin: variables.user.isadmin,
          notifications: notifications
        };
        res.render("main", variables);
      });
    });

};
exports.share = function(req,res){
  if(req.body.type==="increment"){
    db.incrementPostShare(req.body.post_id,function(err,results){
      if(err){
        console.log(err);
        return res.json({
          status: "error"
        });
      }
      return res.json({
        status: "success",
        message: results
      });
    });
  }
};
