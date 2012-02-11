/**
 * Article quality visualization mediawiki gadget
 *  for the San Francisco Mediawiki Hackathon, 2012
 *  for more information, see https://www.mediawiki.org/wiki/January_2012_San_Francisco_Hackathon
 *
 * By: Ben Plowman, Mahmoud Hashemi, Sarah Nahm, and Stephen LaPorte
 *
 * Copyright 2012
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

// if this page is on a mediawiki site, change to testing to false:
var testing = true;


var page_stats = {};
var rewards = {};

if(testing == true) {
    var page_title = 'Charizard';
    var revid = 471874316;
    var articleId = 24198906;
} else {
    var page_title = mw.config.get('wgTitle');
    var revid = mw.config.get('wgCurRevisionId');
    var articleId = mw.config.get('wgArticleId');
}

// Convenience functions for reward formulae
function binStat(threshold, great, reward) {
    return {'type':'bin','threshold': threshold, 'great': great,'reward': reward};
}

function rangeStat(start, end, max_score) {
    return {'type':'range','start':start,'threshold':end,'reward':max_score};
}

/*
 * Metrics for article quality
 */
var rewards = {
    'vetted': {
        'unique_authors'        : binStat(20, 40, 100),
        'paragraph_count'       : rangeStat(10, 30, 100)
    },
    // rewards['vetted']['wikitrust_score'] = binStat(.;
    // rewards.vetted.['visits_per_last_edit'] = ;
    // rewards.vetted.['flags_total'] = ;
    'structure': {
        'ref_section'           : binStat(1, 1, 100),
        'external_links_total'  : binStat(10, 20, 100)
    },
    // rewards.structure.intro_paragraph = ;
    // rewards.structure.sections_per_link = binStat(;
    'richness': {
        'image_count'           : binStat(2, 4, 100),
        'external_links_total'  : binStat(10, 20, 100)
    },
    // rewards.richness.length = ;
    // rewards.richness.audio = ;
    // rewards.geodata = ;
    'integrated': {
        'category_count'        : binStat(3, 5, 100),
        'incoming_links'        : binStat(3, 50, 100),
        'outgoing_links'        : binStat(3, 50, 100)
    },
    //rewards.integrated.read_more_section = ;
    'community': {
        'unique_authors'        : binStat(20, 40, 100)
    },
    //rewards.community.assessment = ;
    //rewards.community.visits_per_day = ;
    //rewards.community.visits_per_last_edit = ;
    //rewards.community.flags_total = ;
    //rewards.community.trustworthy = ;
    //rewards.community.objective = ;
    //rewards.community.complete = ;
    //rewards.community.wellwritten = ;
    'citations': {
        'ref_count'             : binStat(5, 10, 100)
    },
    //rewards.citations.reference_count_per_paragraph = ;
    //rewards.citations.citation_flag = ;
    'significance': {

    }
    //rewards.significance.paragraph_per_web_results = {};
    //rewrads.significance.paragraph_per_news_results = {};
    //rewards.significance = binStat(;
}

function keys(obj) {
    var ret = [];
    for(var k in obj) {
        if obj.hasOwnProperty(k) {
            ret.push(k);
        }
    }
    return ret;
}


function do_query(url, complete_callback, kwargs) {
    name = name || url;
    var all_kwargs = {
        url: url,
        dataType: 'jsonp',
        timeout: 1000, // TODO: convert to setting. Necessary to detect jsonp error.
        success: function(data) {
            complete_callback(data);
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log('jqXHR: ' + jqXHR + ', textStatus: ', + textStatus + ', errorThrown: ' + errorThrown);
            complete_callback(jqXHR, textStatus, errorThrown);
        }
    };

    for (key in kwargs) {
        if(kwargs.hasOwnProperty(key)) {
            all_kwargs[key] = kwargs[key];
        }
    }
    $.ajax(all_kwargs);
}

var basic_query = function(url) {
    return function(callback) {
        do_query(url, callback);
    };
}

var yql_query = function(yql, format) {
    var kwargs = {data: {q: yql, format: format}};

    return function(callback) {
        do_query('http://query.yahooapis.com/v1/public/yql', callback, kwargs);
    }
}


// One limitation on this model (easily refactored): calculators can't read from data
// they can only write to it. Mostly this is because we don't know what will or won't
// be present.

