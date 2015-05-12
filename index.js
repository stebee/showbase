var env = process.env.NODE_ENV || 'development';

var redis = null;
if (process.env.REDISTOGO_URL)
{
    var rtg = require("url").parse(process.env.REDISTOGO_URL);
    redis = require("redis").createClient(rtg.port, rtg.hostname);
    if (rtg.auth)
        redis.auth(rtg.auth.split(':')[1]);
}
else
{
    redis = require("redis").createClient();
}

var express = require('express');
var app = express();
var logger = require('morgan');
app.use(logger('dev'));
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
var bodyParser = require('body-parser');

var forceSSL = function (req, res, next)
{
    if (env == 'development')
        req.isSSL = false;
    else if (req.headers['x-forwarded-proto'] !== 'https')
        return res.redirect(['https://', (process.env.TRUE_HOST || req.get('Host')), req.url].join(''));
    else
        req.isSSL = true;

    return next();
};

app.use(forceSSL);

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded());

app.get('/', function(req, res) {
    redis.incr('HelloWorldTest', function(err, result) {
        if (!err)
            res.render('plain', { body: 'Hello World #' + result });
    });
});

var basicAuth = require('basic-auth');

var auth = function (req, res, next) {
    function unauthorized(res) {
        res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
        return res.send(401);
    };

    var user = basicAuth(req);

    if (!user || !user.name || !user.pass) {
        return unauthorized(res);
    };

    if (user.name === 'rhodey' && user.pass === 'warmachine') {
        return next();
    } else {
        return unauthorized(res);
    };
};

var competitors = require("./routes/competitors");
competitors.register(app, "/entry/", auth);


app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
