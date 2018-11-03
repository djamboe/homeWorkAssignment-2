/*
* Request handlers
*/

// Dependencies
var _data = require('./data');
var helpers = require('./helpers');
var config = require('./config');

// Define all the handlers
var handlers = {};

// Users handler
handlers.users = function(data,callback){
    var acceptableMethods = ['post','get','put','delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._users[data.method](data,callback);
    }else{
        callback(405);
    }
};

// Container for users sub method
handlers._users = {};

// Users post
handlers._users.post = function(data,callback){
    // Check that all required fields are filled out
    var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length > 10 ? data.payload.phone.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

    if(firstName && lastName && phone && password && tosAgreement){
        // Make sure that the user doesnt already exist
        _data.read('users',phone,function(err,data){
            if(err){
                // Has the password
                var hashedPassword = helpers.hash(password);
                
                if(hashedPassword){
                     // Create users object
                    var userObject = {
                        'firstName' : firstName,
                        'lastName' : lastName,
                        'phone' : phone,
                        'hashedPassword' : hashedPassword,
                        'tosAgreement' : tosAgreement
                    };

                    // Store the user
                    _data.create('users',phone,userObject,function(err){
                        if(!err){
                            callback(200);
                        }else{
                            console.log(err);
                            callback(500,{'Error' : 'Could not create the new user'});
                        }
                    });
                }else{
                    callback(500,{'Error' : 'Could not hashed the password'});
                }
               

            }else{
                // User already exist
                callback(400,{'Error' : 'A user already exist'});
            }
        });
    }else{
        callback(400,{'Error' : 'Missing required fields'});
    }
};

// Users get
// Required data : phone
// Optional data : none
handlers._users.get = function(data,callback){
    // Check phone number is valid
    var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.length > 0 ? data.queryStringObject.phone.trim() : false;
    if(phone){
        // Get token from the header
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        // Verify that given token is valid
        handlers._tokens.verifyToken(token,phone,function(tokenIsValid){
            if(tokenIsValid){
                // Lookup the user
                _data.read('users',phone,function(err,data){
                    if(!err){
                        // Remove the hashed password from the user object before returning it
                        delete data.hashedPassword;
                        callback(200,data);
                    }else{
                        callback(404);
                    }
                });
            }else{
                callback(403,{'Error' : 'Missing required token in header'})
            }
        });
    }else{
        callback(400,{'Error' : 'Missing required fields'});
    }
};

// Users put
handlers._users.put = function(data,callback){
    var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length > 10 ? data.payload.phone.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    // Verify that given token is valid
    handlers._tokens.verifyToken(token,phone,function(tokenIsValid){
        if(tokenIsValid){
            // Check if phone is invalid
            if(phone){
                if(firstName || lastName ||password){
                    // Lookup the user
                    _data.read('users',phone,function(err,userData){
                        if(!err && userData){
                            if(firstName){
                                userData.firstName = firstName;
                            }
                            if(lastName){
                                userData.lastName = lastName;
                            }
                            if(password){
                                userData.password = helpers.hash(password);
                            }

                            // Store new update
                            _data.update('users',phone,userData,function(err){
                                if(!err){
                                    callback(200);
                                }else{
                                    console.log(err);
                                    callback(500,{'Error' : 'Could not update the user'})
                                }
                            });
                        }else{
                            callback(400,{'Error' : 'The specified users doesnt exist'});
                        }
                    });
                }
            }else{
                callback(400,{'Error' : 'Missing required fields'});
            }
        }else{
            callback(400,{'Error' : 'Missing token in header'});
        }
    });
};

// Users delete
// Required field : phone
handlers._users.delete = function(data,callback){
    // Check if phone number is valid
    var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length > 0 ? data.queryStringObject.phone.trim() : false;
    if(phone){
        // Lookup the user
        _data.read('users',phone,function(err,userData){
            if(!err && userData){
               _data.delete('users',phone,function(err){
                    if(!err){
                        // Delete each of the check associated to the user
                        var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                        var checksToDelete = userChecks.length;
                        if(checksToDelete > 0){
                            var checksDeleted = 0;
                            var deletionErrors = false;
                            // Loop through the checks
                            userChecks.forEach(function(checkId) {
                                // Delete the checks
                                _data.delete('checks',checkId,function(err){
                                    if(err){
                                        deletionErrors = true
                                    }
                                    checksDeleted++;
                                    if(checksDeleted == checksToDelete){
                                        if(!deletionErrors){
                                            callback(200);
                                        }else{
                                            callback(500,{'Error' : 'Error encountered when attempting to delete users check'});
                                        }
                                    }
                                });
                            });
                        }else{
                            callback(200);
                        }
                        
                    }else{
                        callback(500,{'Error' : 'Could not delete the specific user'});
                    }
               });
            }else{
                callback(404,{'Error' : 'Could not find specific user'});
            }
        });
    }else{
        callback(400,{'Error' : 'Missing required fields'});
    }
};

// Tokens handler
handlers.tokens = function(data,callback){
    var acceptableMethods = ['post','get','put','delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._tokens[data.method](data,callback);
    }else{
        callback(405);
    }
};

