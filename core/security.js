import { callback } from "./client.js";
import isapiClient from "isapi-js-client";

export default function security(that) {
  return {
    async getSecurityCapabilities() {
      try {
        const parsedData = await callback(isapiClient.security.securityCapabilities, that);
        return parsedData.SecurityCap;
      } catch (error) {
        throw new Error(`Failed to get security capabilities: ${error.message}  sdk:${that}`);
      }
    }
  };
}
