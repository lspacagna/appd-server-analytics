import _ from 'lodash'
import fetch from 'node-fetch'
import fs from 'fs'
import xml2js from 'xml2js'
import analytics from './analytics.js'


/**
 *
 */
let APPD_CONTROLLER_URL
let APPD_API_CLIENT_NAME
let APPD_API_CLIENT_SECRET

/**
 * URL to connect to the AppD controller events service
 * See https://docs.appdynamics.com/display/PRO45/Analytics+Events+API#AnalyticsEventsAPI-create_schemaCreateEventSchema
 * for the URL for your controller.
 */
let APPD_ANALYTICS_URL

/**
 * Account name to connect to the AppD controller
 * See Settings > License > Account for the value for your controller
 */
let APPD_GLOBAL_ACCOUNT_NAME

/**
 * API Key to connect to AppD controller events service
 * See https://docs.appdynamics.com/display/PRO45/Managing+API+Keys
 */

let APPD_EVENTS_API_KEY

/**
 * Reporting data to analytics requires a schema to be created.
 * Change this value if you are connecting more than one of these extensions to
 * more than one Prometheus deployment
 * Default: prometheus-metrics
 */
let SCHEMA_NAME

const AppDRequest = async (token, path) => {
  console.log(`[starting] '${path}' request...`)

  // Create URL
  let url = `https://${APPD_CONTROLLER_URL}/controller/rest/applications/Server%20&%20Infrastructure%20Monitoring/metric-data?metric-path=`
  url = url + encodeURI(path)
  url = url + "&time-range-type=BEFORE_NOW&duration-in-mins=60"

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'Authorization': 'Bearer ' + token
    }
  })

  if(response.ok){
    const data = await response.text()

    const json = await xml2js.parseStringPromise(data /*, options */)

    console.log(`[succeeded] '${path}' query.`)
    return json
  }
  else{
    throw new Error(response.statusText);
  }

}

const getDataFromAppD = async (token) => {
  let data = []

  // Get metric paths from config file
  const paths = fs.readFileSync('conf/paths.txt', 'utf8').toString().trim().split("\n")

  for (const path of paths){
    // Make AppD metric query
    data.push(await AppDRequest(token, path))
  }

  return data
}

const getAPIToken = async () =>{
  console.log(`[starting] Creating new AppD API Token...`)

  const url = `https://${APPD_CONTROLLER_URL}/controller/api/oauth/access_token`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/vnd.appd.cntrl+protobuf;v=1'
    },
    body: `grant_type=client_credentials&client_id=${APPD_API_CLIENT_NAME}@lspac1&client_secret=${APPD_API_CLIENT_SECRET}`
  })

  const token = await response.json()
  console.log(`[complete] Created AppD API Token...`)
  return token.access_token
}

const processConfig = () => {
  const config = JSON.parse(fs.readFileSync('conf/config.json', 'utf8'))

  APPD_CONTROLLER_URL = config.appd_controller_url
  APPD_API_CLIENT_NAME = config.appd_api_client_name
  APPD_API_CLIENT_SECRET = config.appd_api_client_secret
  APPD_ANALYTICS_URL = config.appd_analytics_url
  APPD_GLOBAL_ACCOUNT_NAME = config.appd_global_account_name
  APPD_EVENTS_API_KEY = config.appd_events_api_key
  SCHEMA_NAME = (typeof x === 'undefined') ? config.schema_name : "prometheus_events";
}

const main = async () => {
  try {
    processConfig()
    const token = await getAPIToken()

    let data
    console.log(`[starting] Reading from AppD Server Visibility...`)
    data = await getDataFromAppD(token)

    await analytics.publish({
      analyticsUrl: APPD_ANALYTICS_URL,
      schemaName: SCHEMA_NAME,
      accountName: APPD_GLOBAL_ACCOUNT_NAME,
      apiKey: APPD_EVENTS_API_KEY
    },data)

    console.log(`[complete] Processing complete.`)

  } catch (e) {
    console.error(e)
  }
}

// Called when running locally
const runLocal = async () => {
  try{
    console.log(`[starting] Starting Script...`)
    await main()
  }
  catch(e){
    console.log(e)
  }
}

// Only called when running in AWS Lambda
exports.handler = async (event, context, callback) => {
    try{
      console.log(`[starting] Starting Script...`)
      await main()
      callback(null, '[succeeded] AppDynamics updates succeeded')
    }
    catch(e){
      callback(new Error(e))
    }

};

runLocal()
