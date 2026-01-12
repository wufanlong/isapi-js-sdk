import { callback } from "./client.js";
import isapiClient from "isapi-js-client";

export default function security(that) {
  return {
    async getSecurityCapabilities() {
      try {
        const parsedData = await callback(isapiClient.security.getSecurityCapabilities, that);
        return parsedData.SecurityCap;
      } catch (error) {
        throw error;
      }
    },
    async getUserCheck() {
      try {
        const parsedData = await callback(isapiClient.security.getUserCheck, that);
        return parsedData.UserCheck;
      } catch (error) {
        throw error;
      }
    },
  };
}
