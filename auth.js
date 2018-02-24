var fetch = require('node-fetch')
var btoa = require('btoa')

let clientID = '9b6a5a59253e4f09a65094a00da88465'
let secretKey = 'tugEWMlBINyQCw29vLa3OL0RjSXLDe3z2ccPl5ic'

function getCode () {
  let authUrl = 'https://login.eveonline.com/oauth/authorize'
  let callbackUrl = 'http://45.77.40.238/'
  let scope = 'corporationContactsRead publicData characterStatsRead characterFittingsRead characterFittingsWrite characterContactsRead characterContactsWrite characterLocationRead characterNavigationWrite characterWalletRead characterAssetsRead characterCalendarRead characterFactionalWarfareRead characterIndustryJobsRead characterKillsRead characterMailRead characterMarketOrdersRead characterMedalsRead characterNotificationsRead characterResearchRead characterSkillsRead characterAccountRead characterContractsRead characterBookmarksRead characterChatChannelsRead characterClonesRead characterOpportunitiesRead characterLoyaltyPointsRead corporationWalletRead corporationAssetsRead corporationMedalsRead corporationFactionalWarfareRead corporationIndustryJobsRead corporationKillsRead corporationMembersRead corporationMarketOrdersRead corporationStructuresRead corporationShareholdersRead corporationContractsRead corporationBookmarksRead fleetRead fleetWrite structureVulnUpdate remoteClientUI esi-calendar.respond_calendar_events.v1 esi-calendar.read_calendar_events.v1 esi-location.read_location.v1 esi-location.read_ship_type.v1 esi-mail.organize_mail.v1 esi-mail.read_mail.v1 esi-mail.send_mail.v1 esi-skills.read_skills.v1 esi-skills.read_skillqueue.v1 esi-wallet.read_character_wallet.v1 esi-wallet.read_corporation_wallet.v1 esi-search.search_structures.v1 esi-clones.read_clones.v1 esi-characters.read_contacts.v1 esi-universe.read_structures.v1 esi-bookmarks.read_character_bookmarks.v1 esi-killmails.read_killmails.v1 esi-corporations.read_corporation_membership.v1 esi-assets.read_assets.v1 esi-planets.manage_planets.v1 esi-fleets.read_fleet.v1 esi-fleets.write_fleet.v1 esi-ui.open_window.v1 esi-ui.write_waypoint.v1 esi-characters.write_contacts.v1 esi-fittings.read_fittings.v1 esi-fittings.write_fittings.v1 esi-markets.structure_markets.v1 esi-corporations.read_structures.v1 esi-corporations.write_structures.v1 esi-characters.read_loyalty.v1 esi-characters.read_opportunities.v1 esi-characters.read_chat_channels.v1 esi-characters.read_medals.v1 esi-characters.read_standings.v1 esi-characters.read_agents_research.v1 esi-industry.read_character_jobs.v1 esi-markets.read_character_orders.v1 esi-characters.read_blueprints.v1 esi-characters.read_corporation_roles.v1 esi-location.read_online.v1 esi-contracts.read_character_contracts.v1 esi-clones.read_implants.v1 esi-characters.read_fatigue.v1 esi-killmails.read_corporation_killmails.v1 esi-corporations.track_members.v1 esi-wallet.read_corporation_wallets.v1 esi-characters.read_notifications.v1 esi-corporations.read_divisions.v1 esi-corporations.read_contacts.v1 esi-assets.read_corporation_assets.v1 esi-corporations.read_titles.v1 esi-corporations.read_blueprints.v1 esi-bookmarks.read_corporation_bookmarks.v1 esi-contracts.read_corporation_contracts.v1 esi-corporations.read_standings.v1 esi-corporations.read_starbases.v1 esi-industry.read_corporation_jobs.v1 esi-markets.read_corporation_orders.v1 esi-corporations.read_container_logs.v1 esi-industry.read_character_mining.v1 esi-industry.read_corporation_mining.v1 esi-planets.read_customs_offices.v1 esi-corporations.read_facilities.v1 esi-corporations.read_medals.v1 esi-characters.read_titles.v1 esi-alliances.read_contacts.v1 esi-characters.read_fw_stats.v1 esi-corporations.read_fw_stats.v1 esi-corporations.read_outposts.v1 esi-characterstats.read.v1'
  let authData = {
    response_type: 'code',
    redirect_uri: callbackUrl,
    client_id: clientID,
    scope: scope,
    state: '123'
  }

  let query = Object.keys(authData)
    .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(authData[k]))
    .join('&')

  let url = authUrl + '?' + query
  return url
}
// console.log(getCode())

