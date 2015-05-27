var async = require('async');
var CompetitorSchema = require('../models/competitor');
var moment = require('moment-timezone');
var validation = require('validator');
var wordcount = require('wordcount');
var base32 = require('base32');
var secureRandom = require('secure-random');

var mongoose = require('mongoose');
if (mongoose.connection.readyState == 0)
    mongoose.connect(process.env.MONGOLAB_URI);
var Competitor = CompetitorSchema.model;

var constants = require('../models/constants');

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
        return res.sendStatus(500);

//    var query = Level.findOne().where('name', name);
    var competitor = new Competitor();
    res.render('plain', { body: JSON.stringify(competitor) });
}

function multitier_write(key, value, dest, accessor, field)
{
    if (key.indexOf('_') > 0)   // NOT -1, because I don't want to change initial underscore...
    {
        var parts = key.split('_');
        var top = parts.shift();

        if (!(top in dest))
            dest[top] = {};

        return multitier_write(parts.join('_'), value, dest[top], accessor, field);
    }
    else
    {
        if (accessor)
            dest[key] = accessor.setter(value, field);
        else
            dest[key] = value;

        return value;
    }
}

function multitier_read(key, src, accessor, field)
{
    if (key.indexOf('_') > 0)   // NOT -1, because I don't want to change initial underscore...
    {
        var parts = key.split('_');
        var top = parts.shift();

        if (!(top in src))
            src[top] = {};

        return multitier_read(parts.join('_'), src[top], accessor, field);
    }
    else
    {
        if (accessor)
            return accessor.getter(src[key], field);
        else
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

    var writing = true;
    if (!form)
        writing = false;

    for (key in fields)
    {
        var field = fields[key];

        if (!field.name)
            continue;

        var okay = true;

        var accessor = null;
        if (field.accessor)
            accessor = _accessors[field.accessor];

        if (writing)
        {
            var value = null;
            if (field.name in form)
                value = form[field.name];
            else if (field.type == "truefalse")
            {
                // Stupid HTML. Checkboxes indicate false by being ABSENT. >.<
                value = false;
            }

            var validator = null;
            if (field.validation)
                validator = _validators[field.validation];
            else if (accessor)
                validator = accessor.validator;

            if (validator)
            {
                if (!validator.test(form[field.name], field))
                {
                    okay = false;
                    valid = false;

                    if (validator.error)
                        field.error = validator.error;
                    else
                        field.error = "Not valid!";
                }
            }

            if (okay)
                field.value = multitier_write(field.name, value, values, accessor, field);
            else
                field.value = value;
        }
        else if (!writing)
        {
            field.value = multitier_read(field.name, values, accessor, field);
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
        error: 'Must be a valid 10-digit phone number (punctuation optional)--for example, "4255580299"'
    },

    urlOrEmpty: {
        test: function(str) {
            var trimmed = validation.trim(str);
            if (!trimmed)
                return true;
            return validation.isURL(trimmed, {allow_underscores: true});
        }
    },

    int: {
        test: function(str) {
            return validation.isInt(str, 0, 9999);
        },
        error: "Must be an integer"
    },

    "words=150": {
        test: function(str) {
            return (wordcount(str) <= 150);
        },
        error: "Must be 150 words or fewer"
    },


    "words=100": {
        test: function(str) {
            return (wordcount(str) <= 100);
        },
        error: "Must be 100 words or fewer"
    },

    "words=300": {
        test: function(str) {
            return (wordcount(str) <= 300);
        },
        error: "Must be 300 words or fewer"
    }
};

function find_in_tuples(str, range)
{
    for (var key = 0; key < range.length; key++)
    {
        if (range[key][0] == str)
            return key;
    }

    return -1;
}

var _accessors = {
    simpleArray: {
		beautifier: function(gotten) {
			return gotten;
		},
        getter: function(column) {
            var result = "";
            var first = true;
            for (var key = 0; key < column.length; key++)
            {
                if (first)
                    first = false;
                else
                    result = result + "\n";

                result = result + column[key];
            }
            return result;
        },
        setter: function(str) {
            var results = [];
            var rows = str.split(/[\r\n;]+/);
            for (var key in rows)
            {
                var row = validation.trim(rows[key]);
                if (!row)
                    continue;
                results.push(row);
            }
            return results;
        },
        validator: {
            test: function(str, field) {
                if (!field)
                    return true;

                var max = 0;
                if (field.max)
                    max = validation.toInt(field.max);

                var min = 0;
                if (field.min)
                    min = validation.toInt(field.min);

                if (min == 0 && max == 0)
                    return true;

                var rows = str.split(/[\r\n;]+/);
                var count = 0;
                for (var key in rows)
                {
                    var row = validation.trim(rows[key]);
                    if (!row)
                        continue;
                    ++count;
                }

                if (max > 0 && count > max)
                    return false;

                if (count < min)
                    return false;

                return true;
            },
            error: "Please provide the requested number of entries, one per line"
        }
    },

    roster: {
		beautifier: function(gotten) {
			return gotten;
		},
        getter: function(column) {
            var result = "";
            var first = true;
            for (var key = 0; key < column.length; key++)
            {
                if (first)
                    first = false;
                else
                    result = result + "\n";

                result = result + column[key].name;
                result = result + ", ";
                result = result + column[key].role;
            }
            return result;
        },
        setter: function(str) {
            var results = [];
            var rows = str.split(/[\r\n;]+/);
            for (var key in rows)
            {
                if (!rows[key])
                    continue;

                var parts = rows[key].split(',');
                var result = {};
                result.name = validation.trim(parts.shift());
                result.role = validation.trim(parts.join(','));

                results.push(result);
            }
            return results;
        },
        validator: {
            test: function(str) {
                // TODO
                return true;
            },
            error: "Each line must consist of a name, a comma and their role"
        }
    },

    keywords: {
		beautifier: function(gotten, field) {
			if (!field)
				return JSON.stringify(result);	// Not a good response, but better than crashing

			var result = "";
			var first = true;

			for (var key in gotten)
			{
				var val = "";

				if (gotten[key] != "on")
					continue;	// Not sure how this could happen, but better safe than sorry...

				var match = find_in_tuples(key, field.range);
				if (match < 0)
					val = key;
				else
					val = field.range[match][1];

				if (val)
				{
					if (first)
						first = false;
					else
						result = result + "; ";

					result = result + val;
				}
			}

			return result;
		},
        getter: function(column, field) {
            var results = { };

            for (var key = 0; key < column.length; key++)
            {
                if (!field)
                    results[column[key]] = "on";
                else
                {
                    var match = find_in_tuples(column[key], field.range);
                    if (match < 0)
                    {
                        if (field.acceptOther)
                            results['other'] = column[key];
                    }
                    else
                        results[column[key]] = "on";
                }
            }

            return results;
        },
        setter: function(dict, field) {
            // If we set up the form right, then keywords should come in as a dictionary
            // of truthy values.
            var results = [];
            var other = "";
            for (var key in dict)
            {
                if (field && field.acceptOther && key == 'other')
                    other = dict[key];
                else if (Boolean(dict[key]))
                    results.push(key);
            }
            if (other)
                results.push(other);
            return results;
        },
        validator: {
            test: function(dict, field) {
                var count = 0;
                var max = 0;
                if (field.max)
                    max = validation.toInt(field.max);

                var min = 0;
                if (field.min)
                    min = validation.toInt(field.min);

                for (var key in dict)
                {
                    if (Boolean(dict[key]))
                        ++count;
                }

                if (max > 0 && count > max)
                    return false;

                if (count < min)
                    return false;

                return true;
            },
            error: "Please check a number of boxes within the required range"
        }
    },

    combo: {
		beautifier: function(gotten, field) {
			if (!field)
				return JSON.stringify(result);	// Not a good response, but better than crashing

			if (gotten.other)
				return gotten.other;
			else
			{
				var match = find_in_tuples(gotten.canonical, field.range);
				if (match < 0)
					return gotten.canonical;
				else if (match == 0)
					return "[none]";
				else
					return field.range[match][1];
			}
		},
        getter: function(column, field) {
            if (!column)
                return { canonical: field.range[0][0] };

            for (var key = 0; key < field.range.length; key++)
                if (field.range[key][0] == column)
                    return { canonical: column };

            return { canonical: field.range[field.range.length - 1][0], other: column };
        },
        setter: function(dict) {
            if (dict.other)
                return dict.other;
            else
                return dict.canonical;
        },
        validator: {
            test: function(dict, field) {
                var index = -1;
                if (field.range && dict.canonical)
                {
                    for (var key = 0; key < field.range.length; key++)
                        if (field.range[key][0] == dict.canonical)
                        {
                            index = key;
                            break;
                        }
                }

                if (index == field.range.length - 1)
                    return validation.trim(dict.other);

                return (index > 0);
            },
            error: "Please select a value or enter a custom value"
        }
    }
}

function create_competitor(req, res, next)
{
    if (mongoose.connection.readyState != 1)
        return res.sendStatus(500);

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
		var host =  (process.env.TRUE_HOST || req.get('Host'));
                var url = 'http' + (req.isSSL ? 's' : '') + '://' + host + _root + competitor.authSlug;
                fields.push({ label: "Editing URL", type: "literal",  value: "<a href='" + url + "'>" + url + "</a>"});
            }
            res.render('create_competitor', { fields: fields, error: error, heading: heading });
        });
    }
}

