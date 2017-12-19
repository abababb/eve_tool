var Fetch = require('node-fetch')
var config = require('../config.js')

var Route = (function () {
  function Route () {};

  Route.host = config.apiHost

  Route.getSecureRoute = function (origin, destination) {
    var api = '/route/' + origin + '/' + destination + '/?datasource=tranquility&flag=secure'

    var url = this.host + api

    var requestData = {
      method: 'GET'
    }

    return Fetch(url, requestData)
      .then(function (response) {
        return response.json()
      })
  }

  return Route
}())

module.exports = Route
