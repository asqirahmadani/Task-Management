export const taskTypeDefs = `
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

        # Relational Fields
        assignedUser: User
        creator: User
        comments: [Comment!]!
        commentCount: Int!
    }

    enum TaskPriority {
        LOW
        MEDIUM
        HIGH
        URGENT
    }

    input createTaskData {
        title: String!
        description: String
        status: TaskStatus = PENDING
        priority: TaskPriority = MEDIUM
        assigned_to: ID!
    }

    input updateTaskData {
        title: String
        description: String
        status: TaskStatus
        priority: TaskPriority
        assigned_to: ID
    }

    input TaskFilterData {
        status: TaskStatus
        priority: TaskPriority
        assigned_to: ID
        created_by: ID
    }

    type TaskStats {
        totalTasks: Int!
        pendingTasks: Int!
        inProgressTasks: Int!
        completedTasks: Int!
        cancelledTasks: Int!
        tasksByPriority: TaskByPriorityStats!
    }

    type TaskByPriorityStats {
        low: Int!
        medium: Int!
        high: Int!
        urgent: Int!
    }

    extend type Mutation {
        createTask(input: createTaskData!): Task!
        updateTask(id: ID!, input: updateTaskData!): Task!
        deleteTask(id: ID!): FormatResponses!
        assignTask(taskId: ID!, userId: ID!): Task!
        changeTaskStatus(taskId: ID!, status: TaskStatus!): Task!
    }

    extend type Query {
        getAllTasks(filter: TaskFilterData, pagination: PaginationInput): [Task!]!
        getTask(id: ID!): Task
        getTasksByStatus(status: TaskStatus!, pagination: PaginationInput): [Task!]!
        getTasksByPriority(priority: TaskPriority!, pagination: PaginationInput): [Task!]!
        getMyTasks(pagination: PaginationInput): [Task!]!
        getTasksCreatedByMe(pagination: PaginationInput): [Task!]!
        getTasksByUser(userId: ID!, pagination: PaginationInput): [Task!]!
        getTaskStats: TaskStats!
        getUserTaskStats(userId: ID!): TaskStats!
        getGlobalTaskStats: TaskStats!
    }
`;
