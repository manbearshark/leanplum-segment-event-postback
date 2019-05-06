'use strict';

const axios = require('axios');

const SEGMENT_URL = process.env.SEGMENT_URL;
const SOURCE_KEY = process.env.SOURCE_KEY;

module.exports.eventTransformer = async (event, context, callback) => {
  const leanPlumEvent = JSON.parse(event.queryStringParameters)  // LP sends event data in QS params
  let response = {
    statusCode: 200,
    body: null
    }),
  };

  console.log(leanPlumEvent);

  try {
    leanPlumEvent.timeStamp = new Date(leanPlumEvent.time).toISOString();  // LP sends Unix epoch time stamps in ms
    leanPlumEvent.eventName = leanPlumEvent.channel + " " + leanPlumEvent.event;

    if(!isBlank(leanPlumEvent.user_id)) {
      leanPlumEvent.userId = leanPlumEvent.user_id;
    }

    if(!isBlank(leanPlumEvent.device_id)) {
      leanPlumEvent.context = { device: { id: leanPlumEvent.device_id }};
    }

    await track(leanPlumEvent);
  } catch (e) {
    console.log(e);
    response.statusCode = 500;
    response.body = JSON.stringify({message: e.message});
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

async function track({eventName, properties, timestamp, userId, context}) {
  try {
    await post({userId, properties, event: eventName, timestamp},
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
