import nookies from "nookies";
import { HttpClient } from "../../src/infra/HttpClient/HttpClient";
import { tokenService } from "../../src/services/auth/tokenService";

const REFRESH_TOKEN = "REFRESH_TOKEN";

const controllers = {
  async storeRefreshToken(req, res) {
    const ctx = { req, res };

    nookies.set(ctx, REFRESH_TOKEN, req.body.refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    res.json({
      data: {
        message: "Stored with success",
      },
    });
  },
  async displayCookies(req, res) {
    const ctx = { req, res };
    res.json({
      data: {
        cookies: nookies.get(ctx),
      },
    });
  },
  async regenerateTokens(req, res) {
    const ctx = { req, res };
    const cookies = nookies.get(ctx);
    const refresh_token = cookies[REFRESH_TOKEN] || req.body.refresh_token;
    const refreshResponse = await HttpClient(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/refresh`,
      {
        method: "POST",
        body: {
          refresh_token,
        },
      }
    );
    if (refreshResponse.ok) {
      nookies.set(ctx, REFRESH_TOKEN, refreshResponse.body.data.refresh_token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
      tokenService.save(refreshResponse.body.data.access_token, ctx);
      res.status(200).json({
        data: refreshResponse.body.data,
      });
    } else {
      res.status(401).json({
        status: 401,
        message: "Não autorizado",
      });
    }
  },
};

const controllerBy = {
  POST: controllers.storeRefreshToken,
  GET: controllers.regenerateTokens,
  PUT: controllers.regenerateTokens,
  DELETE: (req, res) => {
    const ctx = { req, res };
    nookies.destroy(ctx, REFRESH_TOKEN, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    res.json({
      data: {
        status: 200,
        message: "deleted with success",
      },
    });
  },
};

export default function handler(request, response) {
  if (controllerBy[request.method]) {
    return controllerBy[request.method](request, response);
  }
  response.status(404).json({
    status: 404,
    message: "Not found",
  });
}
