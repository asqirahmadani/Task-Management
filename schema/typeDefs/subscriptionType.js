export const subscriptionTypeDefs = `
    type Subscription {
        # User Subscriptions
        userTyping(taskId: ID!): UserTypingPayload!
        userStatusChanged: UserStatusPayload!

        # Task Subscriptions
        taskCreated: Task!
        taskUpdated(taskId: ID): Task!
        taskDeleted(taskId: ID!): TaskDeletedPayload!
        taskAssigned: Task!
        taskStatusChanged(taskId: ID): TaskStatusChangedPayload!

        # Comment Subscriptions
        commentAdded(taskId: ID!): Comment!
        commentUpdated(taskId: ID!): Comment!
        commentDeleted(taskId: ID!): CommentDeletedPayload!
    
        # Notification Subscriptions
        notificationReceived: Notification!
    }

    type UserTypingPayload {
        user: User!
        taskId: ID!
        isTyping: Boolean!
    }

    type UserStatusPayload {
        user: User!
        status: UserStatus!
        lastSeen: DateTime!
    }

    enum UserStatus {
        ONLINE
        OFFLINE
        AWAY
    }

    type TaskDeletedPayload {
        taskId: ID!
        deletedBy: User!
        deletedAt: DateTime!
    }

    type TaskStatusChangedPayload {
        task: Task!
        oldStatus: TaskStatus!
        newStatus: TaskStatus!
        changedBy: User!
        changedAt: DateTime!
    }

    type CommentDeletedPayload {
        commentId: ID!
        taskId: ID!
        deletedBy: User!
        deletedAt: DateTime!
    }

    type Notification {
        id: ID!
        type: NotificationType!
        title: String!
        message: String!
        relatedTask: Task
        relatedComment: Comment
        createdAt: DateTime!
        read: Boolean!
    }

    enum NotificationType {
        TASK_ASSIGNED
        TASK_UPDATED
        TASK_COMPLETED
        COMMENT_ADDED
        COMMENT_MENTIONED
        DEADLINE_REMINDER
    }
`;
