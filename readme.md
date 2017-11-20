# gtfo

get tweets forgoing oauth. gtfo collects tweet text from twitters website utilizing search.

since this is as webs scraper, this might break unexpectedly.

## example

``` javascript

var gtfo = require("gtfo");

// hashtag
gtfo("#hashtag", console.log);

// user by screenname
gtfo("@yetzt", console.log);

// user by id
gtfo("2902401", console.log);

// search
gtfo("search terms", console.log);

```