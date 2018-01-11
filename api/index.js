/**
 *  从redis读取利润数据, 获取利润大于设定值的所有路线详情
 */
var TypeRoutes = require('./TypeRoutesAPI.js')
var StationRoutes = require('./StationRoutesAPI.js')
var StationType = require('./StationTypeAPI.js')

var express = require('express')
var cors = require('cors')
var app = express()
app.use(cors())

app.get('/type/routes', (req, res) => {
  TypeRoutes.getAllRouteDetail((routes) => {
    res.type('html').send(routes)
  })
})

app.get('/station/routes/:stationID', (req, res) => {
  let stationID = req.params.stationID
  if (stationID === 'all') {
    StationRoutes.getAllRouteDetail((routes) => {
      res.type('html').send(routes)
    })
  } else {
    StationRoutes.getStationRouteDetail(stationID, (routes) => {
      res.type('html').send(routes)
    })
  }
})

app.get('/station/multi/routes/:stationID(\\d+)', (req, res) => {
  let stationID = req.params.stationID
  StationRoutes.getMultiStationRoute(stationID)
  res.type('html').send({msg: '见cli'})
})

app.get('/station/cheap/:stationID', (req, res) => {
  let stationID = req.params.stationID
  StationType.getCheapTypes(stationID, (data) => {
    res.type('html').send(data)
  })
})

app.listen(8989)
