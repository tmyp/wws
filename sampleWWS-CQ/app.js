"use strict";

var bodyParser = require('body-parser');
var createError = require('http-errors');
var express = require('express');
var path = require('path');
//var cookieParser = require('cookie-parser');
var logger = require('morgan');
var request = require('request');
var requestjs = require("request-json");
var crypto = require("crypto");

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var watson = require('watson-developer-cloud');

var assistant = new watson.AssistantV1({
  username: '995b8a5c-1b0f-42be-9ab3-953a3898a59c',
  password: 'myL1jIRGBTqV',
  version: '2018-02-16'
});
var WORKSPACE_ID = "{your_WORKSPACE_ID}";

var APP_ID = "{your_APP_ID}";
var APP_SECRET = "{your_APP_SECRET}";
var SPACE_ID = "{your_SPACE_ID}";
var APP_WEBHOOK_SECRET = "{your_APP_WEBHOOK_SECRET}";

const WWS_URL = "https://api.watsonwork.ibm.com"
const AUTHORIZATION_API = "/oauth/token";
const OAUTH_ENDPOINT = "/oauth/authorize";

var app = express();
app.use(express.static(path.join(__dirname, '/public')));
var jsonParser = bodyParser.json();


function getJWTToken(userid, password, callback){
  const authentificationOptions = {
    "method":"POST",
    "url":`${WWS_URL}${AUTHORIZATION_API}`,
    "auth":{
      "user":userid,
      "pass":password
    },
    "form":{
      "grant_type":"client_credentials"
    }
  };

  request(authentificationOptions, function(err, response, authentificationBody){
     if(response.statusCode !== 200){
       console.log("ERROR: App cant authenticate");
       callback(null);
     }
     const accessToken = JSON.parse(authentificationBody).access_token;
     callback(accessToken)
   });
};

function postMessageToSpace(spaceId, accessToken, textMsg, callback){
  var jsonClient = requestjs.createClient(WWS_URL);
  var urlToPostMessage = "/v1/spaces/" + spaceId + "/messages";
  jsonClient.headers.jwt = accessToken;

  var messageData = {
    type:"appMessage",
    version:1.0,
    annotations:[
      {
        type:"generic",
        version:1.0,
        color:"#00B6CB",
        text:textMsg
      }
    ]
  };



  console.log("Message body : %s", JSON.stringify(messageData));

  jsonClient.post(urlToPostMessage, messageData, function(err, jsonRes, jsonBody){
    if(jsonRes.statusCode === 201){
      console.log("Message posted to IBM watson Workspace successfully!");
      callback(true);
    } else{
      console.log("Error posting to Watson Workspace");
      console.log("Return code : " + jsonRes.statusCode);
      console.log(jsonBody);
      callback(false);
    }
  });
};

app.get("/inspiration", function(req, res){
  var myMsg = req.query.msg;

  getJWTToken(APP_ID,APP_SECRET, function(jwt){
    console.log("JWT Token : ", jwt);
    postMessageToSpace(SPACE_ID, jwt, myMsg, function(success){
      if(success){
        res.status(200).end();
      } else{
        res.status(500).end();
      }
    });
  });
});

