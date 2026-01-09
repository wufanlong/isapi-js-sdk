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

    this.axiosOptions = {
      headers: {
        Authorization: "",
      },
    };
  }

  async init() {
    this.core = createCoreModule(this);
    this.DeviceInfo = await this.core.system.getSystemDeviceInfo()
    this.emit('deviceInfo', this.DeviceInfo);
  }
}
