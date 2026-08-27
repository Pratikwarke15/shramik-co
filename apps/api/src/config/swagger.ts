import swaggerJsdoc from "swagger-jsdoc";
import { env } from "./env";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "SIH26089 Shramik Co Platform API",
      version: "1.0.0",
      description: "Backend API for the Cooperative Gig Services Platform — empowering gig workers through cooperatives.",
      contact: {
        name: "SIH26089 Team",
        email: "team@sih26089.dev",
      },
    },
    servers: [
      {
        url: `http://localhost:${env.API_PORT}`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        SuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object" },
            message: { type: "string" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: { type: "string" },
          },
        },
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            phone: { type: "string" },
            email: { type: "string", nullable: true },
            name: { type: "string" },
            role: { type: "string", enum: ["CONSUMER", "WORKER", "COOP_ADMIN", "MINISTRY_SUPER_ADMIN"] },
            avatarUrl: { type: "string", nullable: true },
            isActive: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/*.ts", "./src/routes/**/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
