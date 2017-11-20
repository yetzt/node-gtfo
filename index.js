#!/usr/bin/env node

var url = require("url");

var ent = require("ent");
var request = require("request");
var cheerio = require("cheerio");

function gtfo(){
	return (this instanceof gtfo) ? this : new gtfo();
};

// decide strategy bs query
gtfo.prototype.twitter = function(q,fn){
	var self = this;

	// hashtag
	if (/^#/.test(q)) return self.twittersearch(q,fn), this;

	// user
	if (/^@([a-zA-Z0-9_]{1,15})$/.test(q)) return self.twittersearch("from:"+RegExp.$1,fn), this;

	// userid
	if (/^[0-9]+$/.test(q)) return self.twitteruser(q,fn), this;

	// search in general
	return self.twittersearch(q,fn), this;

};

// get twitter screen name from user id
gtfo.prototype.twitteruser = function(id, fn){
	var self = this;
	
	// ensure, id is string
	id = id.toString();
	
	// ensure and check cache
	if (!self.hasOwnProperty("cache")) self.cache = {};
	if (self.cache.hasOwnProperty(id)) return self.twittersearch("from:"+self.cache[id],fn);
	
	// retrieve sceen name from user intent
	request({
		"method": "GET",
		"url": "https://twitter.com/intent/user?user_id="+id,
		"headers": { "accept-language": "en" }
	}, function(err, resp, html){
		if (err) return fn(err);
		if (resp.statusCode !== 200) return fn(new Error("Server replied with HTTP Status "+resp.statusCode));
		if (!/<title>[^<]+ \(@([a-zA-Z0-9_]{1,15})\) on Twitter<\/title>/.test(html)) return fn(new Error("Unable to determine screen name"));

		// cache
		self.cache[id] = RegExp.$1;

		// perform search
		return self.twittersearch("from:"+RegExp.$1,fn);

	});
	
	return this;
};

// utilize twitter search
gtfo.prototype.twittersearch = function(q, fn){
	var self = this;
	
	request({
		"method": "GET",
		"url": "https://twitter.com/search?l=&q="+encodeURIComponent(q)+"&src=typd",
		"headers": { "accept-language": "en" }
	}, function(err, resp, html){
	
		if (err) return fn(err);
		if (resp.statusCode !== 200) return fn(new Error("Server replied with HTTP Status "+resp.statusCode));
	
		// parse html
		var $ = cheerio.load(html);
		
		// fix markup
		$("a[data-expanded-url]").replaceWith(function(){ return " "+$(this).attr("data-expanded-url")+" "; });
		$("img.Emoji").replaceWith(function(){ return $(this).attr("alt"); });
		$("a.twitter-atreply").replaceWith(function(){ return $(this).text(); });
		$("a.twitter-hashtag").replaceWith(function(){ return $(this).text(); });
		$("a.twitter-timeline-link").replaceWith(function(){ return " "+$(this).attr("href")+" "; });
		
		try {
			var tweets = $('li[data-item-type="tweet"]').map(function(){
				var $t = $(this);

				if ($(".tweet", $t).attr("data-is-reply-to") === "true" || $(".tweet", $t).attr("data-has-parent-tweet") === "true") return null;

				return {
					"id": $t.attr("data-item-id"),
					"url": url.resolve("https://twitter.com", $(".tweet", $t).eq(0).attr("data-permalink-path")),
					"from": $(".tweet", $t).eq(0).attr("data-screen-name"),
					"date": $(".tweet .tweet-timestamp span._timestamp", $t).eq(0).attr("data-time-ms"),
					"content": ent.decode($(".tweet .js-tweet-text-container p", $t).eq(0).html().replace(/^\s+|\s+$/g,'').replace(/\s+/g,' ')),
					"image": url.resolve("https://twitter.com", $(".tweet img.avatar", $t).eq(0).attr("src")),
				};
			
			}).get();
		} catch (err) {
			return fn(err);
		}
		
		return fn(null, tweets);
	
	});
	
	return this;
};

// export instance
var g = new gtfo()
module.exports = function(q,fn){
	g.twitter(q,fn||function(){});
};
