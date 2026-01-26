import { callback } from "./client.js";
import isapiClient from "isapi-js-client";
import { toXml } from "../utils/xmlJsonUtil.js";
import { getPublicKeyHex } from "../utils/encryption.js";

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
    // 设备未激活亦可调用 用于判断是否为海康设备 如果是则应当返回非404
    async getChallenge() {
      that.axiosData = toXml({
        PublicKey: {
          key: getPublicKeyHex(that.publicKey)
        }
      });
      try {
        const parsedData = await callback(isapiClient.security.postChallenge, that);
        return parsedData.Challenge;
      } catch (error) {
        if (error.response && error != 404) {
          return {}
        }
        throw error;
      }
    },
  };
}
