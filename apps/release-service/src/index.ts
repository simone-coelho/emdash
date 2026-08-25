import type { JWTVerifyGetKey } from "jose";

import {
	accessRoleForOperatorPath,
	authenticateAccessRequest,
	validateAccessMutation,
	type AccessActor,
} from "./access/auth.js";
import { ApiError } from "./api/errors.js";
import { getRequestId } from "./api/request-id.js";
import { apiFailure, apiSuccess } from "./api/response.js";
import { ConfigurationError, loadConfiguration, type ConfigurationBindings } from "./config.js";
import { ROUTES, type RouteDefinition } from "./routes.js";

export { PublisherDurableObject } from "./publisher-do/publisher-do.js";
export { ServiceControlDurableObject } from "./control-do/service-control-do.js";

export async function handleRequest(
	request: Request,
	bindings: ConfigurationBindings,
	routes: readonly RouteDefinition[] = ROUTES,
	accessKeyResolver?: JWTVerifyGetKey,
): Promise<Response> {
	const requestId = getRequestId(request);
	try {
		const url = new URL(request.url);
		if (url.pathname === "/health") {
			return request.method === "GET"
				? apiSuccess({ status: "ok" }, requestId)
				: apiFailure(new ApiError("METHOD_NOT_ALLOWED", 405, "Method not allowed"), requestId);
		}
		const configuration = await loadConfiguration(bindings);
		const route = routes.find(
			(candidate) => candidate.path === url.pathname && candidate.method === request.method,
		);
		if (route) {
			let accessActor: AccessActor | null = null;
			const operatorRole = accessRoleForOperatorPath(url.pathname);
			if (
				(url.pathname.startsWith("/admin/api/") && operatorRole !== route.accessRole) ||
				(!url.pathname.startsWith("/admin/api/") && route.accessRole !== undefined)
			) {
				throw new Error("Operator route has an invalid Access role boundary");
			}
			if (route.accessRole) {
				accessActor = await authenticateAccessRequest(
					request,
					route.accessRole,
					configuration.access,
					accessKeyResolver,
				);
				if (route.method !== "GET") validateAccessMutation(request, configuration.publicOrigin);
			}
			return await route.handler(request, requestId, configuration, accessActor);
		}
		if (routes.some((candidate) => candidate.path === url.pathname)) {
			return apiFailure(new ApiError("METHOD_NOT_ALLOWED", 405, "Method not allowed"), requestId);
		}
		return apiFailure(new ApiError("NOT_FOUND", 404, "Not found"), requestId);
	} catch (error) {
		if (error instanceof ConfigurationError) {
			console.error(JSON.stringify({ event: "configuration_error", issues: error.issues }));
			return apiFailure(
				new ApiError("CONFIGURATION_ERROR", 503, "Service is not configured"),
				requestId,
			);
		}
		console.error(
			JSON.stringify({
				event: "request_error",
				requestId,
				error: error instanceof Error ? (error.stack ?? error.message) : String(error),
			}),
		);
		return apiFailure(error, requestId);
	}
}

export default {
	fetch(request: Request, env: Env): Promise<Response> {
		return handleRequest(request, env);
	},
} satisfies ExportedHandler<Env>;
