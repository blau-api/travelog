// app.js
App({
  onLaunch() {
    // 保留原有日志功能
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 保留登录逻辑
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      }
    })
  },

  // 全局数据配置（新增地图Key）
  globalData: {
    userInfo: null,    // 保留用户信息字段
    qqMapKey: '3HTBZ-F5Q6Q-RP25C-2BIOF-JKJ3K-6NBEX' // 新增地图Key
  }
})