app.post("/callback", jsonParser, function(req, res) {
  if(!APP_ID || !APP_SECRET || !APP_WEBHOOK_SECRET){
    console.log("Error:Missing variables");
    return;
  }
  console.log(req.body);
  if(req.body.type === 'verification'){
    console.log('Got Webhook verification challenge ' + JSON.stringify(req.body));

    var bodyToSend = {
      response:req.body.challenge
    };

    var hashToSend = crypto.createHmac('sha256', APP_WEBHOOK_SECRET).update(JSON.stringify(bodyToSend)).digest('hex');

    res.set('X-OUTBOUND-TOKEN', hashToSend);
    res.send(bodyToSend);
    return;
  }

  if(req.body.userId === APP_ID){
    console.log("Message from myself");
    res.status(200).end();
    return;
  }

  if(req.body.content === ""){
    console.log("Empty");
    res.status(200).end();
    return;
  }
  res.status(200).end();

  if(req.body.type === 'message-created'){
    console.log("Message Created received");
    console.log(req.body.content);   

    assistant.message({
      workspace_id: WORKSPACE_ID,
      input: {'text': req.body.content}
      },  function(err, response) {
      if (err)
        console.log('error:', err);
      else
      getJWTToken(APP_ID, APP_SECRET, function(jwt){
        console.log("JWT Token :", jwt);

        postMessageToSpace(req.body.spaceId, jwt, response.output.text[0], function(success){
          return;
        });
      });
    });
    return;
  }

  if (req.body.type === "message-annotation-added") {
	    var annotationType = req.body.annotationType;
      var annotationPayload = JSON.parse(req.body.annotationPayload);

      // Action fulfillment callback - When user clicks and engages with App
      if (annotationType === "actionSelected") {
  	    var userName = req.body.userName;
        console.log("------- AF -------------------------------");
        console.log("%s clicked on an action link.", userName);

        // Extract the necessary info
        var targetUserId = req.body.userId;
        var conversationId = annotationPayload.conversationId;
        var targetDialogId = annotationPayload.targetDialogId;
        var referralMessageId = annotationPayload.referralMessageId;
        var actionId = annotationPayload.actionId;
        console.log("Action : %s", actionId);
        console.log("Referral Message Id : %s", referralMessageId);

        var gqlmessage = "query getMessage {message(id: \"" + referralMessageId + "\") {annotations}}";
  	    // First click on underlined message
        if (actionId === "general") {
  		      // We first need to get back the annotations of the originating message to get the possible search terms.
            getJWTToken(APP_ID, APP_SECRET, function(accessToken) {
                console.log("getJWTToken OK");
                var afgraphql1 = "mutation {createTargetedMessage(input: {conversationId: \"" + conversationId + "\" targetUserId: \"" + targetUserId + "\" targetDialogId: \"" + targetDialogId + "\" attachments: [";
                var afgraphql3 = "]}){successful}}";
                var afgraphql2 = "";
                var cardtitle = "";
                var cardsubtitle = "Sample1";
                var cardtext = "";

                var carddate = (new Date()).getTime();
                var buttontext = "";
                var buttonpayload = "";

                console.log("Product is VERSE");
                for (var i = 0; i < 2; i++) {
                  if (i === 0) {
                    cardtitle = "Sample1";
                    cardtext = "sample1";
                    buttonpayload = "sample2";
                    buttontext = "Sample1";
                    afgraphql2 += "{type:CARD, cardInput:{type:INFORMATION, informationCardInput: {title: \"" + cardtitle + "\", subtitle: \"" + cardsubtitle + "\", text: \"" + cardtext + "\", date: \"" + carddate + "\", buttons: [{text: \"" + buttontext + "\", payload: \"" + buttonpayload + "\", style: PRIMARY}]}}}";
                  }
                  else {
                    afgraphql2 += ",";
                    if (i===1){
        							cardtitle = "Sample2";
        							cardtext = "Sample2";
                      buttontext = "Sample2";
        							buttonpayload = "sample2";
        							afgraphql2 += "{type:CARD, cardInput:{type:INFORMATION, informationCardInput: {title: \"" + cardtitle + "\", subtitle: \"" + cardsubtitle + "\", text: \"" + cardtext + "\", date: \"" + carddate + "\", buttons: [{text: \"" + buttontext + "\", payload: \"" + buttonpayload + "\", style: PRIMARY}]}}}";
                    }
                  }
                }
                var afgraphql = afgraphql1 + afgraphql2 + afgraphql3;
                console.log("Calling PostAFMessage");
                console.log("afgraphql: "+afgraphql);
                postActionFulfillmentMessage(accessToken, afgraphql, function(err, accessToken) {
                  if (err) {
                    console.log("Unable to post custom message to space.");
                  }
                  return;
                });

            })
          }

          if (actionId === "thanks"){
            getJWTToken(APP_ID, APP_SECRET, function(accessToken) {
              var afgraphql = 'mutation {createTargetedMessage(input: {conversationId: "' + conversationId + '" targetUserId: "' + targetUserId + '" targetDialogId: "' + targetDialogId + '" annotations: [{genericAnnotation: {title: "お礼",text: "ありがとうございました、またのご利用お待ちしております。"buttons: [{postbackButton: {title: "OK",id: "cancel",style: PRIMARY}}]}}]}) {successful}}';

              postActionFulfillmentMessage(accessToken, afgraphql, function(err, accessToken) {
                if (err) {
                  console.log("Unable to post custom message to space.");
                }
                return;
              });
            });
          }

          if (actionId === "sample1") {
            getJWTToken(APP_ID, APP_SECRET, function(jwt) {
             var myMsg = 'Sample1が押されました'
	           postMessageToSpace(req.body.spaceId, jwt, myMsg, function(success) {
		             if (success) {
			                res.status(200).end();
		             } else {
			                res.status(500).end();
		             }
	           });
	          });
          }
          if (actionId === "sample2") {
            getJWTToken(APP_ID, APP_SECRET, function(jwt) {
             var myMsg = 'Sample2が押されました'
	           postMessageToSpace(req.body.spaceId, jwt, myMsg, function(success) {
		             if (success) {
			                res.status(200).end();
		             } else {
			                res.status(500).end();
		             }
	           });
	          });
          }
          if(actionId === "cancel"){
            getJWTToken(APP_ID, APP_SECRET, function(accessToken) {
              var afgraphql = 'mutation {createTargetedMessage(input: {conversationId: "' + conversationId + '" targetUserId: "' + targetUserId + '" targetDialogId: "' + targetDialogId + '" annotations: [{genericAnnotation: {title: "OK",text: "windowを閉じてください。"}}]}) {successful}}';

              postActionFulfillmentMessage(accessToken, afgraphql, function(err, accessToken) {
                if (err) {
                  console.log("Unable to post custom message to space.");
                }
                return;
              });
            });
          }
        }
        return ;
    }
});

