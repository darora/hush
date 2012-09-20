/*!

 Copyright (c) 2011 Peter van der Spek

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 
 */
/*global define:true */
define(['jquery', 'underscore', 'backbone'],
       function($,_,Backbone){
         /*	
          *	jQuery dotdotdot 1.5.1
          *	
          *	Copyright (c) 2012 Fred Heusschen
          *	www.frebsite.nl
          *
          *	Plugin website:
          *	dotdotdot.frebsite.nl
          *
          *	Dual licensed under the MIT and GPL licenses.
          *	http://en.wikipedia.org/wiki/MIT_License
          *	http://en.wikipedia.org/wiki/GNU_General_Public_License
          */


         (function( $ )
          {
	          if ( $.fn.dotdotdot )
	          {
		          return;
	          }

	          $.fn.dotdotdot = function( o )
	          {
		          if ( this.length == 0 )
		          {
			          debug( true, 'No element found for "' + this.selector + '".' );
			          return this;
		          }
		          if ( this.length > 1 )
		          {
			          return this.each(
				          function()
				          {
					          $(this).dotdotdot( o );
				          }
			          );
		          }


		          var $dot = this;

		          if ( $dot.data( 'dotdotdot' ) )
		          {
			          $dot.trigger( 'destroy.dot' );
		          }

		          $dot.bind_events = function()
		          {
			          $dot.bind(
				          'update.dot',
				          function( e, c )
				          {
					          e.preventDefault();
					          e.stopPropagation();

					          opts.maxHeight = ( typeof opts.height == 'number' ) 
						          ? opts.height 
						          : getTrueInnerHeight( $dot );

					          opts.maxHeight += opts.tolerance;

					          if ( typeof c != 'undefined' )
					          {
						          if ( typeof c == 'string' || c instanceof HTMLElement )
						          {
					 		          c = $('<div />').append( c ).contents();
						          }
						          if ( c instanceof $ )
						          {
							          orgContent = c;
						          }
					          }

					          $inr = $dot.wrapInner( '<div class="dotdotdot" />' ).children();
					          $inr.empty()
						          .append( orgContent.clone( true ) )
						          .css({
							          'height'	: 'auto',
							          'width'		: 'auto',
							          'border'	: 'none',
							          'padding'	: 0,
							          'margin'	: 0
						          });

					          var after = false,
						            trunc = false;

					          if ( conf.afterElement )
					          {
						          after = conf.afterElement.clone( true );
						          conf.afterElement.remove();
					          }
					          if ( test( $inr, opts ) )
					          {
						          if ( opts.wrap == 'children' )
						          {
							          trunc = children( $inr, opts, after );
						          }
						          else
						          {
							          trunc = ellipsis( $inr, $dot, $inr, opts, after );
						          }
					          }
					          $inr.replaceWith( $inr.contents() );
					          $inr = null;
					          
					          if ( $.isFunction( opts.callback ) )
					          {
						          opts.callback.call( $dot[ 0 ], trunc, orgContent );
					          }

					          conf.isTruncated = trunc;
					          return trunc;
				          }

			          ).bind(
				          'isTruncated.dot',
				          function( e, fn )
				          {
					          e.preventDefault();
					          e.stopPropagation();

					          if ( typeof fn == 'function' )
					          {
						          fn.call( $dot[ 0 ], conf.isTruncated );
					          }
					          return conf.isTruncated;
				          }

			          ).bind(
				          'originalContent.dot',
				          function( e, fn )
				          {
					          e.preventDefault();
					          e.stopPropagation();

					          if ( typeof fn == 'function' )
					          {
						          fn.call( $dot[ 0 ], orgContent );
					          }
					          return orgContent;
				          }

			          ).bind(
				          'destroy.dot',
				          function( e )
				          {
					          e.preventDefault();
					          e.stopPropagation();

					          $dot.unwatch()
						          .unbind_events()
						          .empty()
						          .append( orgContent )
						          .data( 'dotdotdot', false );
				          }
			          );
			          return $dot;
		          };	//	/bind_events

		          $dot.unbind_events = function()
		          {
			          $dot.unbind('.dot');
			          return $dot;
		          };	//	/unbind_events

		          $dot.watch = function()
		          {
			          $dot.unwatch();
			          if ( opts.watch == 'window' )
			          {
				          var $window = $(window),
					            _wWidth = $window.width(),
					            _wHeight = $window.height(); 

				          $window.bind(
					          'resize.dot' + conf.dotId,
					          function()
					          {
						          if ( _wWidth != $window.width() || _wHeight != $window.height() || !opts.windowResizeFix )
						          {
							          _wWidth = $window.width();
							          _wHeight = $window.height();
	                      
							          if ( watchInt )
							          {
								          clearInterval( watchInt );
							          }
							          watchInt = setTimeout(
								          function()
								          {
									          $dot.trigger( 'update.dot' );
								          }, 10
							          );
						          }
					          }
				          );
			          }
			          else
			          {
				          watchOrg = getSizes( $dot );
				          watchInt = setInterval(
					          function()
					          {
						          var watchNew = getSizes( $dot );
						          if ( watchOrg.width  != watchNew.width ||
							             watchOrg.height != watchNew.height )
						          {
							          $dot.trigger( 'update.dot' );
							          watchOrg = getSizes( $dot );
						          }
					          }, 100
				          );
			          }
			          return $dot;
		          };
		          $dot.unwatch = function()
		          {
			          $(window).unbind( 'resize.dot' + conf.dotId );
			          if ( watchInt )
			          {
				          clearInterval( watchInt );
			          }
			          return $dot;
		          };

		          var	orgContent	= $dot.contents(),
			            opts 		= $.extend( true, {}, $.fn.dotdotdot.defaults, o ),
			            conf		= {},
			            watchOrg	= {},
			            watchInt	= null,
			            $inr		= null;

		          conf.afterElement	= getElement( opts.after, $dot );
		          conf.isTruncated	= false;
		          conf.dotId			= dotId++;


		          $dot.data( 'dotdotdot', true )
			          .bind_events()
			          .trigger( 'update.dot' );

		          if ( opts.watch )
		          {
			          $dot.watch();
		          }

		          return $dot;
	          };


	          //	public
	          $.fn.dotdotdot.defaults = {
		          'ellipsis'	: '... ',
		          'wrap'		: 'word',
		          'lastCharacter': {
			          'remove'		: [ ' ', ',', ';', '.', '!', '?' ],
			          'noEllipsis'	: []
		          },
		          'tolerance'	: 0,
		          'callback'	: null,
		          'after'		: null,
		          'height'	: null,
		          'watch'		: false,
		          'windowResizeFix': true,
		          'debug'		: false
	          };
	          

	          //	private
	          var dotId = 1;

	          function children( $elem, o, after )
	          {
		          var $elements 	= $elem.children(),
			            isTruncated	= false;

		          $elem.empty();

		          for ( var a = 0, l = $elements.length; a < l; a++ )
		          {
			          var $e = $elements.eq( a );
			          $elem.append( $e );
			          if ( after )
			          {
				          $elem.append( after );
			          }
			          if ( test( $elem, o ) )
			          {
				          $e.remove();
				          isTruncated = true;
				          break;
			          }
			          else
			          {
				          if ( after )
				          {
					          after.remove();
				          }
			          }
		          }
		          return isTruncated;
	          }
	          function ellipsis( $elem, $d, $i, o, after )
	          {
		          var $elements 	= $elem.contents(),
			            isTruncated	= false;

		          $elem.empty();

		          var notx = 'table, thead, tbody, tfoot, tr, col, colgroup, object, embed, param, ol, ul, dl, select, optgroup, option, textarea, script, style';
		          for ( var a = 0, l = $elements.length; a < l; a++ )
		          {

			          if ( isTruncated )
			          {
				          break;
			          }

			          var e	= $elements[ a ],
				            $e	= $(e);

			          if ( typeof e == 'undefined' )
			          {
				          continue;
			          }

			          $elem.append( $e );
			          if ( after )
			          {
				          var func = ( $elem.is( notx ) )
					              ? 'after'
					              : 'append';
				          $elem[ func ]( after );
			          }
			          if ( e.nodeType == 3 )
			          {
				          if ( test( $i, o ) )
				          {
					          isTruncated = ellipsisElement( $e, $d, $i, o, after );
				          }
			          }
			          else
			          {
				          isTruncated = ellipsis( $e, $d, $i, o, after );
			          }

			          if ( !isTruncated )
			          {
				          if ( after )
				          {
					          after.remove();
				          }
			          }
		          }
		          return isTruncated;
	          }
	          function ellipsisElement( $e, $d, $i, o, after )
	          {
		          var isTruncated	= false,
			            e			= $e[ 0 ];

		          if ( typeof e == 'undefined' )
		          {
			          return false;
		          }

		          var seporator	= ( o.wrap == 'letter' ) ? '' : ' ',
			            textArr		= getTextContent( e ).split( seporator ),
			            position 	= -1,
			            midPos		= -1,
			            startPos	= 0,
			            endPos		= textArr.length - 1;

		          while ( startPos <= endPos )
		          {
			          var m = Math.floor( ( startPos + endPos ) / 2 );
			          if ( m == midPos ) 
			          {
				          break;
			          }
			          midPos = m;

			          setTextContent( e, textArr.slice( 0, midPos + 1 ).join( seporator ) + o.ellipsis );

			          if ( !test( $i, o ) )
			          {
				          position	= midPos;
				          startPos	= midPos; 
			          }
			          else
			          {
				          endPos		= midPos;
			          }				
		          }	
	            
		          if ( position != -1 )
		          {
			          var txt = textArr.slice( 0, position + 1 ).join( seporator );
			          isTruncated = true;

			          while( $.inArray( txt.slice( -1 ), o.lastCharacter.remove ) > -1 )
			          {
				          txt = txt.slice( 0, -1 );
			          }
			          if ( $.inArray( txt.slice( -1 ), o.lastCharacter.noEllipsis ) < 0 )
			          {
				          txt += o.ellipsis;
			          }
			          setTextContent( e, txt );
		          }
		          else
		          {
			          var $w = $e.parent();
			          $e.remove();
			          $n = $w.contents().eq( -1 );

			          isTruncated = ellipsisElement( $n, $d, $i, o, after );
		          }

		          return isTruncated;
	          }
	          function test( $i, o )
	          {
		          return $i.innerHeight() > o.maxHeight;
	          }
	          function getSizes( $d )
	          {
		          return {
			          'width'	: $d.innerWidth(),
			          'height': $d.innerHeight()
		          };
	          }
	          function setTextContent( e, content )
	          {
		          if ( e.innerText )
		          {
			          e.innerText = content;
		          }
		          else if ( e.nodeValue )
		          {
			          e.nodeValue = content;
		          }
		          else if (e.textContent)
		          {
			          e.textContent = content;
		          }
	          }
	          function getTextContent( e )
	          {
		          if ( e.innerText )
		          {
			          return e.innerText;
		          }
		          else if ( e.nodeValue )
		          {
			          return e.nodeValue;
		          }
		          else if ( e.textContent )
		          {
			          return e.textContent;
		          }
		          else
		          {
			          return "";
		          }
	          }
	          function getElement( e, $i )
	          {
		          if ( typeof e == 'undefined' )
		          {
			          return false;
		          }
		          if ( !e )
		          {
			          return false;
		          }
		          if ( typeof e == 'string' )
		          {
			          e = $(e, $i);
			          return ( e.length )
				          ? e 
				          : false;
		          }
		          if ( typeof e == 'object' )
		          {
			          return ( typeof e.jquery == 'undefined' )
				          ? false
				          : e;
		          }
		          return false;
	          }
	          function getTrueInnerHeight( $el )
	          {
		          var h = $el.innerHeight(),
			            a = [ 'paddingTop', 'paddingBottom' ];

		          for ( z = 0, l = a.length; z < l; z++ ) {
			          var m = parseInt( $el.css( a[ z ] ), 10 );
			          if ( isNaN( m ) )
			          {
				          m = 0;
			          }
			          h -= m;
		          }
		          return h;
	          }
	          function debug( d, m )
	          {
		          if ( !d )
		          {
			          return false;
		          }
		          if ( typeof m == 'string' )
		          {
			          m = 'dotdotdot: ' + m;
		          }
		          else
		          {
			          m = [ 'dotdotdot:', m ];
		          }

		          if ( window.console && window.console.log )
		          {
			          window.console.log( m );
		          }
		          return false;
	          }
	          

	          //	override jQuery.html
	          var _orgHtml = $.fn.html;
            $.fn.html = function( str ) {
		          if ( typeof str != 'undefined' )
		          {
			          if ( this.data( 'dotdotdot' ) )
			          {
				          if ( typeof str != 'function' )
				          {
					          return this.trigger( 'update', [ str ] );
				          }
			          }
			          return _orgHtml.call( this, str );
		          }
		          return _orgHtml.call( this );
            };


	          //	override jQuery.text
	          var _orgText = $.fn.text;
            $.fn.text = function( str ) {
		          if ( typeof str != 'undefined' )
		          {
			          if ( this.data( 'dotdotdot' ) )
			          {
				          var temp = $( '<div />' );
				          temp.text( str );
				          str = temp.html();
				          temp.remove();
				          return this.trigger( 'update', [ str ] );
			          }
			          return _orgText.call( this, str );
		          }
              return _orgText.call( this );
            };


          })( jQuery );

         var utils = {};

         //modified, original parseUri from http://stevenlevithan.com/demo/parseuri/js/assets/parseuri.js
         (function(u, $) {
           u.urlRegex = /([^!](https?:\/\/[^\s<>]+)|^(https?:\/\/[^\s<>]+))/g;
           u.imageUrlRegex = /!(https?:\/\/[^\s]+)/g;
           
           u.parseUri = function (str) {
	           var	o   = parseUri.options,
		             m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
		             uri = {},
		             i   = 14;

	           while (i--) uri[o.key[i]] = m[i] || "";

	           uri[o.q.name] = {};
	           uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
		           if ($1) uri[o.q.name][$1] = $2;
	           });

	           return uri;
           };

           u.parseUri.options = {
	           strictMode: false,
	           key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
	           q:   {
		           name:   "queryKey",
		           parser: /(?:^|&)([^&=]*)=?([^&]*)/g
	           },
	           parser: {
		           strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
		           loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
	           }
           };


           // Defaults to 0.1 of the height from top, and a translucent white background
           $.fn.ajaxOverlay = function(options) {
             var settings = $.extend({
               xFactor: 0.5, //not used just yet, centered by default.!!
               yFactor: 0.1,
               background: "rgba(255,255,255,0.65)"
             }, options);

             var rnd = Math.floor(Math.random() * 1000);
             var loader = "<div class='overlay' id='overlay-"+ rnd +"'><div class='circle'></div><div class='circle1'></div></div>";
             var width = $(this).width();
             var height = $(this).height();
             var oldPosition = $(this).css("position");
             
             $(this).css("position", "relative").append(loader);
             var el = $("#overlay-"+rnd);
             el.width(width).height(height).css("background-color", settings.background);
             var circle = el.find(".circle");
             circle.css("margin-top", (settings.yFactor*height - 50)+'px');
             var that = this;
             return function() {
               $(that).css("position", oldPosition);
               $(el).remove();
             };
           };

           u.parseURL = function(string, matches, matchesModifiedHandler) {
             var old_matches_length = matches.length;      
             var new_matches = string.match(u.urlRegex);
             var new_matches_b = new_matches;
             if (typeof new_matches === "undefined" || new_matches === null) { //no matches
               return {matches: matches, new_matches: []};
             }
             new_matches = _(new_matches).difference(matches);
             matches = _.union(_.intersection(matches, new_matches_b), new_matches);
             // this is useful when used in conjunction with listening on a message being composed. Otherwise, its meaningless, and an empty function should be passed in.
             if (matches.length != old_matches_length+1) {
               matchesModifiedHandler();
             }
             return {matches: matches, new_matches: new_matches};
           };

           
           u.imageURL = function(string, matches, matchesModifiedHandler) {
             var old_matches_length = matches.length;      
             var new_matches = string.match(u.imageUrlRegex);
             var new_matches_b = new_matches;
             if (typeof new_matches === "undefined" || new_matches === null) { //no matches
               return {matches: matches, new_matches: []};
             }
             new_matches = _(new_matches).difference(matches);
             matches = _.union(_.intersection(matches, new_matches_b), new_matches);
             // this is useful when used in conjunction with listening on a message being composed. Otherwise, its meaningless, and an empty function should be passed in.
             if (matches.length != old_matches_length+1) {
               matchesModifiedHandler();
             }
             return {matches: matches, new_matches: new_matches};
           };

           // TODO::wait until the entire URL has been typed, rather than firing requests every keystroke of the way
           $.fn.detectURL = function(options) {
             var that = this;
             var settings = $.extend({
               handler: function(url) {//function to call when a match is detected. It'll be passed a string representing the url
                 var handlerThis = this;
                 var attachments = $("#url-attachments");
                 $.ajax({
                   url: '/fetchURL',
                   type: "POST",
                   data: {
                     url: url
                   },
                   success: function(data, txtStatus, xhr) {
                     console.log(data);
                   },
                   error: function() {
                     console.log("something went wrong with the ajax request");
                   }
                 });
               },
               modifiedHandler: function() {
                 console.log("This would be a good time to reset your views, as the underlying URLs have been modified");
               },
               exclusive: false //whether keypress events are to be suppressed
             }, options);
             var matches = [];
             $(this).on('keyup', function(e) {
               if (e.keyCode !== 13) {//lets leave return presses alone. For now. mwahahahah :evil laugh:
                 var obj = u.parseURL($(this).val(), matches, settings.modifiedHandler);
                 matches = obj.matches;
                 _(obj.new_matches).each(function(e) {
                   settings.handler(e);
                 });
               }
               if (settings.exclusive) {
                 // e.preventDefault();
                 // e.stopPropagation();
                 // return false;
               }
               else {
                 return true;
               }
             });
             return this;
           };

           // Options: {target: "", text: ""}
           u.escape = function(options) {
             var findReplace = [[/&/g, "&amp;"], [/</g, "&lt;"], [/>/g, "&gt;"], [/"/g, "&quot;"]];
             for (var item in findReplace)
               options["text"] = options["text"].replace(findReplace[item][0], findReplace[item][1]);
             return options["text"];
           };


         })(utils, jQuery);
         return utils;
       });