var _pages = [
    {
        heading: "Status",
        fields: [
            { label: "Game Title", name: "title", validation: "nonEmpty" },
            { label: "Team Name", name: "team_name", validation: "nonEmpty" },
            { type: "spacer" },
            { label: "Game Gallery", name: "galleryState", type: "combo", accessor: "combo", range: constants.GALLERY_STATE },
            { type: "spacer" },
            { grouplabel: "Current State",   name: "isDone", type: "truefalse", label: "The game is finished, and/or our team does not intend to work on it any further.", terselabel: "All done?" },
            { label: "Known Bugs", name: "knownBugs", type: "paragraph", validation: "words=300", instructions: "Describe any known bugs in your game." }
        ]
    },

    {
        heading: "Media",
        fields: [
            { label: "Game Gallery", name: "galleryState", type: "combo", accessor: "combo", range: constants.GALLERY_STATE },
            { label: ">URL", name: "galleryURL", validation: "urlOrEmpty" },
            { label: ">Size", name: "gallerySize", validation: "int", instructions: "Please enter the size IN MEGABYTES, rounded up to the next integer. If your game is less than 1MB, just put 1." },
            { type: "spacer" },
            { label: "Screenshots", name: "screenshotState", type: "combo", accessor: "combo", range: constants.SCREENSHOT_SOURCE, instructions: "You must provide at least three high-res JPEG or PNG images (300dpi preferred)." },
            { label: "Video URL", name: "videoURL", validation: "nonEmpty", instructions: "You must provide a link to a YouTube or Vimeo video of your game, between 60 second and 3 minutes in length." }
        ]
    },

    {
        heading: "Key Contacts",
        fields: [
            { label: "Primary Contact", name: "team_primaryContact_name", validation: "nonEmpty", instructions: "The first person we should contact with questions or problems" },
            { label: ">Email", name: "team_primaryContact_email", validation: "email" },
            { label: ">Phone", name: "team_primaryContact_phone", validation: "phone" },
            { label: "Technical Contact", name: "team_technicalContact_name", validation: "nonEmpty", instructions: "The person we should contact with technical issues (in addition to the primary contact)" },
            { label: ">Email", name: "team_technicalContact_email", validation: "email" },
            { label: ">Phone", name: "team_technicalContact_phone", validation: "phone" }
        ]
    },

    {
        heading: "The Team",
        fields: [
            { label: "Team Members", name: "team_roster", type: "array", accessor: "roster", instructions: "One team member per line, with their role following a comma after the name. Example: Jane Doe, International Woman of Mystery." },
            { type: "spacer" },
            { label: "Team Twitter Account", name: "team_twitter", instructions: "(if any)" },
            { label: "Team Facebook Page", name: "team_facebook", instructions: "(if any)" },
            { label: "Team Website", name: "team_website", instructions: "(if any)" },
            { type: "spacer" },
            { grouplabel: "Is anyone on your team...",   name: "team_hasURM", type: "truefalse", label: "A member of a minority, underserved or underrepresented racial or ethnic group in your region of residence", terselabel: "URM team member?" },
            {                                       name: "team_hasWoman", type: "truefalse", label: "A woman (including transgender)", terselabel: "Female team member?" },
            {                                       name: "team_hasDisabled", type: "truefalse", label: "Disabled", terselabel: "Disabled team member?" },
            {                                       name: "team_hasLGBT", type: "truefalse", label: "LGBT", terselabel: "LGBT team member?" }
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
        heading: "Audience",
        fields: [
            { label: "Genre", name: "genre", type: "combo", accessor: "combo", range: constants.GENRES },
            { label: "Keywords", name: "keywords", type: "keywords", max: 3, min: 1, range: constants.KEYWORDS, accessor: "keywords", instructions: "Please select one to three" },
            { label: "Platforms", name: "distributionPlatforms", type: "keywords", min: 1, range: constants.PLATFORMS, accessor: "keywords", acceptOther: true, instructions: "Check all platforms your game supports" },
            { label: "Languages", name: "languages", type: "array", min: 1, accessor: "simpleArray", rows: 3, instructions: 'What human languages (e.g., "English", not "C++") does your game support?' }
        ]
    },


    {
        heading: "Concept",
        fields: [
            { label: "Game Description", name: "description", type: "paragraph", validation: "words=150", instructions: "Please provide a brief description of your game that is as specific as possible about the game mechanic, aesthetics, narrative (if applicable) and experience of playing the game. This gives an overview of your goals with the game, and who the game’s audience may be. It will guide the assignment of judges to your game, and be those judge’s first impression. (max. 150 words)" },
            { label: "Artistic Statement", name: "vision", type: "paragraph", validation: "words=300", instructions: "Please discuss the vision and inspiration behind the game, the context in which it was produced (art game, student game, etc.), and your goals for the design. This is your opportunity to explain to the judges why you made the game, and why you made the choices you did in designing and building it. Point out any creative decisions you feel particularly proud of, or that are particularly important to understanding the game. (max 300 words)" }
        ]
    },

    {
        heading: "Installing the Game",
        fields: [
            { label: "Installation Instructions", name: "installationInstructions", type: "paragraph", validation: "words=100", instructions: "Please enter instructions on how to install and launch the game. Please be explicit about desired technology, and any non-traditional steps taken to install the software. (max. 100 words)" },
            { label: "Input Devices", name: "inputDevices", type: "keywords", range: constants.INPUT_DEVICES, accessor: "keywords", acceptOther: true, instructions: "Check all input devices your game needs" },
            { label: "Other Hardware", name: "hardwareRequirements", type: "keywords", range: constants.HARDWARE_REQUIREMENTS, accessor: "keywords", acceptOther: true, instructions: "Check any other hardware your game needs" },
            { label: "Installation Instructions", name: "softwareRequirements", type: "paragraph", validation: "words=150", instructions: "If your game requires any pre-installed software to run, provide installation instructions and links to the sofware here (max. 150 words)" }
        ]
    },

    {
        heading: "Playing the Game",
        fields: [
            { label: "Duration", name: "duration", type: "combo", accessor: "combo", range: constants.DURATIONS, instructions: "Approximately how long does one play session last?" },
            { label: "Number of Players", name: "players", type: "keywords", min: 1, range: constants.NUM_PLAYERS, accessor: "keywords", acceptOther: true },
            { label: "Gameplay Instructions", name: "gameplayInstructions", type: "paragraph", validation: "words=300", instructions: "Please enter instructions on how to play the game. Include your desire to have judges play or not play tutorials, levels you want judges to begin on, and a point you’d like judges to reach to see the full breadth of the game. If this point requires a massive time investment, consider providing a shortcut, and instructions on how to access it. INCLUDE ALL OF YOUR CHEAT CODES HERE! (max 300 words)" }
        ]
    },

    {
        heading: "All Done!",
        fields: []
    }
];

function get_breadcrumbs(page, slug)
{
    var results = [];

    for (var key = 0; key < _pages.length; key++)
    {
        var str = (key+1).toString();
        var crumb = [ str ];
        if (key == page)
            crumb.push('#');
        else
            crumb.push(_root + slug + '/' + str);

        results.push(crumb);
    }

    return results;
}

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
        return res.sendStatus(500);

    var locals = {
        error: null
    };

    var page = sanitize_page(validation.toInt(req.params.page) - 1);
    locals.isPrev = (page > 0);
    locals.isNext = (page < (_pages.length - 1));
    locals.breadcrumbs = get_breadcrumbs(page, req.params.slug);

    locals.heading = _pages[page].heading;
    var fields = JSON.parse(JSON.stringify(_pages[page].fields));
    locals.fields = fields;
    locals.message = _pages[page].message;

    var query = Competitor.findOne().where('authSlug', req.params.slug);
    var select = "";
    for (key in fields)
    {
        if (fields[key].name)
            select = select + column_from_field(fields[key].name) + ' ';
    }
    query.select(select);
    query.exec(function(err, competitor) {
        if (err || !competitor)
            return res.send(404);

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
						competitor.stateValid = false;
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
        }
    });
}

