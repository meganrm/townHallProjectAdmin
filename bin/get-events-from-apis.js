#!/usr/bin/env node

const scrapingModule = require('../server/lib/scraping');
const facebookModule = require('../server/eventScraping/scrapeFacebook');
const eventBriteModule = require('../server/eventScraping/scrapeEventbrite');

const submitPromises = (promises, transformFunction, existingTownHallIds, prefix, flag) => {
    Promise.all(promises).then(res => {
    // Stop gap measure for while we have bad eventbrite id data and are getting undefined
        res = res.filter(eventCollection => {
            if (Array.isArray(eventCollection)) {
                return eventCollection;
            }
        });
        // Collapse into flat array
        var eventsArray = [].concat.apply([], res);
        let allIdsInReturnedData = eventsArray.map(townhallevent => (prefix + townhallevent.id));
        // removed all ids that are already in the database.
        var newEventIds = scrapingModule.removeExistingIds(existingTownHallIds, allIdsInReturnedData);
        eventsArray.forEach(eventToSubmit => {
            if (newEventIds.indexOf(prefix + eventToSubmit.id) > -1) {
                scrapingModule.submitTownhall(transformFunction(eventToSubmit, flag))
        .then(console.log)
        .catch((error) => {
            console.log('error submitting', error);
        });
            } else {
                console.log('already submitted', prefix + eventToSubmit.id);
            }
        });
    }).catch((error) => {
        console.log(`error with ${prefix} Promise`, error);
    });
};

// Res is an object with existingTownHallIds and MoCs
scrapingModule.getTownhalls().then(res => {
    let existingTownHallIds = res.existingTownHallIds;
    let MoCs = res.MoCs;
    let facebookPromises = [];
    let facebookCampaignPromises = [];
    let eventbritePromises = [];
    let date = new Date().toISOString().split('.')[0]; // ISO without fractions of a second or timezone

    Object.keys(MoCs).forEach(id => {
        let MoC = MoCs[id];
        if (MoC.in_office) {
            if (MoC.hasOwnProperty('facebook_official_account') && MoC.facebook_official_account && MoC.facebook_official_account.length > 0) {
                // facebookPromises.push(facebookModule.createFacebookQuery(MoC, MoC.facebook_official_account));
            } else if (MoC.hasOwnProperty('facebook_account') && MoC.facebook_account && MoC.facebook_account.length > 0) {
                // facebookPromises.push(facebookModule.createFacebookQuery(MoC, MoC.facebook_account));
            }
            if (MoC.hasOwnProperty('facebook_campaign_account') && MoC.facebook_campaign_account && MoC.facebook_campaign_account.length > 0) {
                // facebookCampaignPromises.push(facebookModule.createFacebookQuery(MoC, MoC.facebook_campaign_account));
            }
            if (MoC.in_office && MoC.hasOwnProperty('eventbrite_id') && typeof MoC.eventbrite_id ==='number') {
                eventbritePromises.push(eventBriteModule.createEventbriteQuery(MoC, date));
            }
        }
    });
    // submitPromises(facebookCampaignPromises, facebookModule.transformFacebookTownhall, existingTownHallIds, 'fb_', 'campaign');
    // submitPromises(facebookPromises, facebookModule.transformFacebookTownhall, existingTownHallIds, 'fb_');
    submitPromises(eventbritePromises, eventBriteModule.transformEventbriteTownhall, existingTownHallIds, 'eb_');
});
