import _ from 'lodash'
import fetch from 'node-fetch'
import fs from 'fs'

const createSchema = async (settings) => {
  console.log(`[starting] creating ${settings.schemaName} schema...`)

  const schemaData = JSON.parse(fs.readFileSync('conf/schema.json', 'utf8'))
  const fullSchema = {
    "schema" : schemaData
  }

  const response = await fetch(`${settings.analyticsUrl}/events/schema/${settings.schemaName}`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'X-Events-API-AccountName': settings.accountName,
      'X-Events-API-Key': settings.apiKey,
      'Content-type': 'application/vnd.appd.events+json;v=2'
    },
    body: JSON.stringify(fullSchema)
  });

  if(response.status !== 201){
    throw new Error(`Unable to create schema | ${response.status} - ${response.statusText}. Check schema for errors.`);
  }
  else if(await response.status === 201){
    console.log(`[succeeded] ${settings.schemaName} schema created`)
    return true
  }

  console.log(await response.status)

}

const schemaExists = async (settings) => {
  console.log(`[starting] Checking if ${settings.schemaName} schema exists...`)

  const response = await fetch(`${settings.analyticsUrl}/events/schema/${settings.schemaName}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'X-Events-API-AccountName': settings.accountName,
      'X-Events-API-Key': settings.apiKey,
      'Content-type': 'application/vnd.appd.events+json;v=2'
    }
  });

  const responseJSON = await response.json()
  if(typeof responseJSON === undefined){
    responseJSON.statusCode = response.status
    responseJSON.message = response.statusText
  }

  switch (response.status) {
    case 200:
      console.log(`[succeeded] ${settings.schemaName} found.`)
      return true;
      break;
    case 404:
      console.log(`[succeeded] ${settings.schemaName} not found.`)
      return false;
      break;
    default:
      throw new Error(`Unable to check if schema exists | ${responseJSON.statusCode} - ${responseJSON.message}`);
      break;
  }
}

const createSchemaIfRequired = async (settings) => {
  if(!await schemaExists(settings)){
    await createSchema(settings)
  }
}

const parseData = (data) => {
  console.log(`[starting] Parsing Metric data...`)

  const processed = _.map(data, function(n){
    const metrics = n['metric-datas']['metric-data']

    console.log(metrics[0]['metricValues'][0]['metric-value'][0])

    let parsed = {
      "metricId": metrics[0]['metricId'][0],
      "metricName": metrics[0]['metricName'][0],
      "metricPath": metrics[0]['metricPath'][0],
      "frequency": metrics[0]['frequency'][0],
      "startTime": "date",
      "occurrences": "integer",
      "current": "integer",
      "min": "integer",
      "max": "integer",
      "count": "integer",
      "sum": "integer",
      "value": "integer"
    }


    console.log(parsed)

    // let temp = n
    // temp.metric.value = n.value[1]
    // temp.metric.eventTimestamp = n.value[0]
    //
    // // strip decimal
    // temp.metric.eventTimestamp = temp.metric.eventTimestamp * 1000
    //
    // // flatten
    // temp = temp.metric
    //
    // // remove underscore from name
    // temp.name = temp.__name__
    // delete temp.__name__
    //
    // temp.value = parseFloat(temp.value)

    //return temp
  });
  console.log(`[succeeded] Parsed Prometheus data.`)
  return processed
}

const publishEventsToAppd = async (settings, data) => {
  console.log(`[starting] Publishing to AppD...`)

  const response = await fetch(`${settings.analyticsUrl}/events/publish/${settings.schemaName}`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'X-Events-API-AccountName': settings.accountName,
      'X-Events-API-Key': settings.apiKey,
      'Content-type': 'application/vnd.appd.events+json;v=2'
    },
    body: JSON.stringify(data)
  });

  let responseJSON
  if(response.status !== 200 && response.status !== 413){
    responseJSON = await response.json()
  }

  switch (response.status) {
    case 200:
      console.log(`[succeeded] Publishing to AppD completed.`)
      return true;
      break;
    case 413:
      throw new Error(`Unable to update schema | Payload from Prometheus too large`);
    default:
      throw new Error(`Unable to update schema | ${responseJSON.statusCode} - ${responseJSON.message}`)
      break;
  }

}

module.exports = {
  publish: async function (settings, data) {
    //await createSchemaIfRequired(settings)
    const parsedData = parseData(data)


    //await publishEventsToAppd(settings,parsedData)
  }
};