function page_fields()
{
	var results = {};
	_pages.forEach(function(value, index, all) {
		var select = [];
		if (value.fields)
		{
			value.fields.forEach(function(field, field_index, fields) {
				if (field.name)
				{
					select.push(field.name);
				}
			});
		}
		results[value.heading] = select;
	});
	return results;
}

function review_competitor(competitor, callback)
{
	var verbose = (process.env.NODE_ENV != "production");
	var field_count = 0;
	var valid_count = 0;

	_pages.forEach(function(page, page_index, all_pages) {
		// page.heading = (eg) "Key Contacts"
		if (page.fields)
		{
			page.fields.forEach(function(field, field_index, all_fields) {
				if (field.name)
				{
					var value = multitier_read(field.name, competitor);

					var validator = null;
					if (field.validation)
						validator = _validators[field.validation];

					var okay = true;
					if (!value)
						value = "";
					if (validator)
					{
						field_count += 1;
						okay = validator.test(value, field);
						if (okay)
							valid_count += 1;
						else if (verbose)
							console.log(field.name);
					}
				}
			});
		}
	});

	if (field_count < 1)
		return callback("Configuration error");

	if (verbose)
		console.log("REVIEWED " + competitor._id + ": " + valid_count + '/' + field_count + ' (' + competitor.authSlug + ')');

	competitor.statePercentage = valid_count / field_count;
	competitor.stateValid = true;
	competitor.save(callback);
}



















































