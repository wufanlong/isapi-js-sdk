import { callback } from "./client.js";
import isapiClient from "isapi-js-client";

export default function security(that) {
  return {
    getSecurityCapabilities() {
        return callback(isapiClient.security.securityCapabilities, that)
    }
  };
}
