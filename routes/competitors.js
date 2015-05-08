var async = require('async');
var CompetitorSchema = require('../models/competitor');
var moment = require('moment');
var validation = require('validator');
var base32 = require('base32');
var secureRandom = require('secure-random');

var mongoose = require('mongoose');
if (mongoose.connection.readyState == 0)
    mongoose.connect(process.env.MONGOLAB_URI);
var Competitor = CompetitorSchema.model;

var _breadcrumbs;
var _root;

function getBreadcrumbs(caller)
{
    var result = {};

    for (var index in _breadcrumbs)
    {
        if (_breadcrumbs[index].key == caller)
            result[_breadcrumbs[index].value] = "#";
        else
            result[_breadcrumbs[index].value] = _root + _breadcrumbs[index].key;
    }

    return result;
}

function dump(req, res, next)
{
    if (mongoose.connection.readyState != 1)
        return res.send(500);

//    var query = Level.findOne().where('name', name);
    var competitor = new Competitor();
    res.render('plain', { body: JSON.stringify(competitor) });
}

function populate_object(key, value, dest)
{
    if (key.indexOf('_') > 0)   // NOT -1, because I don't want to change initial underscore...
    {
        var parts = key.split('_');
        var top = parts.shift();

        if (!(top in dest))
            dest[top] = {};

        populate_object(parts.join('_'), value, dest[top]);
    }
    else
        dest[key] = value;
}

function property_from_field(key)
{
    return key.replace(/_/g, '.');
}

function make_slug(callback)
{
    var bytes = secureRandom(5);
    callback(null, base32.encode(bytes).toUpperCase());
}

function parse_form(fields, form)
{
    var values = {};
    values._valid = true;

    for (key in fields)
    {
        var field = fields[key];

        if (!field.name)
            continue;

        if (field.name in form)
        {
            var okay = true;
            if (field.validator)
            {
                if (!field.validator(form[field.name]))
                {
                    okay = false;
                    values._valid = false;

                    if (field.invalid)
                        field.error = field.invalid;
                    else
                        field.error = "Not valid!";
                }
            }

            if (okay)
            {
                populate_object(field.name, form[field.name], values);
                field.value = form[field.name];
            }
        }
    }

    return values;
}

function isNonEmpty(str)
{
    if (validation.trim(str))
        return true;

    return false;
}

function create_competitor(req, res, next)
{
    if (mongoose.connection.readyState != 1)
        return res.send(500);

    // error, label, name, value, instructions, validator, invalid
    var fields = [
        { label: "Game Title", name: "title", validator: isNonEmpty, invalid: "Must not be empty!" },
        { label: "Team Name", name: "team_name", validator: isNonEmpty, invalid: "Must not be empty!"  },
        { type: "hidden", name: "_id" }
    ];
    var error = "";

    if (req.method == 'GET')
    {
        res.render('create_competitor', { fields: fields, isCreate: true });
    }
    else if (req.method == 'POST')
    {
        var values = parse_form(fields, req.body);

        async.waterfall([
            function(callback) {
                if (!values._valid)
                    callback("Please correct the highlighted errors");
                else if (!values._id)
                {
                    var competitor = new Competitor();
                    make_slug(function(err, slug) {
                        if (err)
                            callback(err);
                        else
                        {
                            competitor.authSlug = slug;
                            callback(null, competitor);
                        }
                    });
                }
                else
                    Competitor.findById(values._id, callback);
            },
            function(competitor, callback) {
                for (key in fields)
                {
                    if (fields[key].name == '_id')
                    {
                        fields[key].value = competitor._id;
                        break;
                    }
                }

                competitor.title = values.title;
                competitor.team.name = values.team.name;

                competitor.save(callback);
            }
        ], function (err, competitor) {
            if (err)
            {
                error = err;
            }
            else
            {
                var url = 'http' + (req.isSSL ? 's' : '') + '://' + req.get('Host') + _root + competitor.authSlug;
                fields.push({ label: "Editing URL", type: "literal",  value: "<a href='" + url + "'>" + url + "</a>"});
            }
            res.render('create_competitor', { fields: fields, error: error });
        });
    }
}

function pageOne(req, res, next)
{
    if (mongoose.connection.readyState != 1)
        return res.send(500);

    //        { label: "Editing URL", type: "literal",  value: "<a href='http://google.com'>Google</a>"}

    // error, label, name, value, instructions
    var fields = [
        { label: "Game Title", name: "title" },
        { label: "Team Name", name: "team_name" }
    ];

    var query = Competitor.findOne().where('authSlug', req.params.slug);
    var select = "";
    for (key in fields)
    {
        if (fields[key].name)
            select = select + property_from_field(fields[key].name) + ' ';
    }
    query.select(select);
    query.exec(function(err, competitor) {
        res.render('plain', {body: JSON.stringify(competitor)});
    });

/*    query.exec(function(err, doc) {
        if (err)
        {
            console.log("DB FETCH LEVEL ERROR: " + err);
            return res.send(500);
        }


    if (req.method == 'GET')
    {
        res.render('create_competitor', { fields: fields });
    }
    else if (req.method == 'POST')
    {
        var values = parse_form(fields, req.body);

        async.waterfall([
            function(callback) {
                if (!values._id)
                    callback(null, new Competitor());
                else
                {
                    Competitor.findById(values._id, callback);
                }
            },
            function(competitor, callback) {
                competitor.title = values.title;
                competitor.team.name = values.team.name;
                make_slug(function(err, slug) {
                    if (err)
                        callback(err);
                    else
                    {
                        competitor.authSlug = slug;
                        callback(null, competitor);
                    }
                });
            },
            function(competitor, callback) {
                competitor.save(callback);
            }
        ], function (err, competitor) {
            if (err)
            {
                console.log(err);
                return res.send(500);
            }
            else
            {
                var url = req.get('Host') + _root + competitor.authSlug;
                fields.push({ label: "Editing URL", type: "literal",  value: "<a href='" + url + "'>" + url + "</a>"});
                res.render('create_competitor', { fields: fields });
            }
        });
    }}*/
}

/*
function edit_competitor(req, res, next)
{
    var query = Level.findOne().where('name', name);
    query.select('name title template body includeChunks zone');
    query.exec(function(err, doc) {
        if (err)
        {
            console.log("DB FETCH LEVEL ERROR: " + err);
            return res.send(500);
        }
}
*/

exports.register = function(app, root, auth)
{
    _root = root;
    _breadcrumbs = [];

    if (auth == null)
        auth = [];

    app.all(root + 'create', auth, create_competitor);
    app.all(root, dump);

    app.all(root + ':slug', pageOne);
    app.all(root + ':slug/1', pageOne);

    // other params should go in between
/*    app.all(root, handleConsole);
    _breadcrumbs.push({key: '', value: 'Console'});

    app.get(root + 'opens', handleOpenSessions);
    _breadcrumbs.push({key: 'opens', value: 'Open Sessions'});

    app.get(root + 'download', handleDownloadCSV);
    _breadcrumbs.push({key: 'download', value: 'Download CSV'});

    //app.all(root + 'flushdb/yesreally', handleFlushDB);

    app.get(root + 'test/questions', handleDumpQuestions);
    app.all(root + 'test/pagination', handleDumpPagination);
    app.get(root + 'test/headers', handleDumpHeaders);
    */
}