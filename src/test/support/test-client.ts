import { inject } from "light-my-request";
import type { Express } from "express";

type HttpMethod = "DELETE" | "GET" | "PATCH" | "POST" | "PUT";

interface TestRequestOptions {
  method: HttpMethod;
  path: string;
  headers?: Record<string, string>;
  json?: unknown;
  payload?: string | Buffer;
}

interface TestResponse {
  body: string;
  headers: Record<string, string | number | string[] | undefined>;
  json: <T>() => T;
  statusCode: number;
}

export function createTestClient(app: Express) {
  return {
    async request(options: TestRequestOptions): Promise<TestResponse> {
      const headers = { ...(options.headers ?? {}) };
      let payload = options.payload;

      if (options.json !== undefined) {
        headers["content-type"] ??= "application/json";
        payload = JSON.stringify(options.json);
      }

      const response = await inject(app, {
        method: options.method,
        url: options.path,
        headers,
        payload,
      });

      return {
        body: response.body,
        headers: response.headers,
        json: <T>() => JSON.parse(response.body) as T,
        statusCode: response.statusCode,
      };
    },
  };
}
