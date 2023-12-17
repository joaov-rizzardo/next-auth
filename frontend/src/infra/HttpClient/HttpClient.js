import { tokenService } from "../../services/auth/tokenService";
import nookies from "nookies";

export async function HttpClient(fetchUrl, fetchOptions) {
  return fetch(fetchUrl, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...fetchOptions.headers,
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

      const refreshResponse = await HttpClient("/api/refresh", {
        method: isServer ? "PUT" : "GET",
        body: isServer && { refresh_token: currentRefreshToken },
      });

      try {
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
