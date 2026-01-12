import { getAuthorization } from "../utils/authentication.js";
import { toJson } from "../utils/xmlJsonUtil.js";
export default function client(that) {
  return {};
}

export async function callback(f, that) {
  try {
    const response = await f(that);
    return toJson(response.data);
  } catch (error) {
    const response = error.response;
    if (response && response.status === 401) {
      const authHeader = response.headers.get("www-authenticate");
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
          throw new Error(`用户名或密码错误(用户名：${that.username}  密码：${that.password})`);
        } else {
          throw retryError;
        }
      }
    } else {
      throw error;
    }
  }
}