// TODO: refactor to allow inputs without fetches. pass in DOM/global-level input data
var make_evaluator = function() {

    var self     = {};

    self.data    = {};
    self.results = null;
    self.inputs  = [];

    self.add_input = function(name, fetch, calculate) {
        // name is mostly for error messages/debugging
        // source is a callable that takes a callback
        // calculator is a callable that takes data from source and returns results
        inputs.push({'name':name, 'fetch':fetch, 'calculate':calculate});
    };

    var input_done = function(input, data, complete_callback) {
        var all_results = [];

        input.data = data;
        for (var i = 0; i < inputs.length; ++i) {
            if (inputs[i].data)
                all_results.push(inputs[i].data);
        }

        if (all_results.length == inputs.length)
            complete_callback(all_results);
    };

    var done_processing = false;
    var process_inputs = function(callback) {
        if (done_processing)
            return;
        if (self.inputs.length == 0) {
            //done_processing = true;
            //callback(); // TODO, I guess. so tired.
        }
        for (var i = 0; i < inputs.length; ++i) {
            // TODO: try/except
            var save_callback = function() { $.extend(self.data, calculate(arguments));
                                             input_done(inputs[i], arguments, callback);
                                           };
            input.fetch(save_callback);
        }
    };

    self.get_score = function() {
        if (self.results) {
            return self.results;
        } else {
            // next step. process inputs (callback to calculate). block?
        }
    };

    var calculate = (stats, rewards) {
        var result = {},
        val = 0;
        for(var area in rewards) {
            for(var attr in area) {
                var r = rewards[area][attr], // reward structure for this area/attr combo
                s = stats[attr]; // score of the page for this attribute
                if(r.type == 'bin') {
                    if( s >= r.great ) {
                        val = r.reward;
                    } else if ( s >= r.threshold ) {
                        val = r.reward * .7; // TODO: make tuneable?
                    }
                } else if (r.type == 'range') {
                    var slope = r.reward / r.start;
                    if( s < r.start) {
                        val = s * slope;
                    } else if( s > r.threshold){
                        val = (r.reward - (s - r.threshold)) * slope;
                        val = Math.max(0, val);
                    } else {
                        val = r.reward;
                    }
                }


                result[area]       = result[area] || {};
                result[area].score = result[area].score + val || val;
                result[area].max   = result[area].max + r.reward || r.reward;

                result.total       = result.total || {};
                result.total.score = result.total.score + val || val;
                result.total.max   = result.total.max + r.reward || r.reward;
            }
        }
        return result;
    }



    return self;
}

var ev = make_evaluator();

// TODO these inputs should be callable objects. add a 'source' attribute to a function and add that as an input to the evaluator.
ev.add_input('domStats', basic_query('http://en.wikipedia.org/w/api.php?action=parse&page=' + page_title + '&format=json'), domStats);
ev.add_input('editorStats', basic_query('http://en.wikipedia.org/w/api.php?action=query&prop=revisions&titles=' + page_title + '&rvprop=user&rvlimit=50&format=json'), editorStats);
ev.add_input('inLinkStats', basic_query('http://en.wikipedia.org/w/api.php?action=query&format=json&list=backlinks&bltitle=' + page_title + '&bllimit=500&blnamespace=0&callback=?'), inLinkStats);
ev.add_input('feedbackStats', basic_query('http://en.wikipedia.org/w/api.php?action=query&list=articlefeedback&afpageid=' + articleId + '&afuserrating=1&format=json&afanontoken=01234567890123456789012345678912', feedbackStats));
ev.add_input('searchStats', basic_query('http://ajax.googleapis.com/ajax/services/search/web?v=1.0&q=' + page_title), searchStats);
ev.add_input('newsStats', basic_query('http://ajax.googleapis.com/ajax/services/search/news?v=1.0&q=' + page_title), newsStats);
ev.add_input('wikitrustStats', yql_query('select * from html where url ="http://en.collaborativetrust.com/WikiTrust/RemoteAPI?method=quality&revid=' + revid + '"', 'json'), wikitrustStats);
ev.add_input('grokseStats', yql_query('select * from json where url ="http://stats.grok.se/json/en/201201/' + page_title + '"', 'json'), grokseStats);
ev.add_input('getAssessment', basic_query('http://en.wikipedia.org/w/api.php?action=query&prop=revisions&titles=Talk:' + page_title + '&rvprop=content&redirects=true&format=json'), getAssessment);

function domStats(data) {
    var wikitext = data['parse']['text']['*'],
    ret      = {};

    ret.ref_count = $('.reference', wikitext).length;
    ret.paragraph_count = $('.mw-content-ltr p').length;
    ret.image_count = $('img', wikitext).length;
    ret.category_count = data['parse']['categories'].length;
    ret.reference_section_count = $('#References', wikitext).length;
    ret.external_links_section_count = $('#External_links', wikitext).length;
    ret.external_links_in_section = $('#External_links', wikitext).parent().nextAll('ul').children().length;
    ret.external_links_total = data['parse']['externallinks'].length;
    ret.internal_links = data['parse']['links'].length;
    ret.intro_p_count =  $('.mw-content-ltr p', wikitext).length;

    ret.ref_needed_count = $('span:contains("citation needed")', wikitext).length;
    ret.pov_statement_count = $('span:contains("neutrality")', wikitext).length;
    ret.pov_statement_count = $('span:contains("neutrality")', wikitext).length;

    return ret;
}

