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
    // string uri start without '/'
    this.axiosPathVar = null;
    this.axiosData = null;
    this.axiosOptions = {
      headers: {
        Authorization: "",
      },
      params: null,
    };
  }

  async init() {
    this.core = createCoreModule(this);
    try {
      this.DeviceInfo = await this.core.system.getSystemDeviceInfo()
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
    } catch (error) {
      this.emit('initFailed', error);
    }
  }
}
