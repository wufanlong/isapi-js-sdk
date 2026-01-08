import { callback } from "./client.js";
import isapiClient from "isapi-js-client";

export default function deviceInfo(that) {
  return {
    getSystemDeviceInfo() {
        return callback(isapiClient.system.deviceInfo, that)
    }
  };
}
