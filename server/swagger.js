import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Label Studio API',
    version: '2.0.0',
    description: 'مستندات API نرم‌افزار برچسب‌گذاری和管理 برچسب‌ها',
    license: { name: 'MIT' },
  },
  servers: [
    { url: '/api', description: 'API base path' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          code: { type: 'string' },
        },
      },
      Record: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          code: { type: 'string' },
          project: { type: 'string' },
          type: { type: 'string' },
          date: { type: 'string' },
          party: { type: 'string' },
          amount: { type: 'string' },
          related: { type: 'array', items: { type: 'string' } },
          tags: { type: 'array', items: { type: 'string' } },
          image: { type: 'string' },
          color: { type: 'string' },
          sort_order: { type: 'integer' },
          workspace_id: { type: 'integer' },
          user_id: { type: 'integer' },
          created_at: { type: 'string' },
          updated_at: { type: 'string' },
        },
      },
      Workspace: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          description: { type: 'string' },
          created_by: { type: 'integer' },
          created_at: { type: 'string' },
          member_role: { type: 'string' },
          member_count: { type: 'integer' },
        },
      },
      WorkspaceMember: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          username: { type: 'string' },
          user_role: { type: 'string' },
          member_role: { type: 'string' },
          joined_at: { type: 'string' },
        },
      },
      CustomField: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          label: { type: 'string' },
          fa: { type: 'string' },
          placeholder: { type: 'string' },
          fieldType: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          isCustom: { type: 'boolean' },
        },
      },
      ActivityLog: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          user_id: { type: 'integer' },
          workspace_id: { type: 'integer' },
          action: { type: 'string' },
          details: { type: 'string' },
          record_id: { type: 'integer' },
          created_at: { type: 'string' },
        },
      },
      RecordVersion: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          record_id: { type: 'integer' },
          user_name: { type: 'string' },
          change_summary: { type: 'string' },
          created_at: { type: 'string' },
        },
      },
    },
  },
};

const options = {
  swaggerDefinition,
  apis: [],
};

export default swaggerJsdoc(options);