function postActionFulfillmentMessage(accessToken, afgraphql, callback) {
  // Build the GraphQL request
  const GraphQLOptions = {
    "url": `${WWS_URL}/graphql`,
    "headers": {
      "Content-Type": "application/graphql",
      "x-graphql-view": "PUBLIC, BETA",
      "jwt": "${jwt}"
    },
    "method": "POST",
    "body": ""
  };

  GraphQLOptions.headers.jwt = accessToken;
  GraphQLOptions.body = afgraphql;

  //console.log(GraphQLOptions.body);
  request(GraphQLOptions, function(err, response, graphqlbody) {
    //console.log(graphqlbody);

    if (!err && response.statusCode === 200) {
      console.log("Status code === 200");
      var bodyParsed = JSON.parse(graphqlbody);
      callback(null, accessToken);
    } else if (response.statusCode !== 200) {
      console.log("ERROR: didn't receive 200 OK status, but :" + response.statusCode);
      var error = new Error("");
      callback(error, null, accessToken);
    } else {
      console.log("ERROR: Can't retrieve " + GraphQLOptions.body + " status:" + response.statusCode);
      callback(err, accessToken);
    }
  });
}

function callGraphQL(accessToken, graphQLbody, callback) {
  // Build the GraphQL request
  const GraphQLOptions = {
    "url": `${WWS_URL}/graphql`,
    "headers": {
      "Content-Type": "application/graphql",
      "x-graphql-view": "PUBLIC",
      "jwt": accessToken
    },
    "method": "POST",
    "body": ""
  };

  GraphQLOptions.headers.jwt = accessToken;
  GraphQLOptions.body = graphQLbody;

  // Create the space
  request(GraphQLOptions, function(err, response, graphqlbody) {
    if (!err && response.statusCode === 200) {
      //console.log(graphqlbody);
      var bodyParsed = JSON.parse(graphqlbody);
      callback(null, bodyParsed, accessToken);
    } else if (response.statusCode !== 200) {
      console.log("ERROR: didn't receive 200 OK status, but :" + response.statusCode);
      var error = new Error("");
      callback(error, null, accessToken);
    } else {
      console.log("ERROR: Can't retrieve " + GraphQLOptions.body + " status:" + response.statusCode);
      var error = new Error("");
      callback(error, null, accessToken);
    }
  });
}

module.exports = app;
