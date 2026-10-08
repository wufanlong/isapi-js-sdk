import { isapiSDK } from "index.ts";
import { getAuthorization } from "../utils/authentication.ts";
import { toJson } from "../utils/xmlJsonUtil.ts";
export default function client(that) {
  return {};
}

export async function callback(f: Function, that: isapiSDK) {
  that.axiosOptions.headers.Authorization = undefined;
  try {
    const response = await f(that);
    return toJson(response.data);
  } catch (error) {
    const response = error.response;
    if (response && response.status === 401) {
      const authHeader = typeof response.headers.get === 'function' ? response.headers.get("www-authenticate") : response.headers["www-authenticate"]
      if (!authHeader) {
        throw new Error("Missing WWW-Authenticate header");
      }
      that.axiosOptions.headers.Authorization = getAuthorization(
        response,
        authHeader,
        that
      );
      try {
        const retryResponse = await f(that);
        return toJson(retryResponse.data);
      } catch (retryError) {
        if (retryError.response && retryError.response.status === 401) {
          // sessionLogin查是否锁定
          
          retryError.message = `用户名或密码错误(用户名：${that.username}  密码：${that.password})`
          throw retryError;
          // throw new Error(`用户名或密码错误(用户名：${that.username}  密码：${that.password})`);
        } else {
          throw retryError;
        }
      }
    } else {
      throw error;
    }
  }
}
