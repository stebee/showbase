var redis = null;
if (process.env.REDISTOGO_URL)
{
    var rtg = require("url").parse(process.env.REDISTOGO_URL);
    redis = require("redis").createClient(rtg.port, rtg.hostname);
    redis.auth(rtg.auth.split(':')[1]);
}
else
{
    redis = require("redis").createClient();
}

var Sequelize = require('sequelize');
var sql = new Sequelize(process.env.HEROKU_POSTGRESQL_AQUA_URL);

var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));

app.get('/', function(request, response) {
    redis.incr('HelloWorldTest', function(err, result) {
        if (!err)
            response.send('Hello World #' + result);
    });
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