// Tokens Container
handlers._tokens = {};

// Tokens post
handlers._tokens.post = function(data,callback){
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length > 10 ? data.payload.phone.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    if(phone && password){
        // Lookup for users data
        _data.read('users',phone,function(err,userData){
            if(!err && userData){
                // Hash the send password and compare it to the password stored in user object
                var hashedPassword = helpers.hash(password);
                if(hashedPassword == userData.hashedPassword){
                    // if valid create a new token with the random name,expiration date is one hour
                    var tokenId = helpers.createRandomString(20);
                    var expires = Date.now() + 1000 * 60 * 60;
                    var tokenObject = {
                        'phone' : phone,
                        'id' : tokenId,
                        'expires' : expires
                    };
                    
                    // Store the token
                    _data.create('tokens',tokenId,tokenObject,function(err){
                        if(!err){
                            callback(200,tokenObject);
                        }else{
                            callback(500,{'Error' : 'Could not create a new token'});
                        }
                    });
                }else{
                    callback(400,{'Error' : 'Password did not match to the specified user'});
                }
            }else{
                callback(400,{'Error' : 'Could not find specified user'});
            }
        });
    }else{
        callback(400,{'Error' : 'Missing required field(s)'});
    }
};

// Tokens get
handlers._tokens.get = function(data,callback){
     // Check id is valid
     var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 19 ? data.queryStringObject.id.trim() : false;
    
     if(id){
         // Lookup the token
         _data.read('tokens',id,function(err,tokenData){
             if(!err && tokenData){
                 callback(200,tokenData);
             }else{
                 callback(404);
             }
         });
     }else{
         callback(400,{'Error' : 'Missing required fields'});
     }
};

// Tokens put
handlers._tokens.put = function(data,callback){
    var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 19 ? data.payload.id.trim() : false;
    var extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
    if(id && extend){
        // Lookup the token
        _data.read('tokens',id,function(err,tokenData){
            if(!err && tokenData){
                if(tokenData.expires > Date.now()){
                    // Set expires one hour from now
                    tokenData.expires = Date.now() + 1000 * 60 * 60;

                    // Store  new update
                    _data.update('tokens',id,tokenData,function(err){
                        if(!err){
                            callback(200);
                        }else{
                            callback(500,{'Error' : 'Could not update the token'});
                        }
                    });
                }else{
                    callback(400,{'Error' : 'Token already expired and cant be extended'});
                }
            }else{
                callback(400,{'Error' : 'Specified token doesnt exist'});
            }
        });
    }else{
        callback(400,{'Error' : 'Missing required fields or fields invalid'});
    }
};

// Tokens delete
handlers._tokens.delete = function(data,callback){
    // Check if phone number is valid
    var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length > 0 ? data.payload.id.trim() : false;
    if(id){
        // Lookup the tokens
        _data.read('tokens',id,function(err,data){
            if(!err && data){
               _data.delete('tokens',id,function(err){
                    if(!err){
                        callback(200);
                    }else{
                        callback(500,{'Error' : 'Could not delete the specific tokens'});
                    }
               });
            }else{
                callback(404,{'Error' : 'Could not find specific tokens'});
            }
        });
    }else{
        callback(400,{'Error' : 'Missing required fields'});
    }    
};

// Verify if a given token is valid for the user
handlers._tokens.verifyToken = function(id,phone,callback){
    // Lookup the token
    _data.read('tokens',id,function(err,tokenData){
        if(!err && tokenData){
            // Check if the token is not expired
            if(tokenData.phone == phone && tokenData.expires > Date.now()){
                callback(true);
            }else{
                callback(false);
            }
        }else{
            callback(false);
        }
    });
};

// Check handlers
handlers.checks = function(data,callback){
    var acceptableMethods = ['post','get','put','delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._checks[data.method](data,callback);
    }else{
        callback(405);
    }
};

// checks Container
handlers._checks = {};

// Checks post
// Required data : protocol,url,method,successCodes,timeoutSeconds
// Optional data : none
handlers._checks.post = function(data,callback){
    // Validate inputs
    var protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    var method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    if(protocol && url && method && successCodes && timeoutSeconds){
        // Get token from headers
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        // Lookup the user phone by reading the token
        _data.read('tokens',token,function(err,tokenData){
            if(!err && tokenData){
                var userPhone = tokenData.phone;

                // Lookup the user data
                _data.read('users',userPhone,function(err,userData){
                    if(!err && userData){
                        var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                        // Verify that user has less than the number of max checks
                        if(userChecks.length < config.maxChecks){
                            // Create random id for checks
                            var checkId = helpers.createRandomString(20);

                            // Create check object including users phone
                            var checkObject = {
                                'id' : checkId,
                                'userPhone' : userPhone,
                                'protocol' : protocol,
                                'url' : url,
                                'method' : method,
                                'successCodes' : successCodes,
                                'timeoutSeconds' : timeoutSeconds
                            };

                            // Save the object
                            _data.create('checks',checkId,checkObject,function(err){
                                if(!err){
                                    // Add check into userdata object
                                    userData.checks = userChecks;
                                    userData.checks.push(checkId);

                                    // Save the new User data
                                    _data.update('users',userPhone,userData,function(err){
                                        if(!err){
                                            // Return the data about the new check
                                            callback(200,checkObject);
                                        }else{
                                            callback(500,{'Error' : 'Could not update user with new check data'});
                                        }
                                    });
                                }else{
                                    callback(500,{'Error' : 'Could not create the new check'});
                                }
                            });
                        }else{
                            callback(400,{'Error' : 'The user already has a maximum number of checks ('+config.maxChecks+').'});
                        }
                    }else{
                        callback(403);
                    }
                });
            }else{
                callback(403);
            }
        });
    }else{
        callback(400,{'Error' : 'Missing required fields'});
    }
}

// Checks get
// Required data : id
// Optional data : none
handlers._checks.get = function(data,callback){
    // Check that id is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 19 ? data.queryStringObject.id.trim() : false;
    if(id){
        // Lookup the check
        _data.read('checks',id,function(err,checkData){
            if(!err && checkData){
                // Get the token that sent the request
                var token = typeof(data.headers.token) == 'string' ?  data.headers.token : false;
                // Verify the token is valid and belongs to user related create the check
                console.log('This is checkdata',checkData);
                handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){
                    if(tokenIsValid){
                        // Return the check data
                        callback(200,checkData);
                    }else{
                        callback(403);
                    }
                });
            }else{
                callback(404);
            }
        });
    }else{
        callback(400,{'Error' : 'Missing required field, or field invalid'});
    }
};

// Checks put
// Required data : id
// Optional data: protocol, url, method, successCodes, timeoutSeconds (one must be sent)
handlers._checks.put = function(data,callback){
    // Check for required field
    var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 19 ? data.payload.id : false;

    // Checks for optional fields
    var protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    var method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    // Error if id is invalid
    if(id){
        // Error if nothing is sent to update
        if(protocol || url || method || successCodes || timeoutSeconds){
            // Lookup the check
            _data.read('checks',id,function(err,checkData){
                if(!err && checkData){
                    // Get the token that send the request
                    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                    
                    // Verify that given token is valid
                    handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){
                        if(tokenIsValid){
                            // update check data when necessary
                            if(protocol){
                                checkData.protocol = protocol;
                            }
                            if(url){
                                checkData.url = url;
                            }
                            if(method){
                                checkData.method = method;
                            }
                            if(successCodes){
                                checkData.successCodes = successCodes;
                            }
                            if(timeoutSeconds){
                                checkData.timeoutSeconds = timeoutSeconds;
                            }

                            // Store new updates
                            _data.update('checks',id,checkData,function(err){
                                if(!err){
                                    callback(200);
                                }else{
                                    callback(500,{'Error' : 'Couldnot update the check'});
                                }
                            });
                        }else{
                            callback(403);
                        }
                    });
                }else{
                    callback(400,{'Error': 'Check ID did not exist'});
                }
            });
        }else{
            callback(400,{'Error' : 'Missing required fields to update'});
        }
    }else{
        callback(400,{'Error' : 'Missing required field'});
    }
};

// Checks - delete
// Required data : id
// Optional data : none
handlers._checks.delete = function(data,callback){
    // Check that id is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 19 ? data.queryStringObject.id.trim() : false;
    if(id){
        // Lookup the check
        _data.read('checks',id,function(err,checkData){
            if(!err && checkData){
                // Get the token that send the request
                var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                // Verify that given token is valid
                handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){
                    if(tokenIsValid){
                        // Delete the check data
                        _data.delete('checks',id,function(err){
                            if(!err){
                                // Lookup the user object to get all their checks
                                _data.read('users',checkData.userPhone,function(err,userData){
                                    if(!err){
                                        var userChecks = typeof(userData.checks) == 'object' && userData.checks  instanceof Array ? userData.checks : [];
                                        // Remove the deleted check from their list of checks
                                        var checkPosition = userChecks.indexOf(id);
                                        if(checkPosition > -1){
                                            // Re save the user data
                                            userData.checks = userChecks;
                                            _data.update('users',checkData.userPhone,userData,function(err){
                                                if(!err){
                                                    callback(200);
                                                }else{
                                                    callback(500,{'Error' : 'Could not update the user'});
                                                }
                                            });
                                        }else{
                                            callback(500,{"Error" : "Could not find the check on the user's object, so could not remove it."});
                                        }
                                    }else{
                                        callback(500,{"Error" : "Could not find the user who created the check, so could not remove the check from the list of checks on their user object."});
                                    }
                                });
                            }else{
                                callback(500,{'Error' : 'Couldnot delete the check data'});
                            }
                        });

                    }else{
                        callback(403);
                    }
                });
            }else{
                callback(400,{'Error' : 'The check id specified could not be found'});
            }
        });
    }else{
        callback(400,{'Error' : 'Missing required id'});
    }
};

// Ping handler
handlers.ping = function(data,callback){
    callback(200);
};

// Not-Found handler
handlers.notFound = function(data,callback){
  callback(404);
};

module.exports = handlers;
