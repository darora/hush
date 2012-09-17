var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;
var utils = require('../utils');

// User Schema
var user = new mongoose.Schema({
	id: {type: String, unique: true},
  name: String,
  username: String,
  email: String,
  gender: String,
  accessToken: String,
  first_name: String,
  last_name: String
});

// Comment Schema
var comment = new mongoose.Schema({
  body: String,
  date: {
    type: Date,
    "default": Date.now
  },
  authorId: ObjectId
});
// readable date method.
comment.methods.readabledate = function(){
  return utils.readabledate(this.date);
};

//Notification Schema
var notifications = new mongoose.Schema({
  user_id: ObjectId,
  triggering_user_id: ObjectId,
  post_id: ObjectId,
  post_summary: String,
  action: String,
  date: {
    type: Date,
    "default": Date.now
  },
  viewed: {
    type: Boolean,
    "default": false
  }
});

// Post Schema
var post = new mongoose.Schema({
  body: String,
  date: {
    type: Date,
    "default": Date.now
  },
  authorId: ObjectId,
  comments: [comment],
  upvotes: [vote],
  downvotes: [vote],
  ranking:Number,
  last_voted: {
    type: Date,
    "default": Date.now
  },
  share_count: {
    type: Number,
    "default": 0
  },
  archived: {
    type: Boolean,
    "default": false
  }
});

var vote = new mongoose.Schema({
  voter_id: ObjectId,
  date: {
    type: Date,
    "default": Date.now
  }
});
post.methods.readabledate = function(){
  return utils.readabledate(this.date);
};

// Friends Schema
var friends = new mongoose.Schema({
  user_id: {type: ObjectId, unique: true},
  friends: [ObjectId]
});

// Request Schema
var requests = new mongoose.Schema({
  request: String,
  to: [String]
});

// Indices
user.index({
  id: 1
});
comment.index({
  date: 1
});
post.index({
  date: 1
});
post.index({
  authorId: 1
});
notifications.index({
  date: 1
});
notifications.index({
  user_id: 1
});
notifications.index({
  viewed: 1
});
friends.index({
  user_id: 1
});


// Module Exports
exports.user = user;
exports.friends = friends;
exports.post = post;
exports.comment = comment;
exports.requests = requests;
exports.notifications = notifications;
exports.vote = vote;