/*	var pages = page_fields();

	async.each(Object.keys(pages), function(key, next) {
		var select = pages[key];
		console.log(JSON.stringify(select));
		if (select)
		{
			select.forEach(function(field, index, all) {
				var value = competitor.get(field);
				if (typeof(value) == "undefined" || value == null)
//				console.log(field + ': "' + competitor.get(field) + '" [' + typeof(value) + ']');
			});
			next();
		}
		else
		{
			next();
		}
	}, function (err) {
		if (err)
			return callback(err);

		// TODO SAVE competitor.state!
		competitor.stateValid = false;
		competitor.save(callback);
	});*/

function review_as_needed(callback)
{
	var query = Competitor.find().where('stateValid').ne(true);
	query.exec(function(err, documents) {
		if (err)
			callback(err);
		else
			async.each(documents, review_competitor, callback);
	});
}



function get_dashboard(req, res, next)
{
	if (mongoose.connection.readyState != 1)
		return res.sendStatus(500);

	review_as_needed(function(err) {
		if (err)
			res.render('plain', { body: err });
		else
		{
			var query = Competitor.find().where({'stateValid': true});
			query.select('_id title team.name team.primaryContact.email authSlug state createdAt lastEditedAt statePercentage');
			query.exec(function(err, documents) {
				if (err)
					res.render('plain', { body: err });
				else
				{
					var entries = [];
					documents.forEach(function(document, index, all_documents) {
						var entry = {};
						entry.title = document.title;
						entry.team = "";
						if (document.team)
							entry.team = document.team.name;
						entry.email = "";
						if (document.team)
							if (document.team.primaryContact)
								entry.email = document.team.primaryContact.email;
						entry.state = document.state;
						entry.view = _root + 'view/' + document._id;
						entry.edit = _root + document.authSlug;
						entry.pct = validation.toInt(0.5 + (document.statePercentage * 100));
						entry.edited = moment(document.lastEditedAt).tz('America/Los_Angeles').format("MMM D 'YY @ HH:mm");
						entry.created = moment(document.createdAt).tz('America/Los_Angeles').format("MMM D 'YY @ HH:mm");
						entries.push(entry);
					});
					res.render('dashboard', { entries: entries });
				}
			});
		}
	});
}

