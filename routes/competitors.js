var async = require('async');
var CompetitorSchema = require('../models/competitor');
var moment = require('moment');

var mongoose = require('mongoose');
if (mongoose.connection.readyState == 0)
    mongoose.connect(process.env.MONGOLAB_URI);

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



exports.register = function(app, root, middleware)
{
    _root = root;
    _breadcrumbs = [];

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