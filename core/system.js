import { callback } from "./client.js";
import isapiClient from "isapi-js-client";

export default function system(that) {
  return {
    async getSystemDeviceInfo() {
      try {
        const parsedData = await callback(isapiClient.system.getDeviceInfo, that);
        return parsedData.DeviceInfo;
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
  };
}
