import { createCoreModule } from "./core/index.ts";
import { EventEmitter } from 'events';
import { getKeyPair } from "./utils/encryption.ts";
export class isapiSDK extends EventEmitter {
  ip: string;
  username: string;
  password: string;
  status: string;
  
  core: object;

  Challenge: object;
  DeviceInfo: object;
  SecurityCap: object;
  NetworkInterfaceList: object;
  VideoOverlay: object;
  VideoInputChannel: object;

  publicKey: string;
  privateKey: string;

  axiosPathVar: Array<string>;
  axiosData: object;
  axiosOptions = {
    headers: {
      Authorization: "",
      "Content-Type": "application/xml",
    },
    params: null as object,
  };
  /**
   * @param {string} ip - 设备 IP 地址
   * @param {string} username - 登录用户名
   * @param {string} password - 登录密码
   */
  constructor(ip: string, username: string, password: string) {
    super();
    this.ip = ip;
    this.username = username;
    this.password = password;
    this.status = "未激活";

    this.publicKey = null;
    this.privateKey = null;

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
        this.status = '已激活'
        this.NetworkInterfaceList = await this.core.system.getSystemNetworkInterfaces()
        if (["IPCamera", "IPDome"].includes(this.DeviceInfo.deviceType)) {
          this.VideoOverlay = await this.core.system.getOverlaysByID()
          this.VideoInputChannel = await this.core.system.getChannelNameByID()
        }
      }
      this.emit('deviceUpdated', this)
    } catch (error) {
      this.emit('initFailed', error);
    }
  }
}
