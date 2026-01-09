import { callback } from "./client.js";
import isapiClient from "isapi-js-client";

export default function deviceInfo(that) {
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
  };
}
