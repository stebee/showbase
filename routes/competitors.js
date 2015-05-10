var async = require('async');
var CompetitorSchema = require('../models/competitor');
var moment = require('moment');
var validation = require('validator');
var wordcount = require('wordcount');
var base32 = require('base32');
var secureRandom = require('secure-random');

var mongoose = require('mongoose');
if (mongoose.connection.readyState == 0)
    mongoose.connect(process.env.MONGOLAB_URI);
var Competitor = CompetitorSchema.model;

var _root;

/*function getBreadcrumbs(caller)
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
 locals.breadcrumbs =  {
 "1": (page == 1) ? "#" : ""
 };
 for (var index = 2; index <= numPages; index++)
 locals.breadcrumbs[" " + index] = (page == index) ? "#" : "";*/


function dump(req, res, next)
{
    if (mongoose.connection.readyState != 1)
        return res.send(500);

//    var query = Level.findOne().where('name', name);
    var competitor = new Competitor();
    res.render('plain', { body: JSON.stringify(competitor) });
}

function multitier_write(key, value, dest)
{
    if (key.indexOf('_') > 0)   // NOT -1, because I don't want to change initial underscore...
    {
        var parts = key.split('_');
        var top = parts.shift();

        if (!(top in dest))
            dest[top] = {};

        return multitier_write(parts.join('_'), value, dest[top]);
    }
    else
    {
        dest[key] = value;
        return value;
    }
}

function multitier_read(key, src)
{
    if (key.indexOf('_') > 0)   // NOT -1, because I don't want to change initial underscore...
    {
        var parts = key.split('_');
        var top = parts.shift();

        if (!(top in src))
            src[top] = {};

        return multitier_read(parts.join('_'), src[top]);
    }
    else
    {
        return src[key];
    }
}

function column_from_field(key)
{
    return key.replace(/_/g, '.');
}

function make_slug(callback)
{
    var bytes = secureRandom(5);
    callback(null, base32.encode(bytes).toUpperCase());
}

/*function parse_form(fields, values, form)
{
    var valid = true;

    for (key in fields)
    {
        var field = fields[key];

        if (!field.name)
            continue;

        var okay = true;
        if (form && (field.name in form))
        {
            if (field.validator)
            {
                if (!field.validator(form[field.name]))
                {
                    okay = false;
                    valid = false;

                    if (field.invalid)
                        field.error = field.invalid;
                    else
                        field.error = "Not valid!";
                }
            }
        }

        if (okay)
        {
            field.value = multitier_write(field.name, form[field.name], values);
        }
    }

    return valid;
}*/

function synchronize_fields(fields, values, form)
{
    var valid = true;

    for (key in fields)
    {
        var field = fields[key];

        if (!field.name)
            continue;

        var okay = true;
        if (form && (field.name in form))
        {
            if (field.validation)
            {
                var validator = _validators[field.validation];
                if (validator)
                {
                    if (!validator.test(form[field.name]))
                    {
                        okay = false;
                        valid = false;

                        if (validator.error)
                            field.error = validator.error;
                        else
                            field.error = "Not valid!";
                    }
                }
            }
        }

        if (form)
        {
            if (okay)
                field.value = multitier_write(field.name, form[field.name], values);
            else
                field.value = form[field.name];
        }
        else
        {
            field.value = multitier_read(field.name, values);
            if (field.initial && (field.value === undefined || field.value === null))
                field.value = field.initial;
        }
    }

    return valid;
}

var _validators = {
    nonEmpty: {
        test: function(str) {
            if (validation.trim(str))
                return true;
            return false;
        },
        error: "Must not be empty!"
    },

    email: {
        test: function(str) {
            return validation.isEmail(str, { allow_display_name: false });
        },
        error: "Must be a valid email address"
    },

    phone: {
        test: function(str) {
            return validation.isMobilePhone(str, 'en-US');
        },
        error: "Must be a valid phone number"
    },

    "words=150": {
        test: function(str) {
            return (wordcount(str) <= 150);
        },
        error: "Must be 150 words or fewer"
    }
};

function create_competitor(req, res, next)
{
    if (mongoose.connection.readyState != 1)
        return res.send(500);

    // error, label, name, value, instructions, validator, invalid
    var fields = [
        { label: "Game Title", name: "title", validation: "nonEmpty"},
        { label: "Team Name", name: "team_name", validation: "nonEmpty" },
        { type: "hidden", name: "_id" }
    ];
    var error = "";
    var heading = "Create Entry";

    if (req.method == 'GET')
    {
        res.render('create_competitor', { fields: fields, isCreate: true, error: error, heading: heading });
    }
    else if (req.method == 'POST')
    {
        var values = {};
        var valid = synchronize_fields(fields, values, req.body);

        async.waterfall([
            function(callback) {
                if (!valid)
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
                            competitor.createdAt = Date.now();
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
                competitor.lastEditedAt = Date.now();

                competitor.save(callback);
            }
        ], function (err, competitor) {
            if (err)
            {
                error = err;
            }
            else
            {
                heading = "Edit Entry";
                var url = 'http' + (req.isSSL ? 's' : '') + '://' + req.get('Host') + _root + competitor.authSlug;
                fields.push({ label: "Editing URL", type: "literal",  value: "<a href='" + url + "'>" + url + "</a>"});
            }
            res.render('create_competitor', { fields: fields, error: error, heading: heading });
        });
    }
}

