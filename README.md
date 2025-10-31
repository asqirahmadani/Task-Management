# 📋 Task Management GraphQL API

<div align="center">

![GraphQL](https://img.shields.io/badge/GraphQL-E10098?style=for-the-badge&logo=graphql&logoColor=white)
![Apollo Server](https://img.shields.io/badge/Apollo%20Server-311C87?style=for-the-badge&logo=apollo-graphql&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)

**A production-ready GraphQL API for task management with real-time updates, advanced caching, and enterprise-grade security**

[Features](#-features) • [Quick Start](#-quick-start) • [API Documentation](#-api-documentation) • [Architecture](#-architecture) • [Security](#-security)

</div>

---

## 🌟 Overview

This project is a comprehensive **GraphQL API** built with **Apollo Server 5** that demonstrates modern backend development practices. It features real-time subscriptions, intelligent caching with Redis, DataLoader for query optimization, and enterprise-level security measures.

### Why This Project Stands Out

- 🚀 **Real-time Updates** - GraphQL Subscriptions for live task updates
- ⚡ **Performance Optimized** - DataLoader + Redis caching eliminates N+1 queries
- 🔒 **Production Security** - JWT auth, rate limiting, query complexity analysis
- 📊 **Complex Queries** - Nested relationships with smart filtering
- 🎯 **Clean Architecture** - Modular schema design with separation of concerns

---

## ✨ Features

### Core Functionality

- ✅ **Task Management** - CRUD operations with status tracking (Pending, In Progress, Completed, Cancelled)
- ✅ **User Management** - Registration, authentication, profile management
- ✅ **Comments System** - Nested comments on tasks with user attribution
- ✅ **Task Assignment** - Assign tasks to users with role-based access

### Advanced GraphQL Features

- 🔄 **Real-time Subscriptions**
  - Task created/updated/deleted events
  - Comment notifications
  - User typing indicators
  - Status change broadcasts
- 🎯 **Complex Queries**
  - Nested relationships (tasks → assignee → comments → user)
  - Filtering by status, priority, assignee
  - Pagination support
  - Task statistics and analytics
- 🔍 **DataLoader Integration**
  - Batch loading for users
  - Batch loading for tasks by user
  - Batch loading for comments by task
  - Eliminates N+1 query problems

### Performance & Caching

- ⚡ **Redis Caching Strategy**
  - User data caching (1 hour TTL)
  - Task list caching with filter keys (5 min TTL)
  - Smart cache invalidation on mutations
- 🔄 **Cache Management**
  - Automatic invalidation on create/update/delete
  - Pattern-based cache clearing
  - TTL-based expiration

### Security & Optimization

- 🔐 **Authentication & Authorization**
  - JWT-based authentication
  - Protected queries and mutations
  - Field-level authorization
- 🛡️ **Security Measures**
  - Query depth limiting (max 7 levels)
  - Query complexity analysis (max 1000 complexity)
  - Query timeout (10 seconds)
  - Rate limiting (per-user and global)
  - Input validation with Validator
  - Security headers with Helmet
  - CORS configuration
- 📊 **Logging & Monitoring**
  - Request/response logging
  - Error tracking
  - Performance metrics

---

## 🏗️ Architecture

### Tech Stack

| Layer              | Technology                                            |
| ------------------ | ----------------------------------------------------- |
| **GraphQL Server** | Apollo Server 5                                       |
| **Runtime**        | Node.js                                               |
| **Database**       | PostgreSQL                                            |
| **Caching**        | Redis                                                 |
| **Authentication** | JWT (jsonwebtoken)                                    |
| **Validation**     | Validator                                             |
| **Security**       | Helmet, graphql-depth-limit, graphql-query-complexity |
| **Real-time**      | GraphQL Subscriptions (graphql-ws)                    |

### Project Structure

```
src/
├── config/
│   ├── cache-config.js     # Cache Configuration (Prefix & TTL)
│   ├── database.js         # PostgreSQL connection pool
│   ├── pubsub.js           # Subscriptions configuration
│   └── redis.js            # Redis client configuration
├── middleware/
│   ├── auth.js             # JWT authentication
│   └── security.js         # Security headers & CORS
├── schema/
│   ├── typeDefs/
│   │   ├── index.js            # All schemas
│   │   ├── baseType.js         # Base types & scalars
│   │   ├── userType.js         # User schema
│   │   ├── taskType.js         # Task schema
│   │   ├── commentType.js      # Comment schema
│   │   └── subscriptionType.js # Subscription schema
│   └── resolvers/
│       ├── index.js                 # All resolvers
│       ├── auth-resolver.js         # Auth resolvers
│       ├── user-resolver.js         # User resolvers
│       ├── task-resolver.js         # Task resolvers
│       ├── comment-resolver.js      # Comment resolvers
│       └── subscription-resolver.js # Subscription resolvers
├── utils/
│   ├── auth.js             # Auth helper functions
│   ├── dataLoader.js       # DataLoader helper functions
│   ├── inputValidator.js   # Input validation schemas
│   ├── rateLimiter.js      # Rate limiting logic
│   ├── redis.js            # Redis helper functions
│   └── logger.js           # Logging utility
└── server.js               # Apollo Server setup
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.x
- PostgreSQL >= 14.x
- Redis >= 7.x
- Docker & Docker Compose (optional)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/asqirahmadani/Task-Management.git
cd Task-Management
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Server
PORT=4000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=task_management
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d

# Security
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX_REQUESTS=100
QUERY_COMPLEXITY_LIMIT=1000
QUERY_DEPTH_LIMIT=7
QUERY_TIMEOUT=10000
```

4. **Setup database**

```bash
# Create database
createdb task_management

# Run migrations
npm run migrate
```

5. **Start the server**

```bash
# Development
npm run dev

# Production
npm start
```

6. **Access Apollo Studio**

```
http://localhost:4000/graphql
```

### Using Docker Compose

```bash
# Start all services (PostgreSQL, Redis, API)
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

---

## 🔒 Security

### Authentication

- **JWT Tokens** - Secure token-based authentication
- **Password Hashing** - bcrypt with salt rounds
- **Token Expiration** - Configurable token lifetime

### Query Protection

```javascript
// Depth Limiting - Prevents deeply nested queries
query {
  user {
    tasks {
      assignedUser {
        tasks {
          assignedUser {
            # Max depth exceeded - REJECTED
          }
        }
      }
    }
  }
}

// Complexity Analysis - Prevents expensive queries
query {
  # Complexity score calculated based on:
  # - Number of fields
  # - Nested relationships
  # - List multipliers
  # Max: 1000 complexity points
}
```

### Rate Limiting

- **Per-User Limits** - 100 requests per 15 minutes
- **Global Limits** - 1000 requests per minute
- **Authenticated vs Public** - Different limits for auth state

<!-- ### Input Validation

```javascript
// All inputs validated with Joi
createTaskInput: {
  title: Joi.string().min(3).max(200).required();
  description: Joi.string().max(2000).optional();
  status: Joi.string().valid("PENDING", "IN_PROGRESS", "COMPLETED");
  priority: Joi.string().valid("LOW", "MEDIUM", "HIGH", "URGENT");
}
``` -->

---

## ⚡ Performance Optimizations

### DataLoader Pattern

Eliminates N+1 query problems:

```javascript
// Without DataLoader: N+1 queries
tasks.forEach((task) => {
  db.query("SELECT * FROM users WHERE id = ?", task.assigned_to);
});

// With DataLoader: 1 batched query
const userIds = tasks.map((t) => t.assigned_to);
db.query("SELECT * FROM users WHERE id IN (?)", userIds);
```

### Redis Caching Strategy

```javascript
// Cache Keys Pattern
user:{userId}              // TTL: 5 minutes
tasks:all:{filters}        // TTL: 2 minutes
tasks:user:{userId}        // TTL: 2 minutes
comments:task:{taskId}     // TTL: 2 minutes

// Invalidation on mutations
createTask()  → Clear tasks:* pattern
updateTask()  → Clear specific task cache
deleteUser()  → Clear user:* pattern
```

### Query Timeout

- Automatic query cancellation after 10 seconds
- Prevents long-running queries from blocking

---

## 📊 Monitoring & Logging

### Request Logging

```javascript
// Logged information
- Query/Mutation name
- Execution time
- Cache hit/miss
- User ID (if authenticated)
- Errors with stack traces
```

### Performance Metrics

- Query execution time
- DataLoader batch sizes
- Cache hit rates
- Error rates

---

<!-- ## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm test -- user.test.js
```

---

## 🐳 Deployment

### Docker Production Build

```bash
# Build image
docker build -t task-management-api .

# Run container
docker run -p 4000:4000 \
  -e DB_HOST=your-db-host \
  -e REDIS_HOST=your-redis-host \
  -e JWT_SECRET=your-secret \
  task-management-api
```

### Environment-specific Configuration

```bash
# Development
npm run dev

# Staging
NODE_ENV=staging npm start

# Production
NODE_ENV=production npm start
```

--- -->

## 📝 API Schema

<details>
<summary><b>View Full GraphQL Schema</b></summary>

```graphql
# User Types
type User {
  id: ID!
  name: String!
  email: String!
  created_at: DateTime!
  createdTasks: [Task!]!
  assignedTasks: [Task]!
  comments: [Comment!]!
}

# Task Types
type Task {
  id: ID!
  title: String!
  description: String
  status: TaskStatus!
  priority: TaskPriority!
  assigned_to: ID!
  created_by: ID!
  created_at: DateTime!
  updated_at: DateTime!
  assignedUser: User
  creator: User
  comments: [Comment!]!
  commentCount: Int!
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

# Comment Types
type Comment {
  id: ID!
  task_id: ID!
  user_id: ID!
  text: String!
  created_at: DateTime!
  task: Task!
  user: User!
}

# Subscription Types
type Subscription {
  taskCreated: Task!
  taskUpdated(taskId: ID): Task!
  taskDeleted(taskId: ID!): TaskDeletedPayload!
  commentAdded(taskId: ID!): Comment!
  userTyping(taskId: ID!): UserTypingPayload!
}
```

</details>

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Asqi Rahmadani**

- GitHub: [@asqirahmadani](https://github.com/asqirahmadani)
- Project Link: [https://github.com/asqirahmadani/Task-Management](https://github.com/asqirahmadani/Task-Management)

---

## 🙏 Acknowledgments

- [Apollo Server](https://www.apollographql.com/docs/apollo-server/) - GraphQL server implementation
- [DataLoader](https://github.com/graphql/dataloader) - Batching and caching layer
- [GraphQL](https://graphql.org/) - Query language for APIs

---

<div align="center">

**⭐ If you found this project helpful, please consider giving it a star!**

Made with ❤️ and GraphQL

</div>
