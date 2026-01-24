import { createCoreModule } from "./core/index.js";
import { EventEmitter } from 'events';
export class isapiSDK extends EventEmitter {
  /**
   * @param {string} ip - 设备 IP 地址
   * @param {string} username - 登录用户名
   * @param {string} password - 登录密码
   */
  constructor(ip, username, password) {
    super();
    this.ip = ip;
    this.username = username;
    this.password = password;
    this.core = null;
    this.DeviceInfo = null;
    this.SecurityCap = null;
    this.NetworkInterfaceList = null;
    this.VideoOverlay = null;
    this.VideoInputChannel = null;
    // array
    this.axiosPathVar = null;
    this.axiosData = null;
    this.axiosOptions = {
      headers: {
        Authorization: "",
        "Content-Type": "application/xml",
      },
      params: null,
    };
  }

  async init() {
    this.core = createCoreModule(this);
    try {
      // 判断是否为海康设备
      this.Challenge = await this.core.security.getChallenge()
      // 判断是否激活
      this.DeviceInfo = await this.core.system.getSystemDeviceInfo()
      console.log("deviceinfo", this.DeviceInfo)
      if (Object.keys(this.DeviceInfo).length !== 0) {
        this.NetworkInterfaceList = await this.core.system.getSystemNetworkInterfaces()
        this.VideoOverlay = await this.core.system.getOverlaysByID()
        this.VideoInputChannel = await this.core.system.getChannelNameByID()
        let deviceDetail = {
          ...this.DeviceInfo,
          subnetMask: this.NetworkInterfaceList.NetworkInterface.IPAddress?.subnetMask,
          gateway: this.NetworkInterfaceList.NetworkInterface.IPAddress?.DefaultGateway?.ipAddress,
          VideoOverlay: this.VideoOverlay,
          channelName: this.VideoInputChannel?.name
        }
        this.emit('deviceInitd', deviceDetail);
      } else {
        this.emit('deviceInitd', {})
      }
    } catch (error) {
      this.emit('initFailed', error);
    }
  }
}
