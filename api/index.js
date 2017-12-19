/**
 *  从redis读取利润数据, 获取利润大于设定值的所有路线详情
 */
var TypeRoutes = require('./TypeRoutesAPI.js')
var StationRoutes = require('./StationRoutesAPI.js')

var express = require('express')
var cors = require('cors')
var app = express()
app.use(cors())

app.get('/type/routes', (req, res) => {
  TypeRoutes.getAllRouteDetail((routes) => {
    res.send(routes)
  })
})

app.get('/station/routes/:stationID', (req, res) => {
  let stationID = req.params.stationID
  if (stationID === 'all') {
    StationRoutes.getAllRouteDetail((routes) => {
      res.send(routes)
    })
  } else {
    StationRoutes.getStationRouteDetail(stationID, (routes) => {
      res.send(routes)
    })
  }
})

app.listen(8989)
