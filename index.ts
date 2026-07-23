import { EventEmitter } from "events";
import {
  getKeyPair,
  getEncryptedPassword,
  getPublicKeyHex,
} from "./utils/encryption.ts";
import { callback } from "./core/client.ts";
import isapiClient from "isapi-js-client";
import { toXml } from "./utils/xmlJsonUtil.ts";

export class isapiSDK extends EventEmitter {
  ip: string;
  username: string;
  password: string;
  status: string;

  Challenge!: object;
  DeviceInfo!: object;
  SecurityCap!: object;
  NetworkInterfaceList!: object;
  InputProxyChannelStatusList!: object;
  VideoOverlay!: object;
  VideoInputChannel!: object;
  hddList!: object;
  trackDailyDistribution!: Array<Array<Array<object>>>;
  publicKey: string | null;
  privateKey: string | null;

  axiosPathVar!: Array<string>;
  axiosData!: object;
  axiosOptions = {
    headers: {
      Authorization: undefined,
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
    return new Promise(async (resolve, reject) => {
      const keyPair = getKeyPair();
      this.publicKey = keyPair.publicKey;
      this.privateKey = keyPair.privateKey;
      try {
        // 判断是否为海康设备
        this.Challenge = await this.getChallenge();
        // 判断是否激活
        this.DeviceInfo = await this.getSystemDeviceInfo();
        if (Object.keys(this.DeviceInfo).length !== 0) {
          this.status = "已激活";
          this.NetworkInterfaceList = await this.getSystemNetworkInterfaces();
          if (["IPCamera", "IPDome"].includes(this.DeviceInfo.deviceType)) {
            this.VideoOverlay = await this.getOverlaysByID();
            this.VideoInputChannel = await this.getChannelNameByID();
          }
        }
        if (Object.keys(this.DeviceInfo).length !== 0) {
          if (['IPC', 'NVR'].includes(this.DeviceInfo.deviceType)) {
            this.InputProxyChannelStatusList = await this.getChannelStatusList();
            this.hddList = await this.getStorageHdd();
            this.trackDailyDistribution = []
            for (let i = 0; i < this.InputProxyChannelStatusList.length; i++) {
              let id = (i + 1) + "01"
              const currentDate = new Date();
              let nowYear = currentDate.getFullYear();
              let nowMonth = currentDate.getMonth() + 1;
              let year = nowYear
              let month = nowMonth
              let data = {
                year: year,
                monthOfYear: month
              }
              for (let j = 24; j > 0; j--) {
                let trackDailyDistribution = await this.postRecordTracksDailyDistributionByID(id, data)
                let day = trackDailyDistribution.dayList.day.find(d => !d.record)
                this.trackDailyDistribution.push({
                  ...trackDailyDistribution,
                  ...data
                })
                if (day && !(year === nowYear && month === nowMonth)) {
                  break;
                }
                month--;
                if (month == 0) {
                  month = 12;
                  year--;
                }
                data = {
                  year: year,
                  monthOfYear: month
                }
              }
            }
          }
        }
        this.emit("deviceUpdated", this);
      } catch (error) {
        this.emit("initFailed", error);
        reject(false);
      }
      resolve(true);
    });
  }
  async activate() {
    this.axiosData = toXml({
      ActivateInfo: {
        password: getEncryptedPassword(
          this.Challenge.key,
          this.privateKey,
          "sszx123456",
        ),
      },
    });
    try {
      const parsedData = await callback(isapiClient.system.putActivate, this);
      this.status = "激活成功";
      this.init();
      return parsedData.ResponseStatus;
    } catch (error) {
      throw error;
    }
  }
  async getSystemDeviceInfo() {
    try {
      const parsedData = await callback(isapiClient.system.getDeviceInfo, this);
      return parsedData.DeviceInfo;
    } catch (error) {
      // socket hang up
      if (error.code === "ECONNRESET") {
        return {};
      }
      throw error;
    }
  }
  async putDeviceInfo(data: object) {
    this.axiosData = toXml({
      DeviceInfo: data,
    });
    try {
      const parsedData = await callback(isapiClient.system.putDeviceInfo, this);
      if (parsedData.ResponseStatus.statusCode === 1) {
        this.status = "修改设备信息成功";
        this.emit("log:info", `${this.ip}修改设备信息成功`);
        this.DeviceInfo = await this.getSystemDeviceInfo();
        this.emit("deviceUpdated", this);
      }
      return parsedData.ResponseStatus;
    } catch (error) {
      throw error;
    }
  }
  async getSystemNetworkInterfaces() {
    try {
      const parsedData = await callback(
        isapiClient.system.getNetworkInterfaces,
        this,
      );
      return parsedData.NetworkInterfaceList;
    } catch (error) {
      throw error;
    }
  }
  async putNetworkByID(id = "1", data: object) {
    this.axiosPathVar = [id];
    this.axiosData = toXml({
      NetworkInterface: data,
    });
    try {
      const parsedData = await callback(
        isapiClient.system.putNetworkInterfacesByID,
        this,
      );
      if (parsedData.ResponseStatus.statusCode === 7 && parsedData.ResponseStatus.subStatusCode === 'rebootRequired') {
        await this.reboot();
        const oldIP = this.ip;
        this.ip = data.IPAddress.ipAddress;
        this.polling(`${oldIP}正在修改网络信息`, `${oldIP}修改网络信息成功`);
      }
      return parsedData.ResponseStatus;
    } catch (error) {
      throw error;
    }
  }
  async getOverlaysByID(id = "1") {
    try {
      this.axiosPathVar = [id];
      const parsedData = await callback(
        isapiClient.system.getVideoInputsChannelsOverlaysByID,
        this,
      );
      return parsedData.VideoOverlay;
    } catch (error) {
      throw error;
    }
  }
  async getChannelNameByID(id = "1") {
    try {
      this.axiosPathVar = [id];
      const parsedData = await callback(
        isapiClient.system.getVideoInputsChannelsByID,
        this,
      );
      return parsedData.VideoInputChannel;
    } catch (error) {
      throw error;
    }
  }
  async setChannelNameByID(id = "1", data: object) {
    this.axiosData = toXml({
      VideoInputChannel: data,
    });
    try {
      this.axiosPathVar = [id];
      const parsedData = await callback(
        isapiClient.system.putVideoInputsChannelsByID,
        this,
      );
      if (parsedData.ResponseStatus.statusCode === 1) {
        this.status = "修改通道名称成功";
        this.emit("log:info", `${this.ip}修改通道名称成功`);
        this.VideoInputChannel = await this.getChannelNameByID();
        this.emit("deviceUpdated", this);
      }
      return parsedData.VideoInputChannel;
    } catch (error) {
      throw error;
    }
  }
  async reboot() {
    this.emit("log:info", `${this.ip}正在重启设备`);
    try {
      const parsedData = await callback(isapiClient.system.putReboot, this);
      return parsedData.ResponseStatus;
    } catch (error) {
      throw error;
    }
  }
  async basicRestore() {
    return await this.restore("basic");
  }
  async fullRestore() {
    return await this.restore("full");
  }
  async restore(mode = "full") {
    this.axiosPathVar = [mode];
    let status = mode === "basic" ? "正在简单恢复参数" : "正在恢复出厂设置";
    let successStatus = mode === "basic" ? "简单恢复参数成功" : "恢复出厂设置成功";
    this.polling(this.ip + status, this.ip + successStatus);
    try {
      const parsedData = await callback(
        isapiClient.system.putFactoryReset,
        this,
      );
      return parsedData.ResponseStatus;
    } catch (error) {
      throw error;
    }
  }
  polling(status: string, successStatus: string) {
    this.status = status;
    this.emit("log:info", `${this.status}`);
    this.emit("deviceUpdated", this);
    const interval = setInterval(async () => {
      try {
        const isSuccess = await this.init();
        if (isSuccess) {
          clearInterval(interval);
          this.status = successStatus;
          this.emit("log:info", `${this.status}`);
          this.emit("deviceUpdated", this);
        }
      } catch (error) {}
    }, 1000 * 10);
  }
  async getSecurityCapabilities() {
    try {
      const parsedData = await callback(
        isapiClient.security.getCapabilities,
        this,
      );
      return parsedData.SecurityCap;
    } catch (error) {
      throw error;
    }
  }
  async getTime() {
    try {
      const parsedData = await callback(
        isapiClient.system.getTime,
        this,
      );
      return parsedData.Time;
    } catch (error) {
      throw error;
    }
  }
  async putTime(data: object) {
    this.axiosData = toXml({
      Time: data,
    });
    try {
      const parsedData = await callback(isapiClient.system.putTime, this);
      if (parsedData.ResponseStatus.statusCode === 1) {
        this.status = "修改时间成功";
        this.emit("log:info", `${this.ip}修改时间成功`);
        this.emit("deviceUpdated", this);
      }
      return parsedData.ResponseStatus;
    } catch (error) {
      throw error;
    }
  }
  async getChannelStatusList() {
    try {
      const parsedData = await callback(
        isapiClient.ContentMgmt.getInputProxyChannelsStatus,
        this,
      );
      return parsedData.InputProxyChannelStatusList.InputProxyChannelStatus;
    } catch (error) {
      throw error;
    }
  }
  async getStorageHdd() {
    try {
      const parsedData = await callback(
        isapiClient.ContentMgmt.getStorageHdd,
        this,
      );
      return parsedData.hddList;
    } catch (error) {
      throw error;
    }
  }
  async postRecordTracksDailyDistributionByID(id="101", data: object) {
    this.axiosData = toXml({
      trackDailyParam: data,
    });
    this.axiosPathVar = [id];
    try {
      const parsedData = await callback(isapiClient.ContentMgmt.postRecordTracksDailyDistributionByID, this);
      return parsedData.trackDailyDistribution;
    } catch (error) {
      throw error;
    }
  }
  async getUserCheck() {
    try {
      const parsedData = await callback(
        isapiClient.security.getUserCheck,
        this,
      );
      return parsedData.UserCheck;
    } catch (error) {
      throw error;
    }
  }
  // 设备未激活亦可调用 用于判断是否为海康设备 如果是则应当返回非404
  async getChallenge() {
    this.axiosData = toXml({
      PublicKey: {
        key: getPublicKeyHex(this.publicKey),
      },
    });
    try {
      const parsedData = await callback(
        isapiClient.security.postChallenge,
        this,
      );
      return parsedData.Challenge;
    } catch (error) {
      if (error.response && error.response.status !== 404) {
        return {};
      }
      throw error;
    }
  }
}
