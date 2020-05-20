# AppDynamics Server Analytics

## Introduction

This extension connects to the AppDynamics metric service and collects the metrics specified in the /conf/paths.txt file.
Responses are then send to the AppDynamics events service to allow querying in analytics.

## Pre-requisites

1. (Optional) Homebrew - for easier installation and management on MacOS
2. Node.JS - currently targeting latest LTS version (12.16.3)

```
$ brew install node
```

3. (Optional) AWS Account with access to IAM and Lambda - only required if deploying to Lambda

4. (Optional) Claudia.js - only required if deploying to Lambda

```
$ npm install claudia -g
```

5. AppDynamics controller with appropriate Analytics licence.

## Installation

### Clone package

```
$ git clone git@github.com:lspacagna/appd-server-analytics.git
$ cd appd-server-analytics
```

### Choose to run extension locally or in Lambda

This extension default configuration is to run locally. If you would like to run the
extension inside a Lambda function. You need to edit src/index.js and comment
out the last line in the file. It should look like this:

```
// runLocal()
```

### Rebuild project (only if deploying to Lambda)

If you are deploying to Lambda and have commented out 'runLocal()' you will need to rebuild the project. Rebuilding will parse the source code in /src and store the built version in /dist.

```
npm run build
```

## Configuration

### Configure extension controller connection

Open the the conf/config.json file for editing. The default configuration is below

```
{
  "appd_controller_url": ".saas.appdynamics.com",
  "appd_api_client_name": "",
  "appd_api_client_secret": "",
  "appd_analytics_url": "https://analytics.api.appdynamics.com",
  "appd_global_account_name": "xxxx_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxxx",
  "appd_events_api_key": "xxxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxxx",
  "schema_name": "serverevents",
}

```

Parameter | Function | Default Value
--------- | -------- | -------------
appd_controller_url | The URL of your controller. For SaaS controllers this is `<controller-name>.saas.appdynamics.com` | `false`
appd_api_client_name | The 'Client Name' for the API Client created to allow this extension to connect to AppDynamics APIs. See [our documentation](https://docs.appdynamics.com/display/PRO45/API+Clients) for steps to setup a new API Client. | (blank)
appd_api_client_secret | The 'Client Secret' value generated when a new API client is created. See [our documentation](https://docs.appdynamics.com/display/PRO45/API+Clients) for steps to setup a new API Client. | (blank)
appd_analytics_url | URL to connect to the AppD controller events service. See [our documentation](https://docs.appdynamics.com/display/PRO45/Analytics+Events+API#AnalyticsEventsAPI-AbouttheAnalyticsEventsAPI) for the URL for your controller. | `https://analytics.api.appdynamics.com`
appd_global_account_name | Account name to connect to the AppD controller. See Settings > License > Account for the value for your controller | (blank)
appd_events_api_key | API Key to connect to AppD controller events service. See [our documentation](https://docs.appdynamics.com/display/PRO45/Managing+API+Keys) to create an API key. | (blank)
schema_name | Reporting data to analytics requires a schema to be created. Change this value if you are connecting more than one of these extensions to more than one Prometheus deployment, or if you'd prefer to use another name. | `serverevents`

### Configure Schema

To be able to publish Prometheus data to AppD a custom schema needs to be created in your controller. This schema must match the data returned from the AppDynamics Metrics API. This is preconfigured to the standard response from AppDynamics.

It is unlikely that this schema will need to be changed. If you need to change the configuration open conf/schema.json.

On each run, this extension will check a schema with the chosen schema name is created. If not it will automatically create it.

The extension cannot modify or delete existing schemas. If you have an existing schema which needs editing follow instructions [in our documentation](https://docs.appdynamics.com/display/PRO45/Analytics+Events+API#AnalyticsEventsAPI-update_schemaUpdateEventSchema)

### Configure Metric Paths

The extension has been designed to run AppD metric queries in series. By default
the extension will run three sample requests on the paths as defined in conf/paths.txt and send the data to AppD as analytics events.

Open conf/paths.txt for editing.

```
Application Infrastructure Performance|Root|Individual Nodes|*|Hardware Resources|CPU|%Busy
Application Infrastructure Performance|Root|Individual Nodes|*|Hardware Resources|Memory|Used %
Application Infrastructure Performance|Root|Individual Nodes|*|Hardware Resources|Disks|dev-xvda1|Space Available
```

You can add and change these to match the data that you'd like to pull from metrics into analytics events. Each path should be on its own line.

The above examples demonstrate wildcards are supported in the paths.

To get the paths for the metrics you require see [our documentation](https://docs.appdynamics.com/display/PRO45/Metric+and+Snapshot+API#MetricandSnapshotAPI-RetrieveMetricData).

## Run Extension

### Run extension - locally
If running locally the extension is ready to run. Run the extension with the
following command.

```
$ npm run run
```

or

```
$ node dist/index.js
```

### Run extension - Lambda

Create AWS profile with IAM full access, Lambda full access, and API Gateway
Admin privileges.

Add the keys to your .aws/credentials file

```
[claudia]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_ACCESS_SECRET
```

#### Send function to AWS via Claudia

```
$ claudia create --region us-east-1 --handler index.handler
```

When the deployment completes, Claudia will save a new file claudia.json in
your project directory, with the function details, so you can invoke and
update it easily.

For more detailed instructions see: https://claudiajs.com/tutorials/hello-world-lambda.html

#### Running in AWS

You can either use the AWS UI to trigger the function. Or you can setup a trigger.
A common trigger would be to run this extension once per minute.
