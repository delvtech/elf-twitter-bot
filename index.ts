/*
 * Copyright 2021 Element Finance, Inc
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

function calculateAverageRate(values) {
  var total = 0;
  for (var i = 0; i < values.length; i++) {
    total += +values[i];
  }
  var avg = total / values.length;
  return avg;
}

async function main() {
  // Initialize Twitter env variables
  const CONSUMER_KEY = process.env.TWITTER_CONSUMER_KEY || "";
  const CONSUMER_SECRET = process.env.TWITTER_CONSUMER_SECRET || "";
  const ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN || "";
  const ACCESS_TOKEN_SECRET = process.env.TWITTER_ACCESS_TOKEN_SECRET || "";

  var Twit = require("twit");
  var T = new Twit({
    consumer_key: CONSUMER_KEY,
    consumer_secret: CONSUMER_SECRET,
    access_token: ACCESS_TOKEN,
    access_token_secret: ACCESS_TOKEN_SECRET,
    timeout_ms: 60 * 1000, // optional HTTP request timeout to apply to all requests.
    strictSSL: true, // optional - requires SSL certificates to be valid.
  });

  // parse the csv into the body of the tweet
  var fs = require("fs");
  var parse = require("csv-parse");
  var parser = parse({ columns: false }, function (err, data) {
    var tweetBody = "";

    for (var i = 0; i < data.length; i++) {
      // First item in each row is the asset name
      var asset = data[i][0].toUpperCase();
      // Following items are all APY's
      var values = data[i].splice(1);

      var averageAPY = calculateAverageRate(values).toFixed(2);

      // insert into tweet body
      tweetBody = tweetBody + asset + ": " + averageAPY + "%\n";
    }
    T.post(
      "statuses/update",
      { status: tweetBody },
      function (err, data, response) {
        console.log(data);
      }
    );
  });

  fs.createReadStream(__dirname + "/values.csv").pipe(parser);
}

main();