let tokenUrl = 'https://login.eveonline.com/oauth/token'
let code = 'nPYo01_F32Wlq7X8S-E5_nUHy3BbqL0bVsiHvMtiU2nfmrFPR7b3_tmdBDdSHwID0'

let basicHeader = btoa(clientID + ':' + secretKey)

function getAccessToken () {
  fetch(tokenUrl, {
    body: 'grant_type=authorization_code&code=' + code,
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Authorization': 'Basic ' + basicHeader,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })
    .then(res => res.json())
    .then(res => console.log(res))
}

function refreshToken () {
  let refreshToken = 'FBHxYv1YG6FvdDn6zthGqTifjQdmF3hBs2Tlq7sOSQ2Ie3fHK1FMHWJMUXEayB5vtdAnw2jI8HUqfJ9v2-6kcqfax5zGRRZb9qzsv7q41Q5U-CSQKctMXJS5HRHIf08BEPufGsth0t28TI-nTvu_33RDzEBamcYv6qtT6_lmoW1P-JjQdrozvBJYK4lSi48gh7AlyvCnlEmMTV1tP9xzdHBoXVi3tCuTjSeJA8pfYojcUzBI212VEFuz-aj7Ca7wsEOZTS5He4STqpN5S83yMYMWHPq9ew4sBPA6YfzjnDet4JSXEi0b7t1s3EWCRvq4GeqnRqU0_csA84XU-L6PQWdduiCNRf-8gNVy9N7Ki5ILQ12RFwNP3PRzqsjsbyEy_0zGFlpQoTb-lifU2U5X8KHZ4htxC5mUuXeK4__YmY8NRqs3ol-fmfXkmWTgBFdTPlqJgQzEvIHAu1rYJlBQAvwsjtsadWDGvzOyCJH0ijGe0dITG_-Lbi-6XnFCULAZ9jxWEyutBVwJ9uZNb_xzVQFfdTvbvhcYvhbC6VSjcHJjK8CRNA5s5ltuWwmerCL4_oMGUPOPApaDXFgSn06-cx6pnKa56qKXj5cv36qmBw4VukoooLfqajFoJr_f_xUoUm-Jzz4f2YLUZdOh83GhGg2'

  fetch(tokenUrl, {
    body: 'grant_type=refresh_token&refresh_token=' + refreshToken,
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Authorization': 'Basic ' + basicHeader,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })
    .then(res => res.json())
    .then(res => console.log(res))
}

function getCharacterID () {
  let accessToken = '9hczKBsx8zx0m-7Ly75ih_CO1bCsjvu9XMGEGrfQB4mEftgj4_nLlAoxswEqS7Gcwif_L_2dKJ29ywJge9gN2g2'
  let url = 'https://login.eveonline.com/oauth/verify'
  fetch(url, {
    method: 'GET',
    mode: 'no-cors',
    headers: {
      'Authorization': 'Bearer ' + accessToken
    }
  })
    .then(res => res.json())
    .then(res => console.log(res))
}

function getCharacterOrders () {
  let charID = '2113264142'
  let accessToken = '9hczKBsx8zx0m-7Ly75ih_CO1bCsjvu9XMGEGrfQB4mEftgj4_nLlAoxswEqS7Gcwif_L_2dKJ29ywJge9gN2g2'
  let url = 'https://esi.tech.ccp.is/latest/characters/' + charID + '/orders/?datasource=tranquility'
  fetch(url, {
    method: 'GET',
    mode: 'no-cors',
    headers: {
      'Authorization': 'Bearer ' + accessToken
    }
  })
    .then(res => res.json())
    .then(res => console.log(res))
}

function get1DQAMarket () {
  let structureID = '1022734985679'
  let page = 1
  let accessToken = '9hczKBsx8zx0m-7Ly75ih_CO1bCsjvu9XMGEGrfQB4mEftgj4_nLlAoxswEqS7Gcwif_L_2dKJ29ywJge9gN2g2'
  let url = 'https://esi.tech.ccp.is/latest/markets/structures/' + structureID + '/?datasource=tranquility&page=' + page
  fetch(url, {
    method: 'GET',
    mode: 'no-cors',
    headers: {
      'Authorization': 'Bearer ' + accessToken
    }
  })
    .then(res => res.json())
    .then(res => console.log(res))
}

get1DQAMarket()
