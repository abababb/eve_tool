var Fetch = require('node-fetch')

var Route = (function () {
  function Route () {};

  Route.getSecureRoute = function (origin, destination) {
    var host = 'https://esi.tech.ccp.is/latest'
    var api = '/route/' + origin + '/' + destination + '/?datasource=tranquility&flag=secure'

    var url = host + api

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