function editorStats(data) {
    var ret = {};
    for(var id in data['query']['pages']) {
        var author_counts = {};
        if(!data['query']['pages'].hasOwnProperty) {
            continue;
        }
        var editor_count = data['query']['pages'][id]['revisions'];
        for(var i = 0; i < editor_count.length; i++) {
            if(!author_counts[editor_count[i].user]) {
                author_counts[editor_count[i].user] = 0;
            }
            author_counts[editor_count[i].user] += 1;
        }
        ret.author_counts = author_counts;
    }
    ret.unique_authors = keys(page_stats.author_counts).length;

    return ret;
}


function inLinkStats(data) {
    //TODO: if there are 500 backlinks, we need to make another query
    var ret = {}
    ret.incoming_links = data['query']['backlinks'].length;
    return ret;
}

function feedbackStats(data) {
    var ret = {};

    var ratings = data['query']['articlefeedback'][0]['ratings'];
    var trustworthy = ratings[0];
    var objective = ratings[1];
    var complete = ratings[2];
    var wellwritten = ratings[3];

    ret.fbTrustworthy = trustworthy['total'] / trustworthy['count'];
    ret.fbObjective = objective['total'] / objective['count'];
    ret.fbComplete = complete['total'] / complete['count'];
    ret.fbWellwritten = wellwritten['total'] / wellwritten['count'];

    return ret;
}

function searchStats(data) {
    var ret = {};
    ret.google_search_results = parseInt(data['responseData']['cursor']['estimatedResultCount']);
    return ret;
}

function newsStats(data) {
    var ret = {};
    ret.google_news_results = parseInt(data['responseData']['cursor']['estimatedResultCount'], 10);
    return ret;
}

function wikitrustStats(data) {
    var ret = {};
    ret.wikitrust = parseFloat(data.query.results.body.p);
    return ret;
}

function grokseStats(data) {
    var ret = {};
    ret.pageVisits = data.query.results.json;
    return ret;
}

function getAssessment(data) {
    var ret = {};
    for(var id in data['query']['pages']) {
        if(!data.query.hasOwnProperty('pages')) { // TODO: fixed now, but what does this even do?
            continue;
        }
        var text = (data.query.pages[id].revisions['0']['*']);
        /* From the 'metadata' gadget
         * @author Outriggr - created the script and used to maintain it
         * @author Pyrospirit - currently maintains and updates the script
         */
        var rating = 'none';
        if (text.match(/\|\s*(class|currentstatus)\s*=\s*fa\b/i))
            rating = 'fa';
        else if (text.match(/\|\s*(class|currentstatus)\s*=\s*fl\b/i))
            rating = 'fl';
        else if (text.match(/\|\s*class\s*=\s*a\b/i)) {
            if (text.match(/\|\s*class\s*=\s*ga\b|\|\s*currentstatus\s*=\s*(ffa\/)?ga\b/i))
                rating = 'a/ga'; // A-class articles that are also GA's
            else rating = 'a';
        } else if (text.match(/\|\s*class\s*=\s*ga\b|\|\s*currentstatus\s*=\s*(ffa\/)?ga\b|\{\{\s*ga\s*\|/i)
                   && !text.match(/\|\s*currentstatus\s*=\s*dga\b/i))
            rating = 'ga';
        else if (text.match(/\|\s*class\s*=\s*b\b/i))
            rating = 'b';
        else if (text.match(/\|\s*class\s*=\s*bplus\b/i))
            rating = 'bplus'; // used by WP Math
        else if (text.match(/\|\s*class\s*=\s*c\b/i))
            rating = 'c';
        else if (text.match(/\|\s*class\s*=\s*start/i))
            rating = 'start';
        else if (text.match(/\|\s*class\s*=\s*stub/i))
            rating = 'stub';
        else if (text.match(/\|\s*class\s*=\s*list/i))
            rating = 'list';
        else if (text.match(/\|\s*class\s*=\s*sl/i))
            rating = 'sl'; // used by WP Plants
        else if (text.match(/\|\s*class\s*=\s*(dab|disambig)/i))
            rating = 'dab';
        else if (text.match(/\|\s*class\s*=\s*cur(rent)?/i))
            rating = 'cur';
        else if (text.match(/\|\s*class\s*=\s*future/i))
            rating = 'future';
        ret.assessment = rating; // TODO: doesn't this belong outside the loop?
    }
    return ret;
}

function ollKomplete(){

    var score = calculate(page_stats, rewards);
    var ratio = (score.total.score+0.0)/score.total.max;

    var percent = Math.round(ratio * 100);
    $('div.top').css('width', percent+'px');
    $('div.bottom').css('width', (100-percent)+'px');
    $('#overall_percent').text(percent+'%');

}


$(document).ready(function() {

    $("#bodyContent").prepend("<div id='quality'><div class='quality_bar'></div></div>");
    var box = $('#quality');
    var bar = $('.quality_bar');

    bar.append('<div><p class="bar_text">Overall quality: </p></div><div id="overall_graph"><div class="top"></div><div class="bottom"></div></div><div class="headline" id="overall_percent"></div>');
    bar.append('<div><p class="bar_text">Improve this score by adding: </p><p class="list"><p>...</p></div>');



});
