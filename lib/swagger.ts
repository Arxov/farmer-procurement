import { createSwaggerSpec } from 'next-swagger-doc';

export const getApiDocs = () => {
  const spec = createSwaggerSpec({
    apiFolder: 'pages/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Kisan Procurement Portal API',
        version: '1.0.0',
        description:
          'Production REST API for farmer slot booking, digital gate pass issuance, and MSP payment tracking.',
      },
      servers: [
        {
          url: '',
          description: 'Current Environment API Host',
        },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Provide Supabase JWT access token',
          },
        },
      },
    },
  });
  return spec;
};
