var Fetch = require('node-fetch')

var FetchMarket = (function () {
  function FetchMarket () {};

  FetchMarket.host = 'https://esi.tech.ccp.is/latest'

  FetchMarket.fetchByRegionTypePage = function (regionId, typeId, page) {
    var api = '/markets/' + regionId + '/orders/?datasource=tranquility&order_type=all&page=' + page + '&type_id=' + typeId

    var url = this.host + api

    var requestData = {
      method: 'GET'
    }

    return Fetch(url, requestData)
      .then(function (response) {
        return response.json()
      })
  }

  FetchMarket.fetchByRegionPage = function (regionId, page) {
    var api = '/markets/' + regionId + '/orders/?datasource=tranquility&order_type=all&page=' + page

    var url = this.host + api

    var requestData = {
      method: 'GET'
    }

    return Fetch(url, requestData)
      .then(function (response) {
        return response.json()
      })
  }

  return FetchMarket
}())

module.exports = FetchMarket
