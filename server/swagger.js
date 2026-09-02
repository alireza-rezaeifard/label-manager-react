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
      TokenPair: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'Short-lived JWT access token' },
          refreshToken: { type: 'string', description: 'Single-use rotating refresh token' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          username: { type: 'string' },
          role: { type: 'string' },
        },
      },
      RecordInput: {
        type: 'object',
        required: ['code', 'project'],
        properties: {
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
          workspace_id: { type: 'integer' },
        },
      },
    },
  },
  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login (rate limited; per-account lockout after 5 failures)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['username', 'password'], properties: { username: { type: 'string' }, password: { type: 'string' } } } } },
        },
        responses: {
          200: { description: 'Token pair', content: { 'application/json': { schema: { $ref: '#/components/schemas/TokenPair' } } } },
          401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          429: { description: 'Account locked or rate limited', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user (rate limited)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['username', 'password'], properties: { username: { type: 'string' }, password: { type: 'string' } } } } },
        },
        responses: {
          200: { description: 'Token pair', content: { 'application/json': { schema: { $ref: '#/components/schemas/TokenPair' } } } },
          400: { description: 'Invalid input', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Username exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate a refresh token (single-use; reuse revokes all sessions)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } } } },
        },
        responses: {
          200: { description: 'New token pair', content: { 'application/json': { schema: { $ref: '#/components/schemas/TokenPair' } } } },
          401: { description: 'Invalid/expired/reused refresh token', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Revoke a refresh token',
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', properties: { refreshToken: { type: 'string' } } } } },
        },
        responses: { 200: { description: 'Session revoked' } },
      },
    },
    '/records': {
      get: {
        tags: ['Records'],
        summary: 'List records (FTS5 search, filters, bounded pagination)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 1000 } },
          { name: 'cursor', in: 'query', schema: { type: 'string' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['code', 'project', 'type', 'date', 'party', 'amount', 'created_at', 'updated_at', 'sort_order'] } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
          { name: 'workspace_id', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Record page', content: { 'application/json': { schema: { type: 'object', properties: { records: { type: 'array', items: { $ref: '#/components/schemas/Record' } }, total: { type: 'integer' }, nextCursor: { type: 'string' } } } } } },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      post: {
        tags: ['Records'],
        summary: 'Create a record (editor role; supports Idempotency-Key header)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'Idempotency-Key', in: 'header', schema: { type: 'string' }, description: 'Retries with the same key return the original response (Idempotency-Replayed: true)' },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RecordInput' } } },
        },
        responses: {
          201: { description: 'Created record', content: { 'application/json': { schema: { $ref: '#/components/schemas/Record' } } } },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Not a member / insufficient role', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Duplicate code', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/records/{id}': {
      put: {
        tags: ['Records'],
        summary: 'Update a record (editor role; membership verified)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/RecordInput' } } } },
        responses: {
          200: { description: 'Updated record', content: { 'application/json': { schema: { $ref: '#/components/schemas/Record' } } } },
          403: { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/records/batch': {
      delete: {
        tags: ['Records'],
        summary: 'Soft-delete records by ids (editor role in each affected workspace)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['ids'], properties: { ids: { type: 'array', items: { type: 'integer' } } } } } },
        },
        responses: { 200: { description: 'Number of deleted records' } },
      },
    },
  },
};

const options = {
  swaggerDefinition,
  apis: [],
};

export default swaggerJsdoc(options);
