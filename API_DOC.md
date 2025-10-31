# 📖 Task Management GraphQL API - Complete Documentation

<div align="center">

**Comprehensive API reference for the Task Management GraphQL API**

[Authentication](#-authentication) • [Users](#-user-management) • [Tasks](#-task-management) • [Comments](#-comment-management) • [Subscriptions](#-real-time-subscriptions) • [Error Handling](#-error-handling)

</div>

---

## 📑 Table of Contents

- [Introduction](#introduction)
- [Base URL](#base-url)
- [Authentication](#-authentication)
- [User Management](#-user-management)
- [Task Management](#-task-management)
- [Comment Management](#-comment-management)
- [Real-time Subscriptions](#-real-time-subscriptions)
- [Error Handling](#-error-handling)
- [Rate Limiting](#-rate-limiting)
- [Examples & Use Cases](#-examples--use-cases)

---

## Introduction

This API uses **GraphQL** as its query language. Unlike REST APIs, GraphQL allows you to request exactly the data you need in a single request. All requests are sent to a single endpoint using POST method.

### Key Features

- 🔐 JWT-based authentication
- 📊 Flexible queries with nested relationships
- 🔄 Real-time updates via subscriptions
- ⚡ Optimized with DataLoader and Redis caching
- 🛡️ Protected with rate limiting and query complexity analysis

---

## Base URL

```
Development: http://localhost:4000/graphql
Production:  https://your-domain.com/graphql
```

### GraphQL Playground

Access the interactive GraphQL playground:

```
http://localhost:4000/graphql
```

---

## 🔐 Authentication

### Overview

The API uses JWT (JSON Web Tokens) for authentication. After successful login or registration, you'll receive a token that must be included in subsequent requests.

### Including Authentication Token

**HTTP Headers:**

```http
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

**Apollo Client Example:**

```javascript
import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";

const httpLink = createHttpLink({
  uri: "http://localhost:4000/graphql",
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
```

---

### Register

Create a new user account.

**Mutation:**

```graphql
mutation Register($input: registerInput!) {
  register(input: $input) {
    token
    user {
      id
      name
      email
      created_at
    }
  }
}
```

**Variables:**

```json
{
  "input": {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123!"
  }
}
```

**Response:**

```json
{
  "data": {
    "register": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "John Doe",
        "email": "john@example.com",
        "created_at": "2025-10-31T10:30:00.000Z"
      }
    }
  }
}
```

**Validation Rules:**

- `name`: Required, 2-100 characters
- `email`: Required, valid email format, unique
- `password`: Required, minimum 8 characters

---

### Login

Authenticate and receive a JWT token.

**Mutation:**

```graphql
mutation Login($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    token
    user {
      id
      name
      email
    }
  }
}
```

**Variables:**

```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:**

```json
{
  "data": {
    "login": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  }
}
```

**Possible Errors:**

- `INVALID_CREDENTIALS`: Invalid email or password
- `USER_NOT_FOUND`: User does not exist

---

### Get Current User

Retrieve authenticated user's information.

**Query:**

```graphql
query Me {
  me {
    id
    name
    email
    created_at
    createdTasks {
      id
      title
      status
    }
    assignedTasks {
      id
      title
      status
    }
  }
}
```

**Response:**

```json
{
  "data": {
    "me": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "email": "john@example.com",
      "created_at": "2025-10-31T10:30:00.000Z",
      "createdTasks": [...],
      "assignedTasks": [...]
    }
  }
}
```

**Requires:** Authentication

---

## 👤 User Management

### Get All Users

Retrieve a list of all users with pagination.

**Query:**

```graphql
query GetAllUsers($pagination: PaginationInput) {
  getAllUsers(pagination: $pagination) {
    id
    name
    email
    created_at
  }
}
```

**Variables:**

```json
{
  "pagination": {
    "page": 1,
    "limit": 10
  }
}
```

**Response:**

```json
{
  "data": {
    "getAllUsers": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "John Doe",
        "email": "john@example.com",
        "created_at": "2025-10-31T10:30:00.000Z"
      },
      ...
    ]
  }
}
```

---

### Get User by ID

Retrieve detailed information about a specific user.

**Query:**

```graphql
query GetUser($id: ID!) {
  getUser(id: $id) {
    id
    name
    email
    created_at
    createdTasks {
      id
      title
      status
      priority
    }
    assignedTasks {
      id
      title
      status
    }
    comments {
      id
      text
      task {
        title
      }
    }
  }
}
```

**Variables:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### Search Users

Search users by name with pagination.

**Query:**

```graphql
query SearchUsers($name: String!, $pagination: PaginationInput) {
  searchUsers(name: $name, pagination: $pagination) {
    id
    name
    email
  }
}
```

**Variables:**

```json
{
  "name": "john",
  "pagination": {
    "page": 1,
    "limit": 10
  }
}
```

---

### Update User Profile

Update authenticated user's profile information.

**Mutation:**

```graphql
mutation UpdateProfile($input: updateUserProfileInput!) {
  updateUserProfile(input: $input) {
    id
    name
    email
  }
}
```

**Variables:**

```json
{
  "input": {
    "name": "John Updated",
    "email": "john.new@example.com"
  }
}
```

**Requires:** Authentication

---

### Change Password

Change authenticated user's password.

**Mutation:**

```graphql
mutation ChangePassword($input: changePasswordInput!) {
  changePassword(input: $input) {
    success
    message
  }
}
```

**Variables:**

```json
{
  "input": {
    "oldPassword": "OldPass123!",
    "newPassword": "NewSecurePass123!"
  }
}
```

**Requires:** Authentication

**Validation:**

- Old password must be correct
- New password minimum 8 characters
- New password must be different from old password

---

### Delete User

Delete a user account (admin only or self-delete).

**Mutation:**

```graphql
mutation DeleteUser($id: ID!) {
  deleteUser(id: $id) {
    success
    message
  }
}
```

**Variables:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Requires:** Authentication & Authorization

---

## 📋 Task Management

### Get All Tasks

Retrieve tasks with optional filters and pagination.

**Query:**

```graphql
query GetAllTasks($filter: TaskFilterData, $pagination: PaginationInput) {
  getAllTasks(filter: $filter, pagination: $pagination) {
    id
    title
    description
    status
    priority
    created_at
    updated_at
    assignedUser {
      id
      name
      email
    }
    creator {
      id
      name
    }
    comments {
      id
      text
      user {
        name
      }
    }
    commentCount
  }
}
```

**Variables:**

```json
{
  "filter": {
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "assigned_to": "550e8400-e29b-41d4-a716-446655440000"
  },
  "pagination": {
    "page": 1,
    "limit": 20
  }
}
```

**Filter Options:**

- `status`: `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`
- `priority`: `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- `assigned_to`: User ID
- `created_by`: User ID

---

### Get Task by ID

Retrieve detailed information about a specific task.

**Query:**

```graphql
query GetTask($id: ID!) {
  getTask(id: $id) {
    id
    title
    description
    status
    priority
    created_at
    updated_at
    assignedUser {
      id
      name
      email
      assignedTasks {
        id
        title
        status
      }
    }
    creator {
      id
      name
      createdTasks {
        id
        title
      }
    }
    comments {
      id
      text
      created_at
      user {
        id
        name
      }
    }
    commentCount
  }
}
```

**Variables:**

```json
{
  "id": "task-uuid-here"
}
```

---

### Get My Tasks

Retrieve tasks assigned to the authenticated user.

**Query:**

```graphql
query GetMyTasks($pagination: PaginationInput) {
  getMyTasks(pagination: $pagination) {
    id
    title
    description
    status
    priority
    created_at
    creator {
      name
    }
    commentCount
  }
}
```

**Requires:** Authentication

---

### Get Tasks Created By Me

Retrieve tasks created by the authenticated user.

**Query:**

```graphql
query GetTasksCreatedByMe($pagination: PaginationInput) {
  getTasksCreatedByMe(pagination: $pagination) {
    id
    title
    status
    priority
    assignedUser {
      name
    }
    created_at
  }
}
```

**Requires:** Authentication

---

### Get Tasks by Status

Retrieve tasks filtered by status.

**Query:**

```graphql
query GetTasksByStatus($status: TaskStatus!, $pagination: PaginationInput) {
  getTasksByStatus(status: $status, pagination: $pagination) {
    id
    title
    description
    priority
    assignedUser {
      name
    }
  }
}
```

**Variables:**

```json
{
  "status": "PENDING",
  "pagination": {
    "page": 1,
    "limit": 10
  }
}
```

---

### Get Tasks by Priority

Retrieve tasks filtered by priority.

**Query:**

```graphql
query GetTasksByPriority(
  $priority: TaskPriority!
  $pagination: PaginationInput
) {
  getTasksByPriority(priority: $priority, pagination: $pagination) {
    id
    title
    status
    assignedUser {
      name
    }
  }
}
```

**Variables:**

```json
{
  "priority": "URGENT",
  "pagination": {
    "page": 1,
    "limit": 10
  }
}
```

---

### Get Tasks by User

Retrieve all tasks assigned to a specific user.

**Query:**

```graphql
query GetTasksByUser($userId: ID!, $pagination: PaginationInput) {
  getTasksByUser(userId: $userId, pagination: $pagination) {
    id
    title
    status
    priority
    creator {
      name
    }
  }
}
```

---

### Create Task

Create a new task.

**Mutation:**

```graphql
mutation CreateTask($input: createTaskData!) {
  createTask(input: $input) {
    id
    title
    description
    status
    priority
    created_at
    assignedUser {
      id
      name
      email
    }
    creator {
      id
      name
    }
  }
}
```

**Variables:**

```json
{
  "input": {
    "title": "Implement GraphQL Subscriptions",
    "description": "Add real-time updates for task changes",
    "status": "PENDING",
    "priority": "HIGH",
    "assigned_to": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Requires:** Authentication

**Validation:**

- `title`: Required, 3-200 characters
- `description`: Optional, max 2000 characters
- `status`: Optional, defaults to `PENDING`
- `priority`: Optional, defaults to `MEDIUM`
- `assigned_to`: Required, valid user ID

---

### Update Task

Update an existing task.

**Mutation:**

```graphql
mutation UpdateTask($id: ID!, $input: updateTaskData!) {
  updateTask(id: $id, input: $input) {
    id
    title
    description
    status
    priority
    updated_at
    assignedUser {
      name
    }
  }
}
```

**Variables:**

```json
{
  "id": "task-uuid-here",
  "input": {
    "title": "Updated Task Title",
    "description": "Updated description",
    "status": "IN_PROGRESS",
    "priority": "URGENT"
  }
}
```

**Requires:** Authentication & Authorization (creator or assigned user)

---

### Delete Task

Delete a task.

**Mutation:**

```graphql
mutation DeleteTask($id: ID!) {
  deleteTask(id: $id) {
    success
    message
  }
}
```

**Variables:**

```json
{
  "id": "task-uuid-here"
}
```

**Requires:** Authentication & Authorization (creator only)

**Response:**

```json
{
  "data": {
    "deleteTask": {
      "success": true,
      "message": "Task deleted successfully"
    }
  }
}
```

---

### Assign Task

Assign a task to a different user.

**Mutation:**

```graphql
mutation AssignTask($taskId: ID!, $userId: ID!) {
  assignTask(taskId: $taskId, userId: $userId) {
    id
    title
    assignedUser {
      id
      name
      email
    }
  }
}
```

**Variables:**

```json
{
  "taskId": "task-uuid-here",
  "userId": "user-uuid-here"
}
```

**Requires:** Authentication & Authorization (creator only)

---

### Change Task Status

Update task status.

**Mutation:**

```graphql
mutation ChangeTaskStatus($taskId: ID!, $status: TaskStatus!) {
  changeTaskStatus(taskId: $taskId, status: $status) {
    id
    title
    status
    updated_at
  }
}
```

**Variables:**

```json
{
  "taskId": "task-uuid-here",
  "status": "COMPLETED"
}
```

**Requires:** Authentication & Authorization (creator or assigned user)

---

### Get Task Statistics

Retrieve statistics about tasks.

**Query:**

```graphql
query GetTaskStats {
  getTaskStats {
    totalTasks
    pendingTasks
    inProgressTasks
    completedTasks
    cancelledTasks
    tasksByPriority {
      low
      medium
      high
      urgent
    }
  }
}
```

**Response:**

```json
{
  "data": {
    "getTaskStats": {
      "totalTasks": 150,
      "pendingTasks": 45,
      "inProgressTasks": 60,
      "completedTasks": 40,
      "cancelledTasks": 5,
      "tasksByPriority": {
        "low": 30,
        "medium": 70,
        "high": 40,
        "urgent": 10
      }
    }
  }
}
```

**Requires:** Authentication

---

### Get User Task Statistics

Get statistics for a specific user's tasks.

**Query:**

```graphql
query GetUserTaskStats($userId: ID!) {
  getUserTaskStats(userId: $userId) {
    totalTasks
    pendingTasks
    inProgressTasks
    completedTasks
    tasksByPriority {
      low
      medium
      high
      urgent
    }
  }
}
```

---

### Get Global Task Statistics

Get statistics for all tasks in the system (admin only).

**Query:**

```graphql
query GetGlobalTaskStats {
  getGlobalTaskStats {
    totalTasks
    pendingTasks
    inProgressTasks
    completedTasks
    cancelledTasks
    tasksByPriority {
      low
      medium
      high
      urgent
    }
  }
}
```

**Requires:** Authentication & Admin role

---

## 💬 Comment Management

### Get All Comments

Retrieve all comments with pagination.

**Query:**

```graphql
query GetAllComments($pagination: PaginationInput) {
  getAllComments(pagination: $pagination) {
    id
    text
    created_at
    user {
      id
      name
    }
    task {
      id
      title
    }
  }
}
```

---

### Get Comment by ID

Retrieve a specific comment.

**Query:**

```graphql
query GetComment($id: ID!) {
  getComment(id: $id) {
    id
    text
    created_at
    user {
      id
      name
      email
    }
    task {
      id
      title
      status
    }
  }
}
```

---

### Get Comments by Task

Retrieve all comments for a specific task.

**Query:**

```graphql
query GetCommentsByTask($taskId: ID!, $pagination: PaginationInput) {
  getCommentsByTask(taskId: $taskId, pagination: $pagination) {
    id
    text
    created_at
    user {
      id
      name
    }
  }
}
```

**Variables:**

```json
{
  "taskId": "task-uuid-here",
  "pagination": {
    "page": 1,
    "limit": 20
  }
}
```

---

### Get Comments by User

Retrieve all comments made by a specific user.

**Query:**

```graphql
query GetCommentsByUser($userId: ID!, $pagination: PaginationInput) {
  getCommentsByUser(userId: $userId, pagination: $pagination) {
    id
    text
    created_at
    task {
      id
      title
    }
  }
}
```

---

### Create Comment

Add a comment to a task.

**Mutation:**

```graphql
mutation CreateComment($input: createCommentData!) {
  createComment(input: $input) {
    id
    text
    created_at
    user {
      id
      name
    }
    task {
      id
      title
    }
  }
}
```

**Variables:**

```json
{
  "input": {
    "task_id": "task-uuid-here",
    "text": "This is a comment on the task"
  }
}
```

**Requires:** Authentication

**Validation:**

- `task_id`: Required, valid task ID
- `text`: Required, 1-1000 characters

---

### Update Comment

Update an existing comment.

**Mutation:**

```graphql
mutation UpdateComment($id: ID!, $input: updateCommentData!) {
  updateComment(id: $id, input: $input) {
    id
    text
    created_at
    user {
      name
    }
  }
}
```

**Variables:**

```json
{
  "id": "comment-uuid-here",
  "input": {
    "text": "Updated comment text"
  }
}
```

**Requires:** Authentication & Authorization (comment author only)

---

### Delete Comment

Delete a comment.

**Mutation:**

```graphql
mutation DeleteComment($id: ID!) {
  deleteComment(id: $id) {
    success
    message
  }
}
```

**Variables:**

```json
{
  "id": "comment-uuid-here"
}
```

**Requires:** Authentication & Authorization (comment author only)

---

## 🔄 Real-time Subscriptions

### Overview

Subscriptions enable real-time updates when data changes. Use WebSocket connection to subscribe to events.

### WebSocket Connection

**Connection URL:**

```
ws://localhost:4000/graphql
```

**Authentication:**
Include JWT token in connection parameters:

```javascript
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";

const wsLink = new GraphQLWsLink(
  createClient({
    url: "ws://localhost:4000/graphql",
    connectionParams: {
      authorization: `Bearer ${token}`,
    },
  })
);
```

---

### Task Created

Subscribe to newly created tasks.

**Subscription:**

```graphql
subscription TaskCreated {
  taskCreated {
    id
    title
    description
    status
    priority
    assignedUser {
      name
    }
    creator {
      name
    }
  }
}
```

**Triggered by:**

- `createTask` mutation

---

### Task Updated

Subscribe to task updates.

**Subscription:**

```graphql
subscription TaskUpdated($taskId: ID) {
  taskUpdated(taskId: $taskId) {
    id
    title
    description
    status
    priority
    updated_at
    assignedUser {
      name
    }
  }
}
```

**Variables (Optional):**

```json
{
  "taskId": "task-uuid-here"
}
```

**Triggered by:**

- `updateTask` mutation
- `assignTask` mutation
- `changeTaskStatus` mutation

**Note:** If `taskId` is provided, only updates to that specific task will be received. Otherwise, all task updates are received.

---

### Task Deleted

Subscribe to task deletion events.

**Subscription:**

```graphql
subscription TaskDeleted($taskId: ID!) {
  taskDeleted(taskId: $taskId) {
    taskId
    deletedBy {
      id
      name
    }
    deletedAt
  }
}
```

**Variables:**

```json
{
  "taskId": "task-uuid-here"
}
```

**Triggered by:**

- `deleteTask` mutation

---

### Task Assigned

Subscribe to task assignment events.

**Subscription:**

```graphql
subscription TaskAssigned {
  taskAssigned {
    id
    title
    assignedUser {
      id
      name
      email
    }
    creator {
      name
    }
  }
}
```

**Triggered by:**

- `assignTask` mutation

---

### Task Status Changed

Subscribe to task status change events.

**Subscription:**

```graphql
subscription TaskStatusChanged($taskId: ID) {
  taskStatusChanged(taskId: $taskId) {
    task {
      id
      title
      status
    }
    oldStatus
    newStatus
    changedBy {
      id
      name
    }
    changedAt
  }
}
```

**Variables (Optional):**

```json
{
  "taskId": "task-uuid-here"
}
```

**Triggered by:**

- `changeTaskStatus` mutation

---

### Comment Added

Subscribe to new comments on a task.

**Subscription:**

```graphql
subscription CommentAdded($taskId: ID!) {
  commentAdded(taskId: $taskId) {
    id
    text
    created_at
    user {
      id
      name
    }
    task {
      id
      title
    }
  }
}
```

**Variables:**

```json
{
  "taskId": "task-uuid-here"
}
```

**Triggered by:**

- `createComment` mutation

---

### Comment Updated

Subscribe to comment updates.

**Subscription:**

```graphql
subscription CommentUpdated($taskId: ID!) {
  commentUpdated(taskId: $taskId) {
    id
    text
    created_at
    user {
      name
    }
  }
}
```

**Triggered by:**

- `updateComment` mutation

---

### Comment Deleted

Subscribe to comment deletion events.

**Subscription:**

```graphql
subscription CommentDeleted($taskId: ID!) {
  commentDeleted(taskId: $taskId) {
    commentId
    taskId
    deletedBy {
      id
      name
    }
    deletedAt
  }
}
```

**Triggered by:**

- `deleteComment` mutation

---

### User Typing Indicator

Subscribe to typing indicators for a task.

**Subscription:**

```graphql
subscription UserTyping($taskId: ID!) {
  userTyping(taskId: $taskId) {
    user {
      id
      name
    }
    taskId
    isTyping
  }
}
```

**Variables:**

```json
{
  "taskId": "task-uuid-here"
}
```

**Triggered by:**

- `setTypingIndicator` mutation

**Set Typing Indicator Mutation:**

```graphql
mutation SetTypingIndicator($taskId: ID!, $isTyping: Boolean!) {
  setTypingIndicator(taskId: $taskId, isTyping: $isTyping)
}
```

---

### User Status Changed

Subscribe to user online/offline status changes.

**Subscription:**

```graphql
subscription UserStatusChanged {
  userStatusChanged {
    user {
      id
      name
    }
    status
    lastSeen
  }
}
```

**Status Enum:**

- `ONLINE`
- `OFFLINE`
- `AWAY`

---

### Notification Received

Subscribe to notifications for the authenticated user.

**Subscription:**

```graphql
subscription NotificationReceived {
  notificationReceived {
    id
    type
    title
    message
    relatedTask {
      id
      title
    }
    relatedComment {
      id
      text
    }
    createdAt
    read
  }
}
```

**Notification Types:**

- `TASK_ASSIGNED`
- `TASK_UPDATED`
- `TASK_COMPLETED`
- `COMMENT_ADDED`
- `COMMENT_MENTIONED`
- `DEADLINE_REMINDER`

**Requires:** Authentication

---

## ⚠️ Error Handling

### Error Response Format

```json
{
  "errors": [
    {
      "message": "Error message here",
      "extensions": {
        "code": "ERROR_CODE",
        "field": "fieldName",
        "timestamp": "2025-10-31T10:30:00.000Z"
      }
    }
  ]
}
```

### Common Error Codes

| Code                        | Description                            | HTTP Status |
| --------------------------- | -------------------------------------- | ----------- |
| `UNAUTHENTICATED`           | No valid authentication token provided | 401         |
| `UNAUTHORIZED`              | User doesn't have permission           | 403         |
| `NOT_FOUND`                 | Resource not found                     | 404         |
| `VALIDATION_ERROR`          | Input validation failed                | 400         |
| `DUPLICATE_ENTRY`           | Resource already exists                | 409         |
| `INVALID_CREDENTIALS`       | Invalid email or password              | 401         |
| `RATE_LIMIT_EXCEEDED`       | Too many requests                      | 429         |
| `QUERY_COMPLEXITY_EXCEEDED` | Query too complex                      | 400         |
| `QUERY_DEPTH_EXCEEDED`      | Query too deep                         | 400         |
| `QUERY_TIMEOUT`             | Query took too long to execute         | 408         |
| `INTERNAL_SERVER_ERROR`     | Server error                           | 500         |

### Example Error Responses

**Validation Error:**

```json
{
  "errors": [
    {
      "message": "Validation failed",
      "extensions": {
        "code": "VALIDATION_ERROR",
        "field": "title",
        "details": "Title must be at least 3 characters long"
      }
    }
  ]
}
```

**Unauthenticated:**

```json
{
  "errors": [
    {
      "message": "You must be logged in to perform this action",
      "extensions": {
        "code": "UNAUTHENTICATED"
      }
    }
  ]
}
```

**Unauthorized:**

```json
{
  "errors": [
    {
      "message": "You don't have permission to perform this action",
      "extensions": {
        "code": "UNAUTHORIZED"
      }
    }
  ]
}
```

**Rate Limit Exceeded:**

```json
{
  "errors": [
    {
      "message": "Rate limit exceeded. Please try again later.",
      "extensions": {
        "code": "RATE_LIMIT_EXCEEDED",
        "retryAfter": 900
      }
    }
  ]
}
```

---

## 🚦 Rate Limiting

### Limits

| User Type     | Window     | Max Requests  |
| ------------- | ---------- | ------------- |
| Authenticated | 15 minutes | 100 requests  |
| Public        | 15 minutes | 20 requests   |
| Global        | 1 minute   | 1000 requests |

### Rate Limit Headers

Response headers include rate limit information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1698753600
```

### Handling Rate Limits

When rate limit is exceeded:

```json
{
  "errors": [
    {
      "message": "Rate limit exceeded",
      "extensions": {
        "code": "RATE_LIMIT_EXCEEDED",
        "retryAfter": 900
      }
    }
  ]
}
```

**Best Practices:**

- Implement exponential backoff
- Cache responses when possible
- Use subscriptions instead of polling
- Batch multiple queries into a single request

---

## 📊 Examples & Use Cases

### Example 1: Complete Task Workflow

This example demonstrates creating a task, adding comments, updating status, and handling real-time updates.

**Step 1: Create a Task**

```graphql
mutation {
  createTask(
    input: {
      title: "Build User Dashboard"
      description: "Create a responsive dashboard with task analytics"
      priority: HIGH
      assigned_to: "user-123"
    }
  ) {
    id
    title
    status
    assignedUser {
      name
      email
    }
  }
}
```

**Step 2: Subscribe to Updates**

```graphql
subscription {
  taskUpdated(taskId: "task-456") {
    id
    title
    status
    updated_at
  }
}
```

**Step 3: Add Comments**

```graphql
mutation {
  createComment(
    input: { task_id: "task-456", text: "Started working on the wireframes" }
  ) {
    id
    text
    user {
      name
    }
  }
}
```

**Step 4: Update Status**

```graphql
mutation {
  changeTaskStatus(taskId: "task-456", status: IN_PROGRESS) {
    id
    status
    updated_at
  }
}
```

**Step 5: Complete Task**

```graphql
mutation {
  changeTaskStatus(taskId: "task-456", status: COMPLETED) {
    id
    status
    updated_at
  }
}
```

---

### Example 2: Dashboard Analytics

Fetch comprehensive data for a user dashboard.

```graphql
query DashboardData {
  me {
    id
    name
    email
  }

  myTasks: getMyTasks(pagination: { limit: 5 }) {
    id
    title
    status
    priority
    created_at
    creator {
      name
    }
  }

  createdTasks: getTasksCreatedByMe(pagination: { limit: 5 }) {
    id
    title
    status
    assignedUser {
      name
    }
  }

  stats: getTaskStats {
    totalTasks
    pendingTasks
    inProgressTasks
    completedTasks
    tasksByPriority {
      low
      medium
      high
      urgent
    }
  }
}
```

---

### Example 3: Task Detail Page

Fetch all related data for a task detail page with nested relationships.

```graphql
query TaskDetailPage($taskId: ID!) {
  task: getTask(id: $taskId) {
    id
    title
    description
    status
    priority
    created_at
    updated_at

    creator {
      id
      name
      email
      createdTasks(pagination: { limit: 3 }) {
        id
        title
        status
      }
    }

    assignedUser {
      id
      name
      email
      assignedTasks(pagination: { limit: 3 }) {
        id
        title
        status
      }
    }

    comments {
      id
      text
      created_at
      user {
        id
        name
        email
      }
    }

    commentCount
  }
}
```

---

### Example 4: Real-time Collaboration

Set up real-time collaboration features for a task.

**Subscribe to Multiple Events:**

```graphql
# Subscription 1: Task Updates
subscription {
  taskUpdated(taskId: "task-123") {
    id
    title
    status
    priority
    updated_at
  }
}

# Subscription 2: New Comments
subscription {
  commentAdded(taskId: "task-123") {
    id
    text
    created_at
    user {
      name
    }
  }
}

# Subscription 3: User Typing
subscription {
  userTyping(taskId: "task-123") {
    user {
      name
    }
    isTyping
  }
}
```

**Trigger Typing Indicator:**

```graphql
mutation {
  setTypingIndicator(taskId: "task-123", isTyping: true)
}
```

---

### Example 5: Team Task Management

Manage tasks across a team with filtering and assignment.

```graphql
query TeamTaskManagement {
  # Get all team members
  team: getAllUsers(pagination: { limit: 10 }) {
    id
    name
    email
  }

  # High priority tasks
  urgentTasks: getTasksByPriority(priority: URGENT, pagination: { limit: 10 }) {
    id
    title
    status
    assignedUser {
      name
    }
  }

  # In-progress tasks
  activeTasks: getTasksByStatus(
    status: IN_PROGRESS
    pagination: { limit: 20 }
  ) {
    id
    title
    priority
    assignedUser {
      name
    }
    commentCount
  }

  # Team statistics
  globalStats: getGlobalTaskStats {
    totalTasks
    pendingTasks
    inProgressTasks
    completedTasks
    tasksByPriority {
      low
      medium
      high
      urgent
    }
  }
}
```

---

### Example 6: Search and Filter Tasks

Advanced filtering with multiple criteria.

```graphql
query FilteredTasks {
  highPriorityInProgress: getAllTasks(
    filter: { status: IN_PROGRESS, priority: HIGH }
    pagination: { page: 1, limit: 10 }
  ) {
    id
    title
    description
    assignedUser {
      name
    }
    created_at
  }

  myPendingTasks: getAllTasks(
    filter: { status: PENDING, assigned_to: "my-user-id" }
    pagination: { page: 1, limit: 10 }
  ) {
    id
    title
    priority
    creator {
      name
    }
  }
}
```

---

### Example 7: Bulk Operations

Perform multiple operations in a single request.

```graphql
mutation BulkTaskOperations {
  task1: createTask(
    input: { title: "Task 1", assigned_to: "user-1", priority: HIGH }
  ) {
    id
    title
  }

  task2: createTask(
    input: { title: "Task 2", assigned_to: "user-2", priority: MEDIUM }
  ) {
    id
    title
  }

  updateTask1: updateTask(
    id: "existing-task-id"
    input: { status: COMPLETED }
  ) {
    id
    status
  }

  addComment: createComment(
    input: { task_id: "task-id", text: "Bulk operation completed" }
  ) {
    id
    text
  }
}
```

---

### Example 8: Nested Relationships

Query deeply nested relationships efficiently (handled by DataLoader).

```graphql
query NestedRelationships {
  getAllTasks(pagination: { limit: 5 }) {
    id
    title

    # First level nesting
    assignedUser {
      id
      name

      # Second level nesting
      assignedTasks {
        id
        title

        # Third level nesting
        comments {
          id
          text

          # Fourth level nesting
          user {
            id
            name
          }
        }
      }
    }

    # Parallel nesting
    creator {
      id
      name
      createdTasks {
        id
        title
      }
    }
  }
}
```

**Note:** This query is optimized with DataLoader to prevent N+1 problems. All user data is batched and cached efficiently.

---

## 🔧 Advanced Features

### Query Complexity Analysis

The API calculates query complexity to prevent expensive operations.

**Complexity Calculation:**

- Each scalar field: 1 point
- Each object field: 1 point
- Each list field: 10 points × multiplier
- Nested relationships: cumulative

**Example:**

```graphql
query {
  getAllTasks {
    # List: 10 points
    id # Scalar: 1 point
    title # Scalar: 1 point
    assignedUser {
      # Object: 1 point
      name # Scalar: 1 point
      assignedTasks {
        # List: 10 points
        title # Scalar: 1 point per item
      }
    }
  }
}
# Total: ~23 points (acceptable)
```

**Complexity Limit:** 1000 points

---

### Query Depth Limiting

Maximum query depth is limited to **7 levels** to prevent circular queries.

**Example of Rejected Query:**

```graphql
query TooDeep {
  user {
    # Level 1
    tasks {
      # Level 2
      assignedUser {
        # Level 3
        tasks {
          # Level 4
          assignedUser {
            # Level 5
            tasks {
              # Level 6
              assignedUser {
                # Level 7
                tasks {
                  # Level 8 - REJECTED!
                  title
                }
              }
            }
          }
        }
      }
    }
  }
}
```

---

### Query Timeout

All queries must complete within **10 seconds**. Long-running queries are automatically cancelled.

**Best Practices:**

- Use pagination to limit result sets
- Avoid requesting too many nested relationships
- Use filters to narrow down results
- Consider using multiple smaller queries instead of one large query

---

### Caching Strategy

The API uses Redis for intelligent caching:

**Cached Data:**

- User information (5 min TTL)
- Task lists with filters (2 min TTL)
- Task statistics (2 min TTL)
- Comment lists (2 min TTL)

**Cache Invalidation:**
Mutations automatically invalidate related cache:

- `createTask` → Clears all task list caches
- `updateTask` → Clears specific task and list caches
- `deleteTask` → Clears specific task and list caches
- `createComment` → Clears comment list cache for task
- `updateUser` → Clears user cache

**Cache Keys:**

```
user:{userId}
tasks:all:{filterHash}
tasks:user:{userId}
tasks:status:{status}
tasks:priority:{priority}
comments:task:{taskId}
stats:user:{userId}
stats:global
```

---

## 🧪 Testing with Apollo Studio

### Setting Up Apollo Studio

1. Navigate to `http://localhost:4000/graphql`
2. The Apollo Studio interface will open
3. Set authentication header in the bottom panel:

```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

### Testing Queries

**Step 1: Login to get token**

```graphql
mutation {
  login(email: "test@example.com", password: "password123") {
    token
    user {
      id
      name
    }
  }
}
```

**Step 2: Copy the token from response**

**Step 3: Set the token in headers panel**

**Step 4: Test authenticated queries**

```graphql
query {
  me {
    id
    name
    email
  }

  getMyTasks {
    id
    title
    status
  }
}
```

### Testing Subscriptions

1. Click on "Subscription" tab in Apollo Studio
2. Set authentication header
3. Run subscription query:

```graphql
subscription {
  taskCreated {
    id
    title
    creator {
      name
    }
  }
}
```

4. In another tab, trigger the mutation:

```graphql
mutation {
  createTask(input: { title: "Test Subscription", assigned_to: "user-id" }) {
    id
  }
}
```

5. See the subscription update in real-time!

---

## 🔐 Security Best Practices

### Client-Side Best Practices

**1. Store JWT Securely**

```javascript
// ❌ Don't store in localStorage (XSS vulnerable)
localStorage.setItem("token", token);

// ✅ Use httpOnly cookies (preferred)
// Or use secure session storage with proper XSS prevention
```

**2. Handle Token Expiration**

```javascript
import { onError } from "@apollo/client/link/error";

const errorLink = onError(({ graphQLErrors, operation, forward }) => {
  if (graphQLErrors) {
    for (let err of graphQLErrors) {
      if (err.extensions.code === "UNAUTHENTICATED") {
        // Token expired - redirect to login
        window.location.href = "/login";
      }
    }
  }
});
```

**3. Implement Request Retry Logic**

```javascript
import { RetryLink } from "@apollo/client/link/retry";

const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: Infinity,
    jitter: true,
  },
  attempts: {
    max: 3,
    retryIf: (error, _operation) => {
      return error?.extensions?.code === "RATE_LIMIT_EXCEEDED";
    },
  },
});
```

---

## 📱 Client Integration Examples

### React with Apollo Client

**Setup:**

```javascript
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  split,
  HttpLink,
} from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "graphql-ws";

const httpLink = new HttpLink({
  uri: "http://localhost:4000/graphql",
  headers: {
    authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: "ws://localhost:4000/graphql",
    connectionParams: {
      authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  })
);

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === "OperationDefinition" &&
      definition.operation === "subscription"
    );
  },
  wsLink,
  httpLink
);

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

function App() {
  return (
    <ApolloProvider client={client}>{/* Your app components */}</ApolloProvider>
  );
}
```

**Using Queries:**

```javascript
import { useQuery, gql } from "@apollo/client";

const GET_MY_TASKS = gql`
  query GetMyTasks {
    getMyTasks {
      id
      title
      status
      priority
      assignedUser {
        name
      }
    }
  }
`;

function MyTasks() {
  const { loading, error, data } = useQuery(GET_MY_TASKS);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      {data.getMyTasks.map((task) => (
        <div key={task.id}>
          <h3>{task.title}</h3>
          <p>Status: {task.status}</p>
        </div>
      ))}
    </div>
  );
}
```

**Using Mutations:**

```javascript
import { useMutation, gql } from "@apollo/client";

const CREATE_TASK = gql`
  mutation CreateTask($input: createTaskData!) {
    createTask(input: $input) {
      id
      title
      status
    }
  }
`;

function CreateTaskForm() {
  const [createTask, { loading, error }] = useMutation(CREATE_TASK, {
    refetchQueries: [{ query: GET_MY_TASKS }],
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createTask({
        variables: {
          input: {
            title: e.target.title.value,
            assigned_to: "user-id",
            priority: "HIGH",
          },
        },
      });
      alert("Task created!");
    } catch (err) {
      console.error("Error creating task:", err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" placeholder="Task title" required />
      <button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create Task"}
      </button>
      {error && <p>Error: {error.message}</p>}
    </form>
  );
}
```

**Using Subscriptions:**

```javascript
import { useSubscription, gql } from "@apollo/client";

const TASK_UPDATED = gql`
  subscription TaskUpdated($taskId: ID) {
    taskUpdated(taskId: $taskId) {
      id
      title
      status
      updated_at
    }
  }
`;

function TaskUpdates({ taskId }) {
  const { data, loading } = useSubscription(TASK_UPDATED, {
    variables: { taskId },
  });

  if (loading) return <p>Waiting for updates...</p>;

  return (
    <div>
      <h4>Latest Update:</h4>
      <p>Title: {data.taskUpdated.title}</p>
      <p>Status: {data.taskUpdated.status}</p>
      <p>Updated: {new Date(data.taskUpdated.updated_at).toLocaleString()}</p>
    </div>
  );
}
```

---

### Vue.js with Apollo Client

**Setup:**

```javascript
import { ApolloClient, InMemoryCache } from "@apollo/client/core";
import { createApolloProvider } from "@vue/apollo-option";

const apolloClient = new ApolloClient({
  uri: "http://localhost:4000/graphql",
  cache: new InMemoryCache(),
  headers: {
    authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

const apolloProvider = createApolloProvider({
  defaultClient: apolloClient,
});

// In main.js
app.use(apolloProvider);
```

**Using in Components:**

```vue
<template>
  <div>
    <div v-if="$apollo.loading">Loading...</div>
    <div v-else>
      <div v-for="task in tasks" :key="task.id">
        <h3>{{ task.title }}</h3>
        <p>{{ task.status }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import gql from "graphql-tag";

export default {
  apollo: {
    tasks: {
      query: gql`
        query GetMyTasks {
          getMyTasks {
            id
            title
            status
            priority
          }
        }
      `,
      update: (data) => data.getMyTasks,
    },
  },
};
</script>
```

---

### cURL Examples

**Login:**

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { login(email: \"user@example.com\", password: \"password123\") { token user { id name } } }"
  }'
```

**Authenticated Query:**

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "query": "query { getMyTasks { id title status } }"
  }'
```

**Mutation with Variables:**

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "query": "mutation CreateTask($input: createTaskData!) { createTask(input: $input) { id title } }",
    "variables": {
      "input": {
        "title": "New Task",
        "assigned_to": "user-id",
        "priority": "HIGH"
      }
    }
  }'
```

---

## 📚 Additional Resources

### GraphQL Tools

- [Apollo Studio](https://studio.apollographql.com/) - GraphQL IDE and monitoring
- [GraphQL Playground](https://github.com/graphql/graphql-playground) - GraphQL IDE
- [Altair GraphQL Client](https://altair.sirmuel.design/) - GraphQL client for testing
- [Insomnia](https://insomnia.rest/) - API client with GraphQL support

### Learning Resources

- [GraphQL Official Documentation](https://graphql.org/learn/)
- [Apollo Server Documentation](https://www.apollographql.com/docs/apollo-server/)
- [How to GraphQL](https://www.howtographql.com/) - Free tutorial
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)

### Community

- [GraphQL Discord](https://discord.gg/graphql)
- [Apollo Community](https://community.apollographql.com/)
- [Stack Overflow - GraphQL Tag](https://stackoverflow.com/questions/tagged/graphql)

---

## 📞 Support

For issues, questions, or contributions:

- **GitHub Issues**: [Create an issue](https://github.com/asqirahmadani/Task-Management/issues)
- **Email**: asqirahmadani@example.com
- **Documentation**: This document

---

## 📄 API Versioning

**Current Version:** v1.0.0

This API follows semantic versioning. Breaking changes will result in a major version bump.

**Version History:**

- **v1.0.0** (2025-10-31) - Initial release
  - Complete CRUD operations
  - Real-time subscriptions
  - DataLoader optimization
  - Redis caching
  - Security features

---

<div align="center">

**Made with ❤️ using GraphQL and Apollo Server**

[Back to Top](#-task-management-graphql-api---complete-documentation)

</div>
