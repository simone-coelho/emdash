import type { AccessActor, AccessRole } from "./access/auth.js";
import { apiSuccess } from "./api/response.js";
import type { ServiceConfiguration } from "./config.js";
import {
	handleControlAudit,
	handleGetPublisherControl,
	handleServiceStatus,
	handleSetPublisherControl,
	handleSetServiceMode,
} from "./control-do/routes.js";
import { getClientMetadata, getPublicJwks, publicOAuthJson } from "./oauth/metadata.js";
import {
	handleOAuthCallback,
	handlePublisherDelegationAuthorize,
	handlePublisherIdentityAuthorize,
} from "./oauth/routes.js";

export interface RouteDefinition {
	method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	path: string;
	accessRole?: AccessRole;
	handler(
		request: Request,
		requestId: string,
		configuration: ServiceConfiguration,
		accessActor: AccessActor | null,
	): Response | Promise<Response>;
}

export const ROUTES = Object.freeze([
	{
		method: "GET",
		path: "/.well-known/atproto-client-metadata.json",
		handler: (_request, _requestId, configuration) =>
			publicOAuthJson(getClientMetadata(configuration.oauth)),
	},
	{
		method: "GET",
		path: "/oauth/jwks.json",
		handler: (_request, _requestId, configuration) =>
			publicOAuthJson(getPublicJwks(configuration.oauth)),
	},
	{
		method: "POST",
		path: "/v1/publisher/session/authorize",
		handler: handlePublisherIdentityAuthorize,
	},
	{
		method: "POST",
		path: "/v1/publisher/delegation/authorize",
		handler: handlePublisherDelegationAuthorize,
	},
	{
		method: "GET",
		path: "/oauth/callback",
		handler: handleOAuthCallback,
	},
	{
		method: "GET",
		path: "/health",
		handler: (_request, requestId) => apiSuccess({ status: "ok" }, requestId),
	},
	{
		method: "GET",
		path: "/admin/api/viewer/status",
		accessRole: "viewer",
		handler: handleServiceStatus,
	},
	{
		method: "GET",
		path: "/admin/api/viewer/publisher-control",
		accessRole: "viewer",
		handler: handleGetPublisherControl,
	},
	{
		method: "GET",
		path: "/admin/api/viewer/audit",
		accessRole: "viewer",
		handler: handleControlAudit,
	},
	{
		method: "POST",
		path: "/admin/api/admin/service-mode",
		accessRole: "admin",
		handler: handleSetServiceMode,
	},
	{
		method: "POST",
		path: "/admin/api/admin/publisher-control",
		accessRole: "admin",
		handler: handleSetPublisherControl,
	},
] as const satisfies readonly RouteDefinition[]);
