// {} = hash
sitesData = {};
// [] = array, which we use for push/pop
Questions = [];
// Kill Switch
PauseAPI = false;


$.ajax(
        {
            url: "sites.json",
            dataType: "json",
            success: function (sitesInput) {
                for (var i = 0; i < sitesInput.items.length; i++) {
                    if (/meta/i.test(sitesInput.items[i].site_url)) {
                        console.log("found a meta, skipping.");
                    }
                    else if (/sex/i.test(sitesInput.items[i].site_url)) {
                        console.log("sexuality found, skipping.")
                    }
                    else {
                        sitesData[sitesInput.items[i].site_url] = sitesInput.items[i];
                    }

                }
                console.log(sitesData);
            }
});

function addQuestionNULL() {
    // null function for testing
    return;
}

function SocketsCallback(e) {
    q = { 
        "titleEncodedFancy": e.titleEncodedFancy,
        "ownerDisplayName": e.ownerDisplayName,
        "siteBaseHostAddress": e.siteBaseHostAddress
    }
    if (q.siteBaseHostAddress == "stackoverflow.com") {
        console.log("Got entry from site " + q.siteBaseHostAddress + " from realtime");
        addQuestion(q);
    }
}


function addQuestion(q) {
    var qRegexp = /^\bwho\b|\bwhat\b|\bwhere\b|\bwhen\b|\bwhy\b|\bhow\b|.*?\?$/i;
    if (qRegexp.test(q.titleEncodedFancy)) {
        if (Object.keys(Questions).length <= 150) {
            randomBinary = Math.round(Math.random());
            if (randomBinary) {
                console.log("Coin tossed, pushing question to end of array!");
                Questions.push(q);
            }
            else {
                console.log("Coin tossed, pushing question to beginning of array!");
                Questions.unshift(q);
            }
        }

    }
    else
    {
        console.log("Question ignored: " + q.titleEncodedFancy);
    }
}
function getPollingUrl() {
    var time = Math.floor((new Date().getTime()) / 1000);
    return '/questions/poll-realtime?since=' + time;
}
function randomKey(obj) {
    var ret;
    var c = 0;
    for (var key in obj)
        if (Math.random() < 1 / ++c)
            ret = key;
    return ret;
}
function getQuestionsFromAJAXAPI() { 
    targetSite = randomKey(sitesData);
    console.log(targetSite);
    console.log("Pulling more questions from API.  Current winner: " + sitesData[targetSite].api_site_parameter);
    $.ajax({
        type: "GET",
        cache: false,
        dataType: "jsonp",
        data: {
            key: "edpyDS1DZ9KbHZwBS5DIvw((",
            order: "desc",
            sort: "activity",
            site: sitesData[targetSite].api_site_parameter
        },
        url: "http://api.stackexchange.com/2.1/questions"
    }).done(function (data) {
        data.items.forEach(function (item) {
            addQuestion({
                titleEncodedFancy: item.title,
                ownerDisplayName: item.owner.display_name,
                siteBaseHostAddress: sitesData[targetSite].site_url
            });
        });
    });
}
function hideDisplay()
{
    console.log("HideDisplay fired.  Questions enqueued: " + Object.keys(Questions).length);
    if ($(".question").hasClass("visible"))
        $(".question").toggleClass("visible");
    if (!$(".question").hasClass("hidden"))
        $(".question").toggleClass("hidden");

    if (Object.keys(Questions).length ==0)
    {
        // we need time to get questions, so we'll wait till next timer fire to show any of the api-gathered questions.
        if (!PauseAPI)
            getQuestionsFromAJAXAPI();
    }
    setTimeout(showDisplay,3000);
}

function showDisplay()
{
    console.log("ShowDisplay fired.  Questions enqueued: " + Object.keys(Questions).length);
    if ($(".question").hasClass("hidden"))
        $(".question").toggleClass("hidden");

    if (!$(".question").hasClass("visible"))
        $(".question").toggleClass("visible");

    if (Object.keys(Questions).length == 0)
    {
        getQuestionsFromAJAXAPI();
        console.log("queue was empty, so we're gonna ask the API and return.");
        setTimeout(hideDisplay,3000);
        return;
    }

    q=Questions.pop();
    try
    {
        document.getElementById("questiontext").innerHTML = q.titleEncodedFancy;
        document.getElementById("author").innerHTML = "- " + q.ownerDisplayName;
        document.getElementById("queuesize").innerHTML = Object.keys(Questions).length;
        if ((/http:\/\//).test(q.siteBaseHostAddress))
            siteLogo=sitesData[q.siteBaseHostAddress].icon_url;
        else
            siteLogo=sitesData["http://"+q.siteBaseHostAddress].icon_url;
        document.getElementById("logo48").src = siteLogo;
        console.log("Displaying question from " + q.siteBaseHostAddress + ": " + q.titleEncodedFancy);
    } catch(err)
    {
        alert(err);
        console.log("exception: queue was likely undefined.  Why does this happen?  Resetting the flip-flop.");
        var vDebug = "";
        for (var prop in err)
        {
            vDebug += "property: "+ prop+ " value: ["+ err[prop]+ "]\n";
        }
        vDebug += "toString(): " + " value: [" + err.toString() + "]";
        console.log(vDebug);
        setTimeout(hideDisplay, 1000);
        return;
    }
    setTimeout(hideDisplay,7000);
}