function view_entry(req, res, next)
{
	if (mongoose.connection.readyState != 1)
		return res.sendStatus(500);

	var _id = null;
	try
	{
		_id = mongoose.Types.ObjectId(req.params.id);
	}
	catch (ex)
	{
		_id = null;
	}

	if (!_id)
		return res.sendStatus(404);

	Competitor.findById(_id, function(err, competitor) {
		if (!err && !competitor)
			return res.sendStatus(404);

		if (err)
		{
			console.log(err);
			return res.sendStatus(500);
		}

		var dump = [];

		_pages.forEach(function(page, page_index, all_pages) {
			if (page.fields)
			{
				page.fields.forEach(function(field, field_index, all_fields) {
					if (field.name)
					{
						var accessor = null;
						if (field.accessor)
							accessor = _accessors[field.accessor];

						var pair = { };

						if (field.terselabel)
							pair.key = field.terselabel;
						else
							pair.key = field.label;

						pair.value = multitier_read(field.name, competitor, accessor, field);
						if (accessor)
							pair.value = accessor.beautifier(pair.value, field);

						if (typeof(pair.value) == "boolean")
							pair.value = (pair.value ? "yes" : "no");
						else if (!pair.value)
							pair.value = "[none]";

						dump.push(pair);
					}
				});
			}
		});

		res.render('view_competitor', { title: competitor.title, team: competitor.team.name, fields: dump });
	});
}

exports.register = function(app, root, auth)
{
    _root = root;

    if (auth == null)
        auth = [];

    app.all(root + 'create', auth, create_competitor);
	app.get(root, auth, get_dashboard);
	app.get(root + 'dashboard', auth, get_dashboard);
	app.get(root + 'view/:id', auth, view_entry);

	// These have to be last, because :slug will catch everything!
    app.all(root + ':slug/:page', edit_competitor);
	app.all(root + ':slug', edit_competitor);
}
