import { callback } from "./client.js";
import isapiClient from "isapi-js-client";

export default function system(that) {
  return {
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
  };
}
