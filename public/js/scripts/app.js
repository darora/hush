/*global define:true, bootstrap _gaq mixpanel */
define([
  'jquery',
  'underscore',
  'backbone',
  'models',
  'views',
  'templates',
  'utils'
],
function($, _, Backbone, m, v, tmpl, utils){
  // logout event
  $("#logout").on("click", function(){
    FB.logout(function(response){
      // hush logout.
      window.location = "/logout";
    });
  });

  // Backbone Router
  var AppRouter = Backbone.Router.extend({
    initialize: function(options){
      this.parent = options.parent;
    },
    routes: {
      ":view" : "views"
    },
    sanitize: function(path){
      return path.replace(/\//g, "-").replace(/ /g, "").toLowerCase();
    },
    navigateto: function(){
      var path = _.map(arguments, function(arg){
        return this.sanitize(arg);
      },this);

      this.navigate(path.join("/"));
    }
  });
  var App = Backbone.View.extend({
    el: "#container",
    initialize: function() {
      _.bindAll(this, "start", 'changeview', 'searchByString');

      //app router
      this.router = new AppRouter({parent: this});
    },
    start: function(){
      this.bootstrap = bootstrap;
      var view = this.bootstrap.view;

      // Admin
      this.isadmin = bootstrap.admin;
      if (this.isadmin) {
        m.Post.prototype.adminhook = function(){
            this.set({admin: true});
        };
      }

      // Instantiate NavBar View to handle navigation.
      this.navbar = new v.NavBar({view: view});

      // Create Backbone Posts Collection from bootstrapped models
      this.allposts = new m.Posts();
      this.friendsposts = new m.Posts();
      this.ownposts = new m.Posts();
      this.mostpopular = new m.Posts();
      this.searchresults = new m.Posts();
      this.mostpopular.view =  "mostpopular";
      
      //TODO::Add search to router
      if (view === 'friends') {
        this.currentposts = this.friendsposts;
      } else if (view === 'yourwall') {
        this.currentposts = this.ownposts;
      } else if(view === 'mostpopular'){
        this.currentposts = this.mostpopular;
      } else if (view === 'searchres') {
        this.currentposts = this.searchresults;
        $("#search_input").val(document.URL.substring(document.URL.lastIndexOf('/')+1));
      } else {
        this.currentposts = this.allposts;
      }

      this.currentposts.reset(this.bootstrap.posts);
      this.currentposts.view = view;

      // Instantiate PostsView to handle rendering and events
      this.postsview = new v.PostsView({collection: this.currentposts});
      
      if (view === "singlepostview") {
        var singlepostview = new v.SinglePostView({model: this.currentposts.at(0)});
        this.$("#content_container").html(singlepostview.render().el);

        // hide form
        this.$("#postform").hide();
      } else {
        if (view === "mostpopular" || view === "searchres")  {
          // hide form
          this.$("#postform").hide();
        } else {
          // show form
          this.$("#postform").show();
        }

        // Render Posts View
        this.$("#content_container").html(this.postsview.render().el);

      }
      
      // Postform view
      this.postform = new v.Postform();
      
      // Notifications
      var notifications = new m.Notifications(this.bootstrap.notifications);
      notifications.countnew();
      this.notificationsview = new v.NotificationsView({collection: notifications}).render();

      //start polling.
      this.poll();

      Backbone.history.start({pushState: true});
    },
    events: {
      'newpost': 'newpost',
      'changeview': "changeview",
      'showsinglepostview' : "showsinglepostview",
      "notificationselected" : "notificationselected",
      "filter": "filterByString",
      "search": "searchByString"
    },
    filterByString: function(e, str) {
      this.currentposts.filterByString(str);
    },
    searchByString: function(e, str) {
      var that = this;
      this.searchresults = new m.Posts();
      var el = $("#search_input");
      var stopLoader = $("#rightcontent").ajaxOverlay();

      mixpanel.track("zomg someone searched something!", {search_string: el.val()});
      if ($.trim(el.val()) === "") {
        console.log("You so smart!");
        stopLoader();
        return;
      }
      $.ajax({
        url: '/search?search_string='+el.val(),
        type: 'GET',
        error: function() {
          console.log("Error searching :/");
        },
        success: function(res) {
          var results = res.hits;
          var posts = _(results).pluck("_source");
          that.searchresults.add(posts);
          stopLoader();
          that.changeview(e, "search", str);
        }
      });
      return false;
    },
    notificationselected: function(e, notification){
      var post_id = notification.get('post_id');
      var that = this;
      // fetch post.
      var post = new m.Post({_id: post_id});
      post.fetch({success: function(model, response){
        post.set({'date': new Date(response.date)});
        post.update(response);
        
        // display single post view.
        that.showsinglepostview(e, post);
      }});
    },
    // triggered when user double clicks on a post
    showsinglepostview: function(e, post){
      var singlepostview = new v.SinglePostView({model: post});
      this.$("#content_container").html(singlepostview.render().el);

      // hide form
      this.$("#postform").hide();

      // update sidebar.
      this.navbar.active("singlepostview");

      // bb router
      var path = ['posts', post.id];
      this.router.navigateto.apply(this.router, path);
    },
    // triggered when user makes a new post.
    newpost: function(e, newpost){
      //add new post to post collection.
      this.postsview.collection.add(newpost, {at: 0});

      // mixpanel event
      mixpanel.track("Someone posted something");
    },
    // Change Application View
    changeview: function(e, view, optionalArg){
      //update router
      if (view !== "search") {
        this.router.navigateto(view);
        $("#search_input").val("");
        this.trigger("filter", "");
      } else {
        //search results need to be rendered here
        this.router.navigateto.apply(this.router, [view, optionalArg]);
      }

      // update sidebar.
      this.navbar.active(view);
      
      if (view === "mostpopular" || view === "search")  {
        // hide form
        this.$("#postform").slideUp();
      } else {
        // show form
        this.$("#postform").slideDown();
      }
      // update content.
      if (view === 'friends') {
        this.currentposts = this.friendsposts;
        this.friendsposts.update('friends');
      } else if (view === 'yourwall') {
        this.currentposts = this.ownposts;
        this.ownposts.update('yourwall');
      } else if (view ==='mostpopular'){
        this.currentposts = this.mostpopular;
        this.mostpopular.update('mostpopular');
      } else if (view === 'search') {
        this.currentposts = this.searchresults;
        this.searchresults.update('search');
        //todo, fix server-side update() in m.Posts to get share_count
      } else {
        this.currentposts = this.allposts;
        this.allposts.update('allposts');
      }

      this.postsview = new v.PostsView({collection: this.currentposts});
      this.$("#content_container").html(this.postsview.render().el);
    },
    poll: function(){
      var that = this;
      var posts = this.postsview.collection;
      var notifications = this.notificationsview.collection;

      if (!posts.lasttime) {
        posts.getLast();
      }
   
      $.ajax({
        type: 'GET',
        url: '/posts',
        data: {
          type: "delta",
          view: posts.view,
          last: posts.lasttime,
          posts_id_array: _.pluck(posts.models, "id"),
          last_notification: notifications.latest()
        },
        success: function(response){
          //console.log("response");
          if (response.status === "success") {
            // ### Deltas
            var latest = posts.lasttime;

            // changes to existing posts
            if(response.delta!==undefined && response.delta.length>0 ){
              var delta = response.delta;
              _.each(delta, function(postchanged){
                var post = posts.get(postchanged._id);
                post.update(postchanged);
                
                // get lastest time entry.
                var x = post.getlatest();
                if (x > latest) {
                  latest = x;
                }
              });
            }

            // ### New posts.
            var newposts = response.results;
            var newposts_filtered = [];
            _.each(newposts, function(post){
              var exists = posts.get(post._id);
              if (!exists) {
                var post_model = new m.Post(post);
                newposts_filtered.push(post_model);

                var y = post_model.getlatest();
                if (y > latest) {
                  latest = y;
                }
              } else {
                exists.set({
                  date: new Date(post.date)
                });
                var z = exists.getlatest();
                if (z > latest) {
                  latest = z;
                }
              }
            });
            
            if (posts.view === "mostpopular") {
              posts.add(newposts_filtered, {at: 0, silent: true});
              posts.sort();
            } else {
              posts.add(newposts_filtered, {at: 0, silent: true});
              posts.trigger("newposts", newposts_filtered.length);
            }
            posts.lasttime = latest;

            
            // ### Notifications
            var new_notifications = response.notifications;
            if (new_notifications && new_notifications.length !== 0) {
              notifications.add(new_notifications, {at: 0});
            }
            
            that.poll();

          } else if (response.status === "error") {
            //TODO.
            if (response.code === "post_id_array_undefined") {
              that.poll();
            }
          }
        },
        dataType: "json"
      });
      // update last updated timestamp.
      that.last = Date.now();
    }
  });
  return App;
});