var Fetch = require('node-fetch')
var config = require('../config.js')

var FetchMarket = (function () {
  function FetchMarket () {};

  FetchMarket.host = config.apiHost

  FetchMarket.fetchByRegionTypePage = function (regionId, typeId, page) {
    var api = '/markets/' + regionId + '/orders/?datasource=tranquility&order_type=all&page=' + page + '&type_id=' + typeId

    var url = this.host + api

    var requestData = {
      method: 'GET'
    }

    return Fetch(url, requestData)
  }

  FetchMarket.fetchByRegionPage = function (regionId, page) {
    var api = '/markets/' + regionId + '/orders/?datasource=tranquility&order_type=all&page=' + page

    var url = this.host + api

    var requestData = {
      method: 'GET'
    }

    return Fetch(url, requestData)
  }

  FetchMarket.fetchPrices = function () {
    var api = '/markets/prices?datasource=tranquility'

    var url = this.host + api

    var requestData = {
      method: 'GET'
    }

    return Fetch(url, requestData)
  }

  return FetchMarket
}())

module.exports = FetchMarket
