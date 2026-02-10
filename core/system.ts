import { callback } from "./client.ts";
import isapiClient from "isapi-js-client";
import { getEncryptedPassword } from "../utils/encryption.ts";
import { toXml } from "../utils/xmlJsonUtil.ts";
import { isapiSDK } from "index.ts";

export default function system(that: isapiSDK) {
  return {
    async activate() {
      that.axiosData = toXml({
        ActivateInfo: {
          password: getEncryptedPassword(that.Challenge.key, that.privateKey, "sszx123456")
        }
      });
      try {
        const parsedData = await callback(isapiClient.system.putActivate, that);
        that.status = '激活成功'
        that.init()
        return parsedData.ResponseStatus;
      } catch (error) {
        throw error;
      }
    },
    async getSystemDeviceInfo() {
      try {
        const parsedData = await callback(isapiClient.system.getDeviceInfo, that);
        return parsedData.DeviceInfo;
      } catch (error) {
        // socket hang up
        if (error.code === 'ECONNRESET') {
          return {}
        }
        throw error;
      }
    },
    async putDeviceInfo(data) {
      that.axiosData = toXml({
        DeviceInfo: data
      });
      try {
        const parsedData = await callback(isapiClient.system.putDeviceInfo, that);
        if (parsedData.ResponseStatus.statusCode === 1) {
          that.status = '修改设备信息成功'
          that.DeviceInfo = await that.core.system.getSystemDeviceInfo()
          that.emit('deviceUpdated', that)
        }
        return parsedData.ResponseStatus;
      } catch (error) {
        throw error;
      }
    },
    async getSystemNetworkInterfaces() {
      try {
        const parsedData = await callback(isapiClient.system.network.getInterfaces, that);
        return parsedData.NetworkInterfaceList;
      } catch (error) {
        throw error;
      }
    },
    async getOverlaysByID(id = 1) {
      try {
        that.axiosPathVal = [id]
        const parsedData = await callback(isapiClient.system.getVideoInputsChannelsOverlaysByID, that);
        return parsedData.VideoOverlay;
      } catch (error) {
        throw error;
      }
    },
    async getChannelNameByID(id = 1) {
      try {
        that.axiosPathVal = [id]
        const parsedData = await callback(isapiClient.system.getVideoInputsChannelsByID, that);
        return parsedData.VideoInputChannel;
      } catch (error) {
        throw error;
      }
    },
    async reboot() {
      try {
        const parsedData = await callback(isapiClient.system.putReboot, that);
        return parsedData;
      } catch (error) {
        throw error;
      }
    },
    async basicRestore() {
      this.restore('basic')
    },
    async fullRestore() {
      this.restore('full')
    },
    async restore(mode = 'full') {
      let str = mode === 'basic' ? '简单恢复参数' : '恢复出厂设置'
      that.axiosPathVal = [mode]
      that.status = '正在' + str
      that.emit('log:info', `${that.ip}${that.status}`)
      that.emit('deviceUpdated', that)
      const interval = setInterval(async () => {
        try {
          const isSuccess = await that.init()
          if (isSuccess) {
            clearInterval(interval)
            that.status = str + '成功'
            that.emit('log:info', `${that.ip}${that.status}`)
            that.emit('deviceUpdated', that)
          }
        } catch (error) {
        }
      }, 1000 * 10)
      try {
        const parsedData = await callback(isapiClient.system.putFactoryReset, that);
        return parsedData;
      } catch (error) {
        throw error;
      }
    },
  };
}
