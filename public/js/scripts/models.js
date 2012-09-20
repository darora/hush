/*global define:true */
define(['jquery', 'underscore', 'backbone'],
function($,_,Backbone){

// # Models
var m = {};

// Date methods
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
m.readabledate = function(dateobj){
  var milliseconds = Date.now() - dateobj.getTime(),
    seconds = Math.round(Math.abs(milliseconds) / 1000),
    minutes = Math.round(seconds / 60),
    hours = Math.round(minutes / 60),
    days = Math.round(hours / 24),
    years = Math.round(days / 365),
    
    args =  seconds < 45 && "a few seconds" ||
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

// ## Comment Backbone Model
m.Comment = Backbone.Model.extend({
  initialize: function(){
    this.set("lowercaseBody", this.get('body').toLowerCase());
    this.set({'date': new Date(this.get('date'))});
    this.set({"lowercaseBody": this.get('body').toLowerCase()});
  },
  // ### Defaults for Comment Model.
  // *underscore templates throw error for undefined interpolated variables.*
  defaults: function(){
    return {
      body: "",
      lowercaseBody: "",
      date: new Date()
    };
  },
  idAttribute: "_id",
  updateDate: function(){
    this.set({'readabledate': m.readabledate(this.get('date'))});
  },
  urlRoot: "/comments"
});

// ## Comments Backbone Collection
m.Comments = Backbone.Collection.extend({
  model: m.Comment,
  initialize: function() {
    _.bindAll(this, "search");
  },
  search: function(str) {
    return _(this.models).any(function (model) {
    return (model.get("lowercaseBody").indexOf(str) != -1);
    });
  }
});

// ## URL Attachment BB, completely frontend only
m.attachment = Backbone.Model.extend({
  defaults: function() {
    return {
      url: "",
      content: ""
    };
  }
});

m.attachments = Backbone.Collection.extend({
  model: m.attachment,
  initialize: function() {
    
  }
});

// ## Post Backbone Model
m.Post = Backbone.Model.extend({
  initialize: function(){
    _.bindAll(this, "update", "filterByString", 'getOGurl');
    this.comments = new m.Comments(this.get('comments'));
    this.set({
      'body': this.get('body')
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;"),
      'date': new Date(this.get('date')),
      'last_voted': this.get('last_voted') ? new Date(this.get('last_voted')) : new Date(this.get('date')),
      'lowercaseBody': this.get('body').toLowerCase(),
      'numberofcomments' : this.comments.length
    }, {silent: true});
    this.comments.on('all', this.updatecommentscount, this);
    this.adminhook();
  },
  adminhook: function(){},
  deletepost: function(){
    var that = this;
    $.ajax({
      type: 'DELETE',
      url: '/posts',
      data: {
        post_id: this.id
      },
      dataType: "json",
      success: function(res){
        if (res.status == "success") {
          that.trigger('destroy', that);
        }
      }
    });
  },
  // ### Defaults for Post Model.
  // *underscore templates throw error for undefined interpolated variables.*
  defaults: function(){
    return {
      body: "",
      admin: false,
      lowercaseBody: "",
      numberofcomments: 0,
      date: new Date(),
      comments: [],
      visibility: true,
      _id: "",
      upvotes: [],
      downvotes: [],
      share_count: 0
    };
  },
  getOGurl: function() {
    return "http://"+document.domain+"/post?post_id="+this.get("_id");
  },
  idAttribute: "_id",
  updatecommentscount: function(){
    this.set({'numberofcomments': this.comments.length});
  },
  updateDate: function(){
    this.set({'readabledate': m.readabledate(this.get('date'))});
  },
  update: function(changes){
    this.set(_.pick(changes, "body"));
    this.set({
      'body': this.get('body')
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
    });
    this.comments.reset(changes.comments);
    this.set({
      upvotes: changes.upvotes,
      downvotes: changes.downvotes,
      share_count: changes.share_count,
      ranking: changes.ranking,
      last_voted: new Date(changes.last_voted)
    }, {silent: true});
    this.trigger('updated');
  },
  getlatest: function(){
    var latest = this.get('date').getTime();
    this.comments.each(function(comment){
      var commenttime = comment.get('date').getTime();
      if (commenttime > latest) {
        latest = commenttime;
      }
    });
    
    var lastvote = this.get('last_voted').getTime();
    if (lastvote > latest){
      latest = lastvote;
    }
    return latest;
  },
  urlRoot: "/posts",
  filterByString: function(str) {
    if (this.get("lowercaseBody").indexOf(str) != -1 || this.comments.search(str) === true)
      this.set("visibility", true);
    else
      this.set("visibility", false);
  },
  upvote: function(){
    var that = this;
    console.log(that.get('_id'));
    $.ajax({
      type: 'POST',
      url: '/vote',
      data: {
        type: 'upvote',
        post_id:that.get('_id')
      },
      success: function(res){
        console.log(res);
        console.log(that.get('upvotes'));
      }
    });
  },
  downvote: function(){
    var that = this;
    console.log(that.get('_id'));
    $.ajax({
      type: 'POST',
      url: '/vote',
      data: {
        type: 'downvote',
        post_id:that.get('_id')
      },
      success: function(res){
        console.log(res);
        console.log(that.toJSON());
      }
    });
  },
  undoVote: function(type){
    var that = this;
    $.ajax({
      type: 'POST',
      url: '/vote',
      data: {
        type: 'undo-'+type,
        post_id: that.get('_id')
      },
      success: function(res){
        //console.log(res);
        //console.log(that.toJSON());
      }
    });
  },
  hasVoted: function(type){
    var flag = false;
    _.each(this.get(type),function(vote){
      if(vote.voter_id===window.user_id){
        flag = true;
      }
    });
    return flag;
  }
});

// ## Posts Backbone Collection
m.Posts = Backbone.Collection.extend({
  model: m.Post,
  initialize: function(models){
    _.bindAll(this, 'updateDates', 'update', 'filterByString', 'getLast');
    this.on('reset', this.getLast, this);
    this.on('destroy', this.destroypost, this);
    this.updateDates();
  },
  destroypost: function(post){
    this.remove(post);
  },
  getLast: function(){
    var last = 0;
    this.each(function(post){
      var posttime = post.getlatest();
      if (last < posttime) {
        last = posttime;
      }
    });
    this.lasttime = last;
  },
  comparator: function(post){
    if (this.view === "mostpopular") {
      return -post.get("ranking");
    } else {
      return -post.get("date");
    }
  },
  filterByString: function(str) {
    str = str.toLowerCase();
    this.each(function(post) {
      post.filterByString(str);
    });
  },
  updateDates: function(){
    this.each(function(post){
      // update date for post
      post.updateDate();

      // update date for comments as well
      post.comments.each(function(comment){
        comment.updateDate();
      });
    });
    this.timeoutId = setTimeout(this.updateDates, 2000);
  },
  update: function(view){
    //change the current view.
    this.view = view;
    var that = this;
    $.ajax({
      type: 'GET',
      url: '/posts',
      data: {
        type: "all",
        view: that.view
      },
      success: function(response){
        if (response.status === "success") {
          var posts = response.results;
          that.reset(posts);

          
        } else if (response.status === "error") {
          //TODO.
        }
      },
      dataType: "json"
    });
  }
});

m.Notification = Backbone.Model.extend({
  idAttribute: "_id",
  initialize: function(){
    var action;
    if (this.get('action') === 'comment') {
      action = "Someone commented on a post you commented on";
    } else {
      action = "Someone commented on your post";
    }

    var date = new Date(this.get('date'));
    this.set({
      'action': action,
      'date': date,
      'readabledate' : m.readabledate(date)
    });
  },
  defaults: {
    post_summary: ""
  }
});

m.Notifications = Backbone.Collection.extend({
  model: m.Notification,
  initialize: function(){
    _.bindAll(this, "countnew", "latest");
    this.on('add', this.countnew, this);
    this.on('reset', this.countnew, this);
    this.on('change', this.countnew, this);
  },
  countnew: function(){
    var count = 0;
    _.each(this.models, function(notification){
      if (!notification.get('viewed')) {
        count++;
      }
    });
    this.pending = count;
    this.trigger('updatecount');
  },
  updateViewed: function(){
    var that = this;
    that.each(function(notification){
      notification.set('viewed',true);
    });
    
    var notificationIds = _.pluck(that.toJSON(),'_id');

    if (notificationIds.length === 0) {
      return;
    }

    $.ajax({
      type: 'POST',
      url: '/notifications',
      data: {
        notificationIds: notificationIds
      },
      dataType: "json",
      success: function(res){
        if (res.status === "success") {

        } else {
          //TODO

        }
      }
    });
  },
  latest: function(){
    var latest;
    _.each(this.models, function(notification){
      var notificationtime = notification.get('date').getTime();
      if (!latest || notificationtime > latest) {
        latest = notificationtime;
      }
    });
    return latest;
  }
});
return m;
});