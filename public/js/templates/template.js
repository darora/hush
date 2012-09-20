/*global define:true *//*jshint  multistr:true */
define(['underscore'], function(_){

var tmpl = {};

tmpl.urlAttachment = '\
<li>\
    <a href="<%- url %>">\
        <img src="<%- url %>"/>\
        <span><%- url %></span>\
    </a>\
</li>';

tmpl.postAttachment = '<li>\
<a href="<%= url %>">\
<img src="<%= url %>"/>\
</a></li>';

tmpl.newposts = "<div class='newposts'><%= count %> New Posts</div>";

// <div class='post well <%- visibility %>'>\
tmpl.post = "\
<div class='vote'>\
</div>\
<div class='postbody'><%= body %></div>\
<ul class='post-attachments'></ul>"
            + "<div class='img-wrap'></div>" +
"<div class='postdetails'>\
	<time class='posttime' datetime=''>\
	<%- readabledate %>\
	</time>\
	&middot;\
	<% if (numberofcomments == 0) { %>\
		<a class='commentbutton button'>Comment</a>\
	<% } else if (numberofcomments == 1) { %>\
		<a class='commentbutton button'>Comment (1)</a>\
	<% } else { %>\
		<a class='commentbutton button'>Comments (<%- numberofcomments %>)</a>\
	<% } %>\
	&middot;\
	<% if ((share_count == 0) || (share_count == -1)) { %>\
		<a class='sharebutton button'>Share</a>\
	<% } else if (share_count == 1) { %>\
		<a class='sharebutton button'>Share (1)</a>\
	<% } else { %>\
		<a class='sharebutton button'>Shares (<%- share_count %>)</a>\
	<% } %>\
	&middot;\
	<span class='upvote'> ▲upvote</span>\
	&middot;\
	<span class='downvote'> ▼downvote</span>\
	&middot;\
	<% if(upvotes.length - downvotes.length >= 1){ %>\
		<a class='positivevotes'><%- upvotes.length - downvotes.length %></a>\
	<% } else if(upvotes.length - downvotes.length <= -1){ %>\
		<a class='negativevotes'><%- upvotes.length - downvotes.length %></a>\
	<% } else { %>\
		<a class='neutralvotes'><%- upvotes.length - downvotes.length %></a>\
	<% } %>\
	<% if (admin) { %>\
		&middot;\
		<a class='deletebutton button'>Delete</a>\
	<% } %>\
</div>\
<div class='commentswrapper'>\
	<div class='commentscontainer'></div>\
	<div class='commentformwrapper'>\
		<input class='span6 commentform' type='text' placeholder='Write a comment...' />\
	</div>\
</div>";

tmpl.comment = "\
<div class='commentbody'><%= body %></div>\
<time class='commenttime'><%- readabledate %></time>";

tmpl.nonotifications = "<div class='nonotifications'>zero notifications.</div>";
tmpl.number = "<div class='number'><%= count %></div>";

tmpl.notification = "\
<span class='action'><%= action %></span>\
<span> \"<%= post_summary %>\" </span>\
<div class='time'><%= readabledate %></div>";

var compiled = {};
_.each(_.keys(tmpl), function(key){
	compiled[key] = _.template(tmpl[key]);
});

return compiled;
});