import {
	type AccessToken,
	type LoginResponse,
	loginSchema,
	registerSchema,
	verificationCodeSchema,
	verifyEmailSchema,
	createPlaceSchema,
	getPlaceSchema,
	updateWorkerSchema,getWorkerSchema,PutWorkerSchema,removeWorkerSchema,createAssetSchema,updateAssetSchema
} from "@amlak/shared";
import { type CookieOptions, type Response, Router } from "express";
import { parse } from "../validation.ts";
import * as auth from "./service.ts";
import * as place from "../places/places.ts";
import * as worker from "../worker/worker.ts"
import * as asset from "../assets/assets.ts"
import { REFRESH_TOKEN_MS, type Session } from "./sessions.ts";
import { ACCESS_TOKEN_SECONDS } from "./tokens.ts";
import { AppError } from "../errors.ts";
 


export const authRouter = Router();

const refreshCookie: CookieOptions = {
	httpOnly: true,
	secure: true,
	sameSite: "strict",
	path: "/api/v1/auth",
};

authRouter.post("/auth/register", async (req, res) => {
	const input = parse(registerSchema, req.body);
	res.status(201).json(await auth.register(input));
});


authRouter.post("/auth/verify-email", async (req, res) => {
	const input = parse(verifyEmailSchema, req.body);
	await auth.verifyEmail(input);
	res.status(204).end();
});

authRouter.post("/auth/verification-code", async (req, res) => {
	const input = parse(verificationCodeSchema, req.body);
	await auth.sendVerificationCode(input);
	res.status(204).end();
});

authRouter.post("/auth/login", async (req, res) => {
	const input = parse(loginSchema, req.body);
	const { session, user } = await auth.login(input);
	setRefreshCookie(res, session.refreshToken);
	const body: LoginResponse = { ...accessTokenBody(session), user };
	res.json(body);
});

authRouter.post("/auth/refresh", async (req, res) => {
	const session = await auth.refresh(req.cookies.refresh_token);
	setRefreshCookie(res, session.refreshToken);
	res.json(accessTokenBody(session));
});

authRouter.post("/auth/logout", async (req, res) => {
	await auth.logout(req.cookies.refresh_token);
	res.clearCookie("refresh_token", refreshCookie);
	res.status(204).end();
});

function accessTokenBody(session: Session): AccessToken {
	return {
		access_token: session.accessToken,
		token_type: "Bearer",
		expires_in: ACCESS_TOKEN_SECONDS,
	};
}

function setRefreshCookie(res: Response, token: string) {
	res.cookie("refresh_token", token, {
		...refreshCookie,
		maxAge: REFRESH_TOKEN_MS,
	});
}


// place endpoints

authRouter.post("/place", async (req, res) => {
	const input = parse(createPlaceSchema, req.body);
	res.status(201).json(await place.createPlace(input, req.headers.authorization?.split(" ")[1] || ""));
})


authRouter.get("/place/:place_id", async (req, res) => {
	const input = parse(getPlaceSchema, req.params);
	res.status(201).json(await place.getPlacesById(input, req.headers.authorization?.split(" ")[1] || ""));
})

authRouter.get("/places", async (req, res) => {
	res.status(201).json(await place.getPlaces(req.headers.authorization?.split(" ")[1] || ""));
})

authRouter.delete("/place/:place_id", async (req, res) => {
	const input = parse(getPlaceSchema, req.params);
	res.status(201).json(await place.deletePlace(input,req.headers.authorization?.split(" ")[1] || ""));
})

authRouter.put("/place/:place_id", async (req, res) => {
	const input = parse(createPlaceSchema, req.body);
	const place_id = parse(getPlaceSchema, req.params);
	res.status(201).json(await place.editPlace(input,req.headers.authorization?.split(" ")[1] || "",place_id));
})


// worker endpoint start here
authRouter.post("/worker", async (req, res) => {
	const input = parse(updateWorkerSchema, req.body);
	res.status(201).json(await worker.createWorker(input,req.headers.authorization?.split(" ")[1] || ""));
})

authRouter.get("/worker/:worker_id", async (req, res) => {
	const input = parse(getWorkerSchema, req.params);
	res.status(201).json(await worker.getWorkerById(req.headers.authorization?.split(" ")[1] || "",input));
})

authRouter.delete("/worker/:worker_id", async (req, res) => {
	const input = parse(getWorkerSchema, req.params);
	res.status(201).json(await worker.deleteWorkerById(req.headers.authorization?.split(" ")[1] || "",input));
})

authRouter.put("/worker/:worker_id", async (req, res) => {
	const input = parse(getWorkerSchema, req.params);
	const update = parse(PutWorkerSchema, req.body);
	res.status(201).json(await worker.updateWorkerById(req.headers.authorization?.split(" ")[1] || "",input,update));
})
// assign worker in place
authRouter.get("/place/:place_id/workers", async (req, res) => {
	const input = parse(getPlaceSchema, req.params);
	res.status(201).json(await place.assignedPlace(req.headers.authorization?.split(" ")[1] || "",input));
})

authRouter.post("/place/:place_id/workers", async (req, res) => {
	const input = parse(getPlaceSchema, req.params);
	const worker = parse(getWorkerSchema,req.body)
	res.status(201).json(await place.assignWorker(req.headers.authorization?.split(" ")[1] || "",input,worker));
})

authRouter.delete("/place/:place_id/workers/:worker_id", async (req, res) => {
	const input = parse(getPlaceSchema, req.params);
	res.status(201).json(await place.unassign(req.headers.authorization?.split(" ")[1] || "",input));
})

// assets endpoints

authRouter.post("/places/:placeId/assets", async (req, res, next) => {
  try {
	const input = parse(createAssetSchema,req.body);
    const assets = await asset.createAsset(req.params.placeId as string,input,req.headers.authorization?.split(" ")[1] || "");

    res.status(200).json({ assets });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/places/:placeId/assets", async (req, res, next) => {
  try {
    const assets = await asset.getPlaceAssets(req.params.placeId as string,req.headers.authorization?.split(" ")[1] || "");

    res.status(200).json({ assets });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/assets/:assetId", async (req, res, next) => {
  try {
    const assets = await asset.getAsset(req.params.assetId as string);

    res.status(200).json({ assets });
  } catch (error) {
    next(error);
  }
});

authRouter.put("/assets/:assetId", async (req, res, next) => {
  try {
	const input = parse(updateAssetSchema,req.body);
    const assets = await asset.updateAsset(req.params.assetId as string,input,req.headers.authorization?.split(" ")[1] || "");

    res.status(200).json({ assets });
  } catch (error) {
    next(error);
  }
});

authRouter.delete("/assets/:assetId", async (req, res, next) => {
  try {
    const assets = await asset.deleteAsset(req.params.assetId as string,req.headers.authorization?.split(" ")[1] || "");

    res.status(200).json({ assets });
  } catch (error) {
    next(error);
  }
});
