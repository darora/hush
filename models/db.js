var mongoose = require('mongoose');
var schemas = require('./schemas');
var objectId = mongoose.Types.ObjectId;
var async = require('async');
var _ = require('underscore');
var request = require('request');

// Connect to MongoDB at `localhost`
var db = mongoose.createConnection('localhost','connections');

// Error Handling
db.on('error', console.error.bind(console,'Connection Error'));

// Connection to DB established
db.once('open', function(){
  // # Mongoose schemas
  // ## Compile schemas to mongoose models
  var User = db.model('User', schemas.user);
  var Post = db.model('Post', schemas.post);
  var Friends = db.model('Friends', schemas.friends);
  var Requests = db.model('Requests',schemas.requests);
  var Notifications = db.model('Notifications',schemas.notifications);

  var UPDATE_RANK_INTERVAL = 10000;
  /*setInterval(function(){
    updatePostRanking();

  },UPDATE_RANK_INTERVAL);*/
  // # Everyauth functions
  // ## Creates a new User document
  var createUser = function(user, callback){
    User.create(user, function(err, res){
      if (err) {
        console.log(err);
        return callback(err, {});
      }
      
      // Create user's friend graph.
      userFriends(res, function(err, result){
        if (err) {
          // handle error
          // TODO
        }
      });

      return callback(null, res);
    });
  };
  
  // ## Finds user by facebook id. Yep, **facebookid**
  // **Warning, use methods that use facebook id with caution.**
  // **Anonymity shouldn't be compromised**
  // Only used by `everyauth`
  exports.findUserById = function(userId, callback){
    User.findOne({id: userId}, null, function(err, result){
      if (err) {
        console.log(err);
        return callback(err, {});
      }
      return callback(null, result);
    });
  };
  
  // ## Finds a user by facebook id
  // Creates one if non-existent.
  // Only used by `everyauth`
  exports.findOrCreateUser = function(user, callback){
    User.findOne({id: user.id}, null, function(err, result){
      if (err) {
        console.log(err);
        return callback(err, {});
      } else if (!result) {
        // If user does not exist, createuser.
        return createUser(user, callback);
      } else {
        // If user exists, return user object.
        User.update({id: user.id}, user, function(err, result){
          if (err) {
            console.log(err);
            return callback(err, {});
          }
          
          // update friend graph
          userFriends(user, function(err, res){
            if (err) {
              // handle error
              // TODO
            }
          });

          return callback(null, result);
        });
      }
    });
  };
  
  // ## Adds User's Friends (called by `createUser` function)
  var userFriends = function(user, callback){
    request({
      url: "https://graph.facebook.com/" + user.id + "/friends",
      qs: {
        "access_token" : user.accessToken
      },
      json: true
    }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var friends = body.data;
      
      var friends_id_array = _.pluck(friends, "id");
      
      User
        .find({id: {$in: friends_id_array}})
        .select("_id")
        .exec(function(err, result){
          if (err) {
            console.log(err);
            return callback(err, {});
          }

          // get an array of "user._id"
          var friends_in_app = _.pluck(result, "_id");
          
          // # Create Friends Entry for User
          Friends.update(
            {user_id : user._id},
            {
              user_id : user._id,
              friends : friends_in_app
            },
            {upsert: true},
            function(err, result){
              if (err) {
                console.log(err);
                return callback(err, {});
              }
            }
          );
          // Update Friends of User.
          Friends.update(
            {user_id : {$in: friends_in_app}},
            {$addToSet : {friends: user._id}},
            function(err, result){
              if (err) {
                console.log(err);
                return callback(err, {});
              }
            }
          );
        });
    }
    });
  };

  // # Post Functions
  // ## Creates New Post
  exports.createNewPost = function(user, postbody, callback){
    Post.create({
      body: postbody,
      // Notice the use of `_id` instead of **facebook Id** here
      authorId: user._id
    }, function(err, result){
      if (err) {
        console.log(err);
        return callback(err, {});
      }

      // We never return authorId to the client.
      var returnobj = {
        body: result.body,
        _id: result._id,
        comments : result.comments,
        date: result.date,
        readabledate: result.readabledate()
      };
      
      return callback(null, returnobj);
    });
  };

  exports.archivePost = function(post_id, callback){
    Post
      .update(
        {_id: post_id},
        {"archived": true},
        function(err, result){
          if (err) {
            console.log(err);
            return callback(err, {});
          }
          return callback(null, result);
        });
  };

  // ## Make comment
  exports.addCommentToPost = function(user, postId, commentText, callback){
    Post.update(
      {_id: postId},
      {
        $push: {
          comments: {
            body: commentText,
            authorId: user._id
          }
        }
      }, function(err, result){
        if (err) {
          console.log(err);
          return callback(err, {});
        }

        // return reponse here.
        // but dont return.
        callback(null, result);

        Post.findOne({_id:postId},function(err,post){
          if(err){
            console.log(err);
          }
          
          // store postSummary first 50 characters.
          var postSummary = post.body.substring(0, 50);

          // notify other commenters
          // we only want the unique set of user_ids
          var notifyUserIdArray = _.unique(
            _.pluck(post.comments, "authorId"),
            false,
            function(id){
              return String(id);
            }
          );
          _.each(notifyUserIdArray, function(notifyUserId){
            var triggeringUserId = user._id;
            
            var isAuthor = String(notifyUserId) === String(post.authorId);
            var isSelf = String(triggeringUserId) == String(notifyUserId);
            if (isSelf || isAuthor) {
              // same user or is author.
              // no notification.
              return;
            }

            //create notification.
            createNotification(
              triggeringUserId,
              notifyUserId,
              postId,
              postSummary,
              NOTIFICATION_TYPES[0].type,
              function(err, result){
                if (err) {
                  console.log(err);
                }
              });
          });

          // notify author of post
          if (post.authorId !== user._id) {
            var triggeringUserId = user._id;
            var notifyUserId = post.authorId;

            //create notification.
            createNotification(
              triggeringUserId,
              notifyUserId,
              postId,
              postSummary,
              NOTIFICATION_TYPES[1].type,
              function(err, result){
                if (err) {
                  console.log(err);
                }
              });
          }
        });
    });
  };

  // # Notifications

  // ## Notification types
  var NOTIFICATION_TYPES = [
    {
      type: "comment",
      description: "someone comments on a post you commented on."
    },
    {
      type: "post",
      description: "someone comments on your post."
    }
  ];

  var createNotification = function(triggeringUserId, notifyUserId, postId, postSummary, action, callback){
    // prevent self notifications.
    if (String(triggeringUserId) == String(notifyUserId)) {
      return;
    }

    Notifications
      .create({
        user_id: notifyUserId,
        triggering_user_id: triggeringUserId,
        post_id: postId,
        post_summary: postSummary,
        action: action
      }, function(err,result) {
        if (err) {
          console.log(err);
          return callback(err,{});
        }
        return callback(null,result);
    });
  };

  exports.viewedNotification = function(notificationIds, callback){
    var notifObjectIds = _.map(notificationIds, function(each){
      return objectId(each);
    });

    Notifications
      .update(
        {_id: {$in: notifObjectIds}},
        {$set: {viewed: true}},
        {multi: true},
        function(err,result) {
          if (err) {
            console.log(err);
            return callback(err, {});
          }
          return callback(null, result);
        });
  };

  exports.getNotifications = function(user, callback){
    Notifications
      .find({user_id: user._id})
      .sort('viewed')
      .sort('-date')
      .limit(number) // max notifications..
      .exec(function(err, results){
        if (err) {
          console.log(err);
          return callback(err, {});
        }
        return callback(null, results);
      });
  };

  exports.getNotificationsDelta = function(user, last, callback){
    Notifications
      .find({user_id: user._id})
      .find({'date': {$gt : last}})
      .where("viewed", false)
      .sort('-date')
      .limit(50) // max notifications..
      .exec(function(err, results){
        if (err) {
          console.log(err);
          return callback(err, {});
        }
        return callback(null, results);
      });
  };

  // default number of posts per query
  var number = 20;

  // ## Get All Posts
  exports.getAllPosts = function(skip, callback){
    Post
      .find({
        $or: [
          {"archived" : false},
          {"archived": {$exists: false}}
        ]
      })
      .skip(skip)
      .limit(number)
      // sort by date
      .sort('-date')
      // don't return any information about the author
      .select('-authorId')
      .exec(function(err, results){
        if (err) {
          console.log(err);
          return callback(null, {});
        }
        return callback(null, results);
      });
  };

  // ## Get Posts By User
  exports.getPostsByUser = function(user, skip, callback){
    Post
      .find({
        authorId: user._id,
        $or: [
          {"archived" : false},
          {"archived": {$exists: false}}
        ]
      })
      .skip(skip)
      .limit(number)
      .sort('-date')
      .select('-authorId')
      .exec(function(err, results){
        if (err) {
          console.log(err);
          return callback(err, {});
        }
        return callback(null, results);
      });
  };

  // ## Get Single Post (by `Object_Id`)
  exports.getPost = function(postId, callback){
    Post.findOne({_id: postId}, function(err, result){
      if (err) {
        console.log(err);
        return callback(err, {});
      }
      return callback(null, result);
    });
  };
  
  // ## Get posts by Friends.
  exports.getPostsByFriends = function(user, skip, callback){
    // First get the Friend document corresponding to user_id
    Friends
      .findOne({user_id: user._id})
      .exec(function(err,result){
        if (err) {
          console.log(err);
          return callback(err, {});
        }
        //Get Posts by friends
        Post
          .find({
            authorId: {$in: result.friends},
            $or: [
              {"archived" : false},
              {"archived": {$exists: false}}
            ]
          })
          .sort('-date')
          .select('-authorId')
          .limit(number)
          .skip(skip)
          .exec(function(err,posts){
            if (err) {
              console.log(err);
              return callback(err, {});
            }
            return callback(null, posts);
          });
      });
  };
  
  // ## Gets deltas of posts given an array of post_ids and date
  exports.getPostsDelta = function(last, posts_id_array, callback){
    //console.log(last);
   // console.log(posts_id_array);
    Post
      .find({_id: {$in: posts_id_array},
      $or: [
        {comments: {$elemMatch:{date:{$gt: last}}}},
        {last_voted: {$gt: last}}
        ]
      })
      //.where('comments').elemMatch({date: {$gt: last}})
      .select('-authorId')
      .exec(function(err, results){
          if (err) {
            console.log("db getPostsDelta");
            console.log(err);
            return callback(err, {});
          }
          callback(null, results);
      });
  };

  // ## Gets All Posts **since `last`**
  exports.getAllPostsNew = function(last, callback){
    Post
      .find({
        'date': {$gt : last},
        $or: [
          {"archived" : false},
          {"archived": {$exists: false}}
        ]
      })
      .limit(number)
      // sort by date
      .sort('-date')
      // don't return any information about the author
      .select('-authorId')
      .exec(function(err, results){
        if (err) {
          console.log(err);
          return callback(null, {});
        }
        return callback(null, results);
      });
  };

  // ## Get posts by Friends. **since `last`**
  exports.getPostsByFriendsNew = function(user, last, callback){
    // First get the Friend document corresponding to user_id
    Friends
      .findOne({user_id: user._id})
      .exec(function(err,result){
        if (err) {
          console.log(err);
          return callback(err, {});
        }
        //Get Posts by friends
        Post
          .find({
            authorId: {$in: result.friends},
            'date': {$gt : last},
            "archived" : {$exists: false}
          })
          .limit(number)
          .sort('-date')
          .select('-authorId')
          .limit(number)
          .exec(function(err,posts){
            if (err) {
              console.log(err);
              return callback(err, {});
            }
            return callback(null, posts);
          });
      });
  };

  // ## Get Posts By User **since `last`**
  exports.getPostsByUserNew = function(user, last, callback){
    Post
      .find({
        authorId: user._id,
        'date': {$gt : last},
        "archived" : {$exists: false}
      })
      .limit(number)
      .sort('-date')
      .select('-authorId')
      .exec(function(err, results){
        if (err) {
          console.log(err);
          return callback(err, {});
        }
        return callback(null, results);
      });
  };
 

  // # FB Friend App Request
  exports.deleteRequestForUser = function(user,callback){
    exports.findRequestByUser(user,function(err,requests){
      _.each(requests,function(request){
        request.to = _.without(request.to,user.id);
        request.save(function(err,result){
          if(err){
            console.log(err);
            return callback(err,{});
          }
          return callback(null,result);
        });
    });
    });
  };

  exports.findRequestByUser = function(user,callback){
    Requests
      .find({to: user._id})
      .exec(function(err,results){
        if(err){
          console.log(err);
          return callback(err,{});
        }
        return callback(null,results);
      });
  };

  exports.saveRequest = function(request,callback){
    Requests.create(request,function(err,result){
      if(err){
        console.log(err);
        return callback(err,{});
      }
      return callback(null,result);
    });
  };

  // # Voting
  // ## add an upvote to a post
  exports.upvote = function(user,postId,callback){
    Post
      .update({_id: postId},
        {$addToSet: {
          upvotes: {
            voter_id: user._id
          }
        },
         last_voted: Date.now()
        },
        function(err,result){
          if(err){
            console.log(err);
            return callback(err,{});
          }
          updatePostRanking();
          return callback(null,result);
        });
  };
  exports.undoUpvote = function(user,postId,callback){
    Post
      .update({_id: postId},
        {$pull: {
          upvotes: {
            voter_id: user._id
          }
        },
        last_voted: Date.now()
        },
        function(err,result){
          if(err){
            console.log(err);
            return callback(err,{});
          }
          updatePostRanking();
          return callback(null,result);
        });
  };
  exports.undoDownvote = function(user,postId,callback){
    Post
      .update({_id: postId},
        {$pull: {
          downvotes: {
            voter_id: user._id
          }
        },
        last_voted: Date.now()
        },
        function(err,result){
          if(err){
            console.log(err);
            return callback(err,{});
          }
          updatePostRanking();
          return callback(null,result);
        });
  };
  exports.downvote = function(user,postId,callback){
    Post
      .update({_id: postId},
        {$addToSet: {
          downvotes: {
            voter_id: user._id
            }
          },
            last_voted: Date.now()
          },
        function(err,result){
          if(err){
            console.log(err);
            return callback(err,{});
          }
          updatePostRanking();
          return callback(null,result);
        });
  };
  var evalRank = function(date,upvotes,downvotes,share_count,commentLength){
    var gravity = 1.8;//magic number from hacker news
    return (upvotes - downvotes-1+share_count+commentLength+1)/(Math.pow((Date.now() - date)*1000*60*60,gravity));
  };


  var updatePostRanking = function(){
    var stream = Post.find().stream();
    var t1 = Date.now();
    stream.on('data',function(post){
      post.ranking = evalRank(post.date,post.upvotes.length,post.downvotes.length,post.share_count,post.comments.length);
      post.save(function(err,res){
        if(err){
          console.log('update Ranking error');
          console.log(err);
        }
      });
    }).on('error',function(err){
      console.log(err);
    }).on('close',function(){
      var t2 = Date.now();
      console.log('Stream took');
      console.log(t2-t1);
    });
  };

  exports.getPostsByRanking = function(callback){
    Post
      .find({})
      .sort('-ranking')
      // don't return any information about the author
      .limit(number)
      .select('-authorId')
      .exec(function(err, results){
        if (err) {
          console.log(err);
          return callback(null, {});
        }
        return callback(null, results);
      });
  };

  exports.incrementPostShare = function(post_id,callback){
    Post
      .update({_id: post_id},
      {
        $inc: {
          share_count: 1
        }
      },
      function(err,results){
        if(err){
          console.log(err);
          return callback(err,{});
        }
        return callback(null,results);
      });
  };

});
