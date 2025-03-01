const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

Page({
  data: {
    // 用户信息
    userInfo: {
      avatarUrl: defaultAvatarUrl,
      nickName: '',
    },
    hasUserInfo: false,

    // 地图数据
    latitude: 39.90469,
    longitude: 116.40717,
    polygons: [],
    settings: {
      skew: 0,
      rotate: 0,
      showScale: true,
      showCompass: true,
      enableOverlooking: false,
      enableZoom: true,
      enableScroll: true,
      enableRotate: false,
      trafficEnabled: false,
      mapType: 'standard'
    },

    // 城市数据
    cityData: [],
    cityCount: 0,
    storageKey: 'cityCheckInData'
  },

  onLoad() {
    this.initLocation()
    this.loadCityData()
    this.mapContext = wx.createMapContext('cityMap')
  },

  // 初始化定位
  initLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: res => {
        this.setData({
          latitude: res.latitude,
          longitude: res.longitude
        })
        this.mapContext.moveToLocation()
      }
    })
  },

  // 加载城市数据
  loadCityData() {
    const data = wx.getStorageSync(this.data.storageKey) || { cities: {} }
    const cities = Object.values(data.cities)
    this.setData({
      cityData: cities.sort((a, b) => b.lastCheckin - a.lastCheckin),
      cityCount: cities.length
    })
  },

  // 格式化日期
  formatDate(timestamp) {
    const date = new Date(timestamp)
    return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}`
  },

  // 地图视野变化
  handleMapMove(e) {
    if (e.type === 'end') {
      this.setData({
        latitude: e.detail.centerLocation.latitude,
        longitude: e.detail.centerLocation.longitude
      })
    }
  },

  // 重新定位
  handleRecenter() {
    wx.showLoading({ title: '定位中...' })
    wx.getLocation({
      type: 'gcj02',
      success: res => {
        this.setData({ 
          latitude: res.latitude,
          longitude: res.longitude
        })
        this.mapContext.moveToLocation()
      },
      complete: wx.hideLoading
    })
  },

  // 聚焦城市
  focusCity(e) {
    const cityName = e.currentTarget.dataset.city
    const city = this.data.cityData.find(c => c.cityName === cityName)
    if (city?.boundary?.length) {
      this.mapContext.includePoints({
        points: city.boundary.map(p => ({
          latitude: p.lat,
          longitude: p.lng
        })),
        padding: [50, 50, 50, 50]
      })
    }
  },

  // 处理城市打卡
  async handleCityCheckin() {
    try {
      const { authSetting } = await wx.getSetting()
      if (!authSetting['scope.userLocation']) {
        await this.showAuthModal()
        return
      }

      const location = await this.getCurrentLocation()
      const cityInfo = await this.reverseGeocode(location)
      this.processCheckin(cityInfo)

    } catch (error) {
      wx.showToast({ title: error.message || '打卡失败', icon: 'none' })
    }
  },

  // 显示权限弹窗
  showAuthModal() {
    return new Promise(resolve => {
      wx.showModal({
        title: '需要位置权限',
        content: '请允许访问您的位置信息',
        success: res => {
          if (res.confirm) wx.openSetting()
          resolve()
        }
      })
    })
  },

  // 获取当前定位
  getCurrentLocation() {
    return new Promise((resolve, reject) => {
      wx.getLocation({
        type: 'gcj02',
        success: resolve,
        fail: reject
      })
    })
  },

  // 逆地理编码
  async reverseGeocode(location) {
    const { qqMapKey } = getApp().globalData
    const res = await wx.request({
      url: 'https://apis.map.qq.com/ws/geocoder/v1/',
      data: {
        location: `${location.latitude},${location.longitude}`,
        key: qqMapKey,
        get_poi: 0
      }
    })

    if (res.statusCode !== 200 || res.data.status !== 0) {
      throw new Error('获取城市信息失败')
    }
    return res.data.result.ad_info
  },

  // 处理打卡数据
  processCheckin(cityInfo) {
    const data = wx.getStorageSync(this.data.storageKey) || { cities: {} }
    const existing = data.cities[cityInfo.city]

    if (existing) {
      existing.count += 1
      existing.lastCheckin = Date.now()
    } else {
      data.cities[cityInfo.city] = {
        cityName: cityInfo.city,
        count: 1,
        firstCheckin: Date.now(),
        lastCheckin: Date.now(),
        boundary: cityInfo.city_boundary || []
      }
    }

    wx.setStorageSync(this.data.storageKey, data)
    this.loadCityData()
    this.updateMapPolygons()
    wx.showToast({ title: `${cityInfo.city} 打卡成功！` })
  },

  // 更新地图覆盖物
  updateMapPolygons() {
    const cities = wx.getStorageSync(this.data.storageKey)?.cities || {}
    this.setData({
      polygons: Object.values(cities).map(city => ({
        points: city.boundary.map(p => ({
          latitude: p.lat,
          longitude: p.lng
        })),
        fillColor: '#4A90E222',
        strokeWidth: 2,
        strokeColor: '#4A90E2'
      }))
    })
  },

  // 用户信息处理方法
  onChooseAvatar(e) {
    this.setData({
      "userInfo.avatarUrl": e.detail.avatarUrl,
      hasUserInfo: this.data.userInfo.nickName && e.detail.avatarUrl !== defaultAvatarUrl
    })
  },

  onInputChange(e) {
    this.setData({
      "userInfo.nickName": e.detail.value,
      hasUserInfo: e.detail.value && this.data.userInfo.avatarUrl !== defaultAvatarUrl
    })
  }
})
