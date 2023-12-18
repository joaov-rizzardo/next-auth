import { tokenService } from "../../services/auth/tokenService";
import nookies from "nookies";

export async function HttpClient(fetchUrl, fetchOptions = {}) {
  const defaultHeaders = fetchOptions.headers || {};
  return fetch(fetchUrl, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...defaultHeaders,
    },
    body: fetchOptions.body ? JSON.stringify(fetchOptions.body) : null,
  })
    .then(async (response) => {
      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        body: await response.json(),
      };
    })
    .then(async (response) => {
      if (!fetchOptions.refresh) return response;
      if (response.status !== 401) return response;

      const isServer = Boolean(fetchOptions.ctx);
      const currentRefreshToken =
        fetchOptions.ctx?.req?.cookies["REFRESH_TOKEN"];

      try {
        const refreshResponse = await HttpClient(
          "http://localhost:3001/api/refresh",
          {
            method: isServer ? "PUT" : "GET",
            body: isServer && { refresh_token: currentRefreshToken },
          }
        );
        const newAccessToken = refreshResponse.body.data.access_token;
        const newRefreshToken = refreshResponse.body.data.refresh_token;

        if (isServer) {
          nookies.set(fetchOptions.ctx, "REFRESH_TOKEN", newRefreshToken, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
          });
        }
        tokenService.save(newAccessToken);
        const retryResponse = await HttpClient(fetchUrl, {
          ...fetchOptions,
          refresh: false,
          headers: {
            Authorization: `Bearer ${newAccessToken}`,
          },
        });
        return retryResponse;
      } catch (error) {
        console.error(error);
        return response;
      }
    });
}