var _pages = [
    {
        heading: "The Basics",
        fields: [
            { label: "Game Title", name: "title", validation: "nonEmpty" },
            { label: "Team Name", name: "team_name", validation: "nonEmpty" },
            { label: "Primary Contact", name: "team_primaryContact_name", validation: "nonEmpty", instructions: "The first person we should contact with questions or problems" },
            { label: ">Email", name: "team_primaryContact_email", validation: "email" },
            { label: ">Phone", name: "team_primaryContact_phone", validation: "phone" },
            { label: "Technical Contact", name: "team_technicalContact_name", validation: "nonEmpty", instructions: "The person we should contact with technical issues (in addition to the primary contact)" },
            { label: ">Email", name: "team_technicalContact_email", validation: "email" },
            { label: ">Phone", name: "team_technicalContact_phone", validation: "phone" }
        ]
    },

    {
        heading: "Background",
        fields: [
            { label: "Team Description", name: "team_description", type: "paragraph", validation: "words=150", instructions: "Please provide a brief description of your team, the number of members, working philosophy, the context in which the work was creative, e.g., student team, arts collective, skunkworks within a larger development studio, as well as your work style, e.g., distributed, co-located, etc.; have distinct roles or all work on everything, etc. Include a sentence or two on how the team members met. (max. 150 words)" },
            { label: "Your Story", name: "story", type: "paragraph", validation: "words=150", instructions: "Please tell us the story of how you got your game made, including resources and funding. (max. 150 words). This is a hook or pitch for your team and game, so make it short and gripping. It will be used in IndieCade promotional materials if your game is selected for the festival. (max. 150 words)" }
        ]
    },


    {
        heading: "The Team",
        fields: [
            { label: "Team Members", name: "team_roster", type: "array", instructions: "One team member per line, with their role following a comma after the name. Example: Jane Doe, International Woman of Mystery." }
        ]
    },

    {
        heading: "All Done!",
        fields: []
    }
];

function sanitize_page(page)
{
    if (!page || isNaN(page))
        return 0;
    if (page < 0)
        return 0;
    if (page >= _pages.length)
        return _pages.length - 1;
    return page;
}

function edit_competitor(req, res, next)
{
    if (mongoose.connection.readyState != 1)
        return res.send(500);

    var locals = {
        error: null
    };

    var page = sanitize_page(validation.toInt(req.params.page) - 1);
    locals.isPrev = (page > 0);
    locals.isNext = (page < (_pages.length - 1));

    locals.heading = _pages[page].heading;
    var fields = JSON.parse(JSON.stringify(_pages[page].fields));
    locals.fields = fields;

    var query = Competitor.findOne().where('authSlug', req.params.slug);
    var select = "";
    for (key in fields)
    {
        if (fields[key].name)
            select = select + column_from_field(fields[key].name) + ' ';
    }
    query.select(select);
    query.exec(function(err, competitor) {
        if (req.method == 'GET')
        {
            if (page == 0)
                locals.message = "Remember to keep your edit URL secret! Anyone with this URL can edit your entry!";

            var valid = synchronize_fields(fields, competitor);
            res.render('edit_competitor', locals);
        }
        else if (req.method == 'POST')
        {
            var values = {};
            var valid = synchronize_fields(fields, competitor, req.body);

            async.waterfall([
                function(callback) {
                    if (!valid)
                        callback("Please correct the highlighted errors");
                    else
                    {
                        competitor.lastEditedAt = Date.now();
                        competitor.save(callback);
                    }
                }
            ], function (err, competitor) {
                var mayAdvance = true;
                if (err)
                {
                    mayAdvance = false;
                    locals.error = err;
                }

                if (mayAdvance)
                {
                    var newPage = page;
                    if ("_saveNext" in req.body)
                        newPage = sanitize_page(page + 1);
                    else if ("_savePrev" in req.body)
                        newPage = sanitize_page(page - 1);

                    if (newPage != page)
                        return res.redirect(_root + req.params.slug + '/' + (newPage + 1).toString());
                }

                res.render('edit_competitor', locals);
            });

            console.log(JSON.stringify(req.body));
        }
    });
}


exports.register = function(app, root, auth)
{
    _root = root;

    if (auth == null)
        auth = [];

    app.all(root + 'create', auth, create_competitor);
    //app.all(root, dump);

    app.all(root + ':slug', edit_competitor);
    app.all(root + ':slug/:page', edit_competitor);
}