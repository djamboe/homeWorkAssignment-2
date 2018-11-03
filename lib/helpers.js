/*
* Helpers for various tasks
*/

// Dependencies
var crypto = require('crypto');
var config = require('./config');
var https = require('https');
var querystring = require('querystring');

// Container for the helpers
var helpers = {};

// Create a SHA256 hash
helpers.hash = function(str){
    if(typeof(str) == 'string' && str.length > 0){
        var hash = crypto.createHmac('sha256',config.hashingSecret).update(str).digest('hex');
        return hash;
    }else{
        return false;
    }
};

// Parse a JSON string to object in all case , without throwing
helpers.parseJsonToObject = function(str){
    try{
        var obj = JSON.parse(str);
        return obj;
    }catch(e){
        return {};
    }
}

// Create a string random alphanumeric string
helpers.createRandomString = function(strLength){
    strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength :  false;
    if(strLength){
        // Define all the possible character
        var possibleCharacter = 'abcdefghijklmnopqrstuvwxyz0123456789';

        // Start the final string
        var str = '';
        for(i=1;i<strLength;i++){
            // Get a random character
            var randomCharacter = possibleCharacter.charAt(Math.floor(Math.random() * possibleCharacter.length));

            str += randomCharacter;
        }

        return str;
    }else{
        return false;
    }
};

// Send sms via twilio
helpers.sendTwilioSms = function(phone,msg,callback){
    // Validate parameters
    phone = typeof(phone) == 'string' && phone.trim().length > 0 ? phone.trim() : false;
    msg = typeof(msg) == 'string' && msg.trim().length > 0 ? msg.trim() : false;

    if(phone && msg){
        // Configure new request payload
        var payload = {
            'From' : config.twilio.fromPhone,
            'To' : '+62'+phone,
            'Body' : msg
        };

        var stringPayload = querystring.stringify(payload);

        // Configure request details
        var requestDetails = {
            'protocol' : 'https:',
            'hostname' : 'api.twilio.com',
            'method' : 'POST',
            'path' : '/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
            'auth' : config.twilio.accountSid+':'+config.twilio.authToken,
            'headers' : {
                'Content-Type' : 'application/x-www-form-urlencoded',
                'Content-Length' : Buffer.byteLength(stringPayload)
            } 
        };

        // Instantiate the request object
        var req = https.request(requestDetails,function(res){
            // Grab the status of sent request
            var status = res.statusCode;
            // Callback successfully if request run through
            if(status == 200 || status == 201){
                callback(false);
            }else{
                callback('Status code returned was '+status);
            }
        });

        // Bind to the error event so it doesnt get thrown
        req.on('error',function(e){
            callback(e);
        });

        // Add the payload
        req.write(stringPayload);

        // End the request
        req.end();
    }else{
        console.log('Given parameter is invalid or missing');
    }
};
















module.exports = helpers;