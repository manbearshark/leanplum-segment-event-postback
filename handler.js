'use strict';

const axios = require('axios');

const SEGMENT_URL = process.env.SEGMENT_URL;
const SOURCE_KEY = process.env.SOURCE_KEY;

module.exports.lpEventTransformer = async (event, context, callback) => {

  // LP Request format:
  //
  // [URL path to this Lambda]?message_id={{Message ID}}
  //   %26event={{Message event}}%26device_id={{Device ID}}
  //   %26userId={{User ID}}%26timestamp={{Trigger time}}
  //   %26channel={{Message channel}}%26template_name={{Template name}}
  //   %26parameters={{Parameters}}%26abTestID={{AB test ID}}
  //   %26variantID={{Variant ID}}
  //
  // The code below assumes that this is the format that will be used to
  // set up postbacks.
  //
  // This is intended to act as an endpoint for both AB Test events and for
  // message events, as Lean Plum wants to get two separate endpoints for each
  // for some reason

  let response = {
    statusCode: 200,
    body: null
  };

  console.log("Raw Event: ", event);
  
  let eventParams = mapToSegment(event.queryStringParameters);
  if( eventParams == null) {
    response.statusCode = 500;
    response.body = "Could not parse event parameters.";
  } else {
    console.log(eventParams);
    try {
      track(eventParams);
    } catch (e) {
      console.log("ERROR - could not send event: ", e.message);
      response.statusCode = 500;
      response.body = e.message;
    }
  }

  callback(null, response);
};

function isBlank(str) {
    return (!str || /^\s*$/.test(str));
}

async function post(data, token, url) {
  let stringJSON = JSON.stringify(data);
  try {
    const response = await axios({
      method: "POST",
      url: url,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      auth: {
        username: token,
        password: ""
      },
      data: stringJSON
    });
    return response;
  } catch (e) {
    throw e;
  }
}

function mapToSegment(eventParams) {
  try {
    eventParams.properties = {};

    // LP sends Unix epoch time stamps in ms
    eventParams.timestamp = new Date(parseInt(eventParams.timestamp)).toISOString();

    if(eventParams.abTestID) {
      eventParams.event = "AB Test";
      eventParams.properties.abTestID = eventParams.abTestID;
      eventParams.properties.variantID = eventParams.variantID;
    } else {
      eventParams.event = eventParams.channel + " " + eventParams.event;
    }

    if(isBlank(eventParams.userId)) {
      eventParams.userId = null;
    }

    if(!isBlank(eventParams.device_id)) {
      eventParams.context = { device: { id: eventParams.device_id }};
    } else {
      eventParams.context = {};
    }

    if(!isBlank(eventParams.parameters)) {
      // LP sends URL encoded JSON for the event parameters
      let params = JSON.parse(decodeURIComponent(eventParams.parameters));
      eventParams.properties = Object.assign(eventParams.properties, params);
    }

    return { timestamp: eventParams.timestamp,
             event: eventParams.event,
             userId: eventParams.userId,
             context: eventParams.context,
             properties: eventParams.properties };
  } catch (e) {
    console.log("ERROR - Could not map event properties: ", e.message);
    return null;
  }
}

async function track({event, properties, timestamp, userId, context}) {
  try {
    await post({userId, properties, event, timestamp, context},
      SOURCE_KEY, `${SEGMENT_URL}/track`);
  } catch (e) {
    throw e;
  }
}

async function identify(userId, traits) {
  try {
    await post({userId, traits: { ...traits }},
      SOURCE_KEY, `${SEGMENT_URL}/identify`);
  } catch (e) {
    throw e;
  }
}
