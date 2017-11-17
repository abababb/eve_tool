var Fetch = require('node-fetch')

var FetchMarket = (function () {
  function FetchMarket () {};

  FetchMarket.fetchByRegionTypePage = function (regionId, typeId, page) {
    var host = 'https://esi.tech.ccp.is/latest'
    var marketApi = '/markets/' + regionId + '/orders/?datasource=tranquility&order_type=all&page=' + page + '&type_id=' + typeId

    var url = host + marketApi

    var requestData = {
      method: 'GET'
    }

    return Fetch(url, requestData)
      .then(function (response) {
        return response.json()
      })
  }

  FetchMarket.fetchByRegionType = function (regionId, typeId) {
    // todo: 一次性拿所有页的数据
  }
  return FetchMarket
}())

module.exports = FetchMarket
