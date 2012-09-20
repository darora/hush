/*global define:true */
define(['jquery','underscore','backbone', 'models', 'templates', 'utils'],
function($,_,Backbone, m, tmpl, utils){

// shorhand to check if a selector exists
$.fn.exists = function(){
  return this.length > 0;
};

// // Example of how to use the loader on any shit.
// $(function() {
//   setTimeout(function() {
//     var removeLoader = $("#posts_container").ajaxOverlay({
//       yFactor: 0.05,
//       background: "rgba(255, 0, 153, 0.5)"//because some men just wanna watch the world burn.
//     });
//     setTimeout(function() {
//       removeLoader();
//     }, 5000);
//   }, 1000);
// });

// # Views
var v = {};

// ## NavBar Navigation View
v.NavBar = Backbone.View.extend({
  el: "#navbar",
  initialize: function(options){
    _.bindAll(this, "filter", "search");
    this.view = options.view;
    this.active(this.view);
    this.searchBox = $("input#search_input");
    this.searchBox.on("keyup", this.filter)
      .on("keypress", this.search);
  },
  filter: function(e) {
    e.stopPropagation();
    this.$el.trigger("filter", this.searchBox.val());
    // that.collection.filterByString($(this).val());
  },
  search: function(e) {
    if (e.keyCode == 13) {
      e.stopPropagation();
      e.preventDefault();
      this.$el.trigger("search", this.searchBox.val());
    }
  },
  render: function(){},
  events: {
    "click .nav_link" : "nav"
  },
  nav: function(e){
    var view = $(e.target).attr('id');
    if (view == 'inviteFriends')
      this.sendInviteViaSelector();
    else
      this.$el.trigger('changeview', view);
  },
  active: function(view){
    if (view === search && $("#search_results").length == 0) {
      this.$el.append("<a href='#' class='nav_link active' id='search_results'>Search Results</a>");
    }
    else if ($("#search_results").length !== 0) {
      $("#search_results").remove();
    }
    $(".nav_link").each(function(index, elem){
      elem = $(elem);
      if (elem.attr("id") === view) {
        elem.addClass("active");
      } else {
        elem.removeClass("active");
      }
    });
  },
  sendInviteViaSelector: function() {
    FB.ui({
      method: 'apprequests',
      message: 'Discuss the important issues of the day, without any censorship'
    }, this.inviteCallback);
  },
  inviteCallback: function(res) {
    console.log(res);
    $.post('/saveInvites',{"request": res},function(data){
      console.log(data);
    });
  }
});

// ## Post Form View
v.Postform = Backbone.View.extend({
  // DOM element of the post form.
  el: '#postform',
  initialize: function(){
  },
  events: {
    "click a" : "submitpost",
    "focus textarea" : "focus",
    "keypress" : "keypress",
    "blur textarea" : "blur"
  },
  keypress: function(e){
    if (e.keyCode == 13 && e.shiftKey) {
      return true;
    } else if (e.keyCode == 13) {
      this.submitpost();
      e.stopPropagation();
      e.preventDefault();
      return false;
    }
  },
  focus: function(){
    this.$("textarea").height(100);
  },
  blur: function(){
    // this.$("textarea").height(20);
  },
  submitpost: function(){
    var postbody = this.$("textarea").val();

    // only POST if postbody !== ""
    if (!postbody) {
      // TODO.
      return;
    }

    var newpost = new m.Post({
      body: postbody
    });

    var that = this;
    newpost.save({}, {
      url:'/posts',
      type:'POST',
      success: function(model, response){
        // use mixpanel to track event.
        mixpanel.track("Someone posted something");

        // set id attribute.
        response.message.date = new Date(response.message.date);
        model.set(response.message);

        // trigger new post event.
        that.$el.trigger('newpost', model);
      },
      error: function(){
        //TODO.
      }
    });
    // Clear textarea.
    this.$("textarea").val("");
  }
});

// ## Posts View
v.PostsView = Backbone.View.extend({
  id: "posts_container",
  initialize: function(){
    var that = this;
    _.bindAll(this, "notifyupdate", "render", 'addpost');
    this.updateCount = 0;
    this.collection.on('add', this.addpost, this);
    this.collection.on('reset', this.render, this);
    this.collection.on('newposts', this.notifyupdate, this);
  },
  addpost: function(newpost){
    if (this.updateCount === 0) {
      // create individual postview.
      var postview = new v.PostView({model: newpost});
      
      // prepend to posts_container
      this.$el.prepend(postview.render().$el);
      
      // fade in
      postview.fadeIn();
    } else {
      this.render();
    }
  },
  notifyupdate: function(count) {
    if (count === 0) {
      return;
    }

    var previouscount = this.updateCount;
    this.updateCount += count;

    var notification = tmpl.newposts({count: this.updateCount});
    
    if (previouscount > 0) {
      this.$(".newposts").replaceWith(notification);
    } else {
      this.$el.prepend(notification);
    }
  },
  render: function(){
    //reset update count
    this.updateCount = 0;

    var fragment = document.createDocumentFragment();
    this.collection.each(function(post){
      // create individual postview.
      var postview = new v.PostView({model: post});

      // append to document fragment.
      fragment.appendChild(postview.render().el);
    });

    // replace $el.html() with fragment.
    this.$el.html(fragment);

    //var overlay = this.$el.ajaxOverlay();
    setTimeout(function() {
      $('.postbody').dotdotdot({
        height: 200,
        after: "a.read-more"
      });
    }, 1000);


    return this;
  },
  events: {
    "click .newposts" : "render"
  }
});

// ## Individual Post View
v.PostView = Backbone.View.extend({
  className: "post",
  initialize: function(options){
    _.bindAll(this, 'render', 'fadeIn', 'share', 'renderflash');
    // Bind change in model to render event.
    this.model.on('change', this.render, this);
    this.model.on('updated', this.renderflash, this);
    this.model.on('destroy', this.destroy, this);
    this.renderedAttachments = false;
    this.commentsIsVisible = options.commentsIsVisible;
  },
  destroy: function(){
    this.remove();
  },
  renderflash: function(){
    this.render();
    var that = this;
    this.$el.addClass('flash');
    setTimeout(function(){
      that.$el.removeClass('flash');
    }, 500);
    
  },
  render: function(){
    this.model.updateDate();



    if (this.$el.find(".commentformwrapper").length === 0) {
      this.$el.html(tmpl.post(this.model.toJSON()));
    }
    else {
      var comment = this.$el.find(".commentformwrapper input").eq(0).val();
      this.$el.html(tmpl.post(this.model.toJSON()));
      this.$el.find(".commentformwrapper input").eq(0).val(comment);
    }
    var that = this;

    // hack for search
    var visibility = this.model.get("visibility");
    if (visibility === true) {
      this.$el.css("opacity", 1);
      this.$el.removeClass("visibility-hidden");
    }
    else {
      this.$el.stop();
      this.$el.animate({opacity: 0}, 500, 'swing', function() {
        that.$el.addClass("visibility-hidden");
      });
      
    }

    var bodyText = this.$el.text();

    // detect URLs and make them links
    var obj = utils.parseURL(bodyText, [], function() {});
    _(obj.matches).each(function(m) {
      that.$el.html(that.$el.html().replace(m, "<a href='"+m+"'>"+m+"</a>"));
    });

    bodyText = this.$el.text();
    obj = {};
    obj = utils.imageURL(bodyText, [], function() {});
    _(obj.matches).each(function(m) {
      that.$el.html(that.$el.html().replace(m, ""));
      that.$el.find(".img-wrap").eq(0).append("<a href='"+m.substring(1)+"' rel='shadowbox'><img width='80' height='80' src='"+m.substring(1)+"'/></a>");
    });


    // comments view.
    var commentswrapper = this.$(".commentswrapper");
    this.commentsview = new v.CommentsView({
      collection: this.model.comments
    }).render();
    this.$(".commentscontainer").html(this.commentsview.el);

    // show/hide comments based on state.
    if (this.commentsIsVisible) {
      commentswrapper.show();
    } else {
      commentswrapper.hide();
    }
    
    var p = this.$el.find('.postbody').eq(0);
      p.dotdotdot({
        height: 200,
        after: "a.read-more"
      });
    
    if (this.model.hasVoted('upvotes') === true) {
      this.$(".upvote").css('opacity',0.4);

    }
    
    if (this.model.hasVoted('downvotes') === true) {
      this.$(".downvote").css('opacity',0.4);
    }
    return this;
  },
  fadeIn: function() {
    this.$el
    .css("opacity", 0)
    .animate(
      {"opacity": 1},
      600,
      'swing',
      function() {
        $('.postbody').dotdotdot();
      });
  },
  events: {
    "click .commentsubmit" : "commentsubmit",
    "keypress .commentform" : "commentkeypress",
    "click .commentbutton" : "showcomments",
    "dblclick" : "showsinglepostview",
    "click .upvote": "upvote",
    "click .downvote": "downvote",
    "hover .upvote": "underlineup",
    "hover .downvote": "underlineup",
    "click .sharebutton": "share",
    "click .deletebutton": "deletepost"
  },
  deletepost: function(){
    if (confirm('archive post?')) {
      this.model.deletepost();
    }
  },
  share: function() {
    var that = this;
    FB.api(
      '/me/hush_app:interested_in',
      'post',
      { entry: this.model.getOGurl() },
      function(res) {
        if (!res || res.error)
          console.log("Error posting to FB");
        else
          console.log("Posted to FB");
      }
    );
    FB.ui({
      method: 'feed',
      link: this.model.getOGurl(),
      // # WOAH hardcoded URL ftw
      picture: "http://hush.darora.com/images/hushlogo.png",
      caption: "An anonymous post on Hush",
      description: "I found a post on Hush interesting, and I think you will too!"

    }, function(res) {
      if (!res || res.error)
        console.log("Error posting to FB");
      else {
        console.log("Posted to FB");
        $.ajax({
          type: 'POST',
          url: '/share',
          data: {
            type: 'increment',
            post_id: that.model.get('_id')
          },
          success: function(res){
            console.log(res);
            console.log(that.model.toJSON());
          }
        });
      }
        
    }
         );
  },
  showsinglepostview: function(){
    // trigger showsinglepostview event.
    this.$el.trigger("showsinglepostview", this.model);
  },
  showcomments: function(){
    var commentswrapper = this.$(".commentswrapper");
    if (commentswrapper.is(":visible")) {
      commentswrapper.slideUp();
      this.commentsIsVisible = false;
    } else {
      commentswrapper.slideDown();
      this.commentsIsVisible = true;

      // focus comment field
      this.$(".commentform").focus();
    }
  },
  commentkeypress: function(e){
    if (e.keyCode === 13) {
      this.commentsubmit();
    }
  },
  commentsubmit: function(){
    var commentbody = this.$(".commentform").val();
    
    // only POST if commentbody !== ""
    if (!commentbody) {
      // TODO.
      return;
    }

    var newcomment = new m.Comment({
      body: commentbody,
      post_id: this.model.id
    });

    var that = this;
    newcomment.save({}, {
      success: function(model, response){
        mixpanel.track("Commented on a post", {post_id: that.model.get("id")});
        that.model.comments.add(model);

        // reset comment box.
        that.$(".commentform").val("");
      },
      error: function(){
        //TODO
      }
    });
  },
  upvote: function(){
    if(this.model.hasVoted('upvotes')===false){
      //console.log('upvote');
      this.model.upvote();
      this.$('.upvote').css('opacity','0.4');
    }
    else {
      this.model.undoVote('upvote');
      //console.log('undo upvote');
      this.$('.upvote').css('opacity','1.0');
    }

  },
  downvote: function(){
    if(this.model.hasVoted('downvotes')===false){
      this.model.downvote();
      this.$('.downvote').css('opacity','0.4');
    } else {
      this.model.undoVote('downvote');
      this.$('.downvote').css('opacity','1.0');
    }

  },
  underlineup: function(e){
    $(e.currentTarget).toggleClass('underline-vote');
  }
});

// ## Single Post View (as in only one post on the page.)
v.SinglePostView = Backbone.View.extend({
  id: "singlepostview",
  initialize: function(){

  },
  render: function(){
    var postview = new v.PostView({
      model: this.model,
      commentsIsVisible: true
    });
    this.$el.html(postview.render().el);
    return this;
  }
});

// ## Comments View
v.CommentsView = Backbone.View.extend({
  initialize: function(){
    this.collection.on('add', this.addcomment, this);
    this.collection.on('reset', this.render, this);
  },
  addcomment: function(newcomment){
    // create individual comment.
    newcomment.updateDate();
    var comment = new v.CommentView({model: newcomment});

    // append.
    this.$el.append(comment.render().el);

    //If this is the first comment, create the comments well ;)
    if (this.collection.models.length == 1)
      this.render();
    else
      window.Shadowbox.init();
  },
  render: function(){
    var fragment = document.createDocumentFragment();
    
    if (this.collection.length !== 0 ) {
      this.collection.each(function(comment){
        var commentview = new v.CommentView({model: comment});
        comment.updateDate();
        fragment.appendChild(commentview.render().el);
      
      });
      this.$el.html(fragment);
    }
    return this;
  }
});

// ## Comment View.
v.CommentView = Backbone.View.extend({
  className: "comment",
  initialize: function(){
    // Bind change in model to render event.
    this.model.on('change', this.render, this);
  },
  render: function(){
    var that = this;
    var modelStr = this.model.toJSON();
    //this.tmp = JSON.parse(modelStr);
    var obj = utils.imageURL(modelStr["body"], [], function() {});
    modelStr["body"] = utils.escape({text: modelStr["body"]});
    this.$el.html(tmpl.comment(modelStr));
    _(obj.matches).each(function(m) {
      that.$el.html(that.$el.html().replace(m, ""));
      that.$el.find('.commentbody').eq(0).append("<a href='"+m.substring(1)+"' rel='shadowbox'><img width='80' height='80' src='"+m.substring(1)+"'/></a>");
    });

    return this;
  }
});

v.NotificationsView = Backbone.View.extend({
  clicked:false,
  el:'#notifications',
  initialize: function(){
    // bind external clicks to close notifications view.
    this.bindclose();
    
    _.bindAll(this, 'render');
    this.collection.on('reset',this.render, this);
    this.collection.on('add',this.render, this);
    this.collection.on('updatecount', this.updatecount, this);
  },
  updatecount: function(){
    if (this.collection.pending === 0) {
      this.$(".number").remove();
    } else {
      this.$(".icon").html(tmpl.number({count: this.collection.pending}));
    }
  },
  bindclose: function(){
    var that = this;
    $(document).mouseup(function(e){
        var container = that.$el;
        if (container.has(e.target).length === 0){
          that.$('.notificationswrapper').hide();
        }
    });
  },
  render: function(notif){
    if (this.collection.length === 0) {
      this.$(".contents").html(tmpl.nonotifications());
    } else {
      var fragment = document.createDocumentFragment();
      this.collection.each(function(notification){
        var x = new v.NotificationView({model: notification});
        fragment.appendChild(x.render().el);
      });
      this.$(".contents").html(fragment);
      this.updatecount();
    }
    return this;
  },
  events: {
    "click .icon" : "shownotifications",
    "notificationselected" : "notificationselected"
  },
  notificationselected: function(){
    this.$('.notificationswrapper').hide();
  },
  shownotifications: function(){
    this.$('.notificationswrapper').show();
    this.collection.updateViewed();
  }

});

v.NotificationView = Backbone.View.extend({
  className: "notification",
  initialize: function(){
  },
  render: function(){
    this.$el.html(tmpl.notification(this.model.toJSON()));
    return this;
  },
  events: {
    "click" : "notificationselected"
  },
  notificationselected: function(){
    this.$el.trigger("notificationselected", this.model);
  }
});


return v;
});