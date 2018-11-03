/*
* Create configuration file
*/

// Container for all environtments
var environments = {};

// Staging default environtment
environments.staging = {
  'httpPort' : 3000,
  'httpsPort' : 3001,
  'envName' : 'staging',
  'hashingSecret' : 'mys3cr3t',
  'maxChecks' : 10,
  'twilio' : {
    'accountSid' : 'ACc76489d6048db3d00e664e1889ed3b49',
    'authToken' : '2ac3e79c3e065cf4f2eb5be8ca070fdc',
    'fromPhone' : '+14353104679'
  }
};

// Production environtment
environments.production = {
  'httpPort' : 5000,
  'httpsPort' : 5001,
  'envName' : 'production',
  'hashingSecret' : 'mys3cr3t',
  'maxChecks' : 10,
  'twilio' : {
    'accountSid' : 'ACc76489d6048db3d00e664e1889ed3b49',
    'authToken' : '2ac3e79c3e065cf4f2eb5be8ca070fdc',
    'fromPhone' : '+14353104679'
  }
};

// Determine which environtment was passed as a command-line argument
var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that the current environment is one of the environments above, if not default to staging
var environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

// Export the module
module.exports = environmentToExport;
