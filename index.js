import { createCoreModule } from "./core/index.js";
import { EventEmitter } from 'events';
import { getKeyPair } from "./utils/encryption.js";
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
    this.status = null;

    this.core = null;
    this.Challenge = null;
    this.DeviceInfo = null;
    this.SecurityCap = null;
    this.NetworkInterfaceList = null;
    this.VideoOverlay = null;
    this.VideoInputChannel = null;

    this.publicKey = null;
    this.privateKey = null;

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
    const keyPair = getKeyPair();
    this.publicKey = keyPair.publicKey
    this.privateKey = keyPair.privateKey
    this.core = createCoreModule(this);
    try {
      // 判断是否为海康设备
      this.Challenge = await this.core.security.getChallenge()
      // 判断是否激活
      this.DeviceInfo = await this.core.system.getSystemDeviceInfo()
      if (Object.keys(this.DeviceInfo).length !== 0) {
        this.NetworkInterfaceList = await this.core.system.getSystemNetworkInterfaces()
        this.VideoOverlay = await this.core.system.getOverlaysByID()
        this.VideoInputChannel = await this.core.system.getChannelNameByID()
        this.emit('deviceUpdate', this)
      } else {
        this.emit('deviceUpdate', {ip: this.ip})
      }
    } catch (error) {
      this.emit('initFailed', error);
    }
  }
}
