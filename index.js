import { createCoreModule } from "./core/index.js";

export class isapiSDK {
  /**
   * @param {string} ip - 设备 IP 地址
   * @param {string} username - 登录用户名
   * @param {string} password - 登录密码
   */
  constructor(ip, username, password) {
    this.context = {
      ip,
      username,
      password,
      axiosOptions: null
    };
    this.core = createCoreModule(this.context);
  }
}
