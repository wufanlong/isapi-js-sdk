import { callback } from "./client.js";
import isapiClient from "isapi-js-client";

export default function system(that) {
  return {
    async getSystemDeviceInfo() {
      try {
        const parsedData = await callback(isapiClient.system.deviceInfo, that);
        return parsedData.DeviceInfo;
      } catch (error) {
        throw new Error(
          `Failed to get system device info: ${error.message}  sdk:${JSON.stringify(that)}`
        );
      }
    },
    async getSystemNetworkInterfaces() {
      try {
        const parsedData = await callback(isapiClient.system.network.interfaces, that);
        return parsedData.NetworkInterfaceList;
      } catch (error) {
        throw new Error(
          `Failed to get system network interfaces: ${error.message}  sdk:${JSON.stringify(that)}`
        );
      }
    },
  };
}
