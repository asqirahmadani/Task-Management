import { subscribeToEvent, SUBSCRIPTION_EVENTS } from "../../config/pubsub.js";
import { withFilter } from "graphql-subscriptions";
import { requireAuth } from "../../utils/auth.js";

export const subscriptionResolvers = {
  Subscription: {
    // User Subscriptions
    userTyping: {
      subscribe: withFilter(
        (_, __, context) => {
          requireAuth(context);
          return subscribeToEvent(SUBSCRIPTION_EVENTS.USER_TYPING);
        },
        (payload, variables, context) => {
          return (
            payload.taskId === variables.taskId &&
            payload.user.id !== context.user.id
          );
        }
      ),

      resolve: (payload) => {
        return {
          user: payload.user,
          taskId: payload.taskId,
          isTyping: payload.isTyping,
        };
      },
    },

    userStatusChanged: {
      subscribe: (_, __, context) => {
        requireAuth(context);
        return subscribeToEvent(SUBSCRIPTION_EVENTS.USER_ONLINE);
      },

      resolve: (payload) => {
        return {
          user: payload.user,
          status: payload.status,
          lastSeen: payload.lastSeen,
        };
      },
    },

    // Task Subscriptions
    taskCreated: {
      subscribe: (_, __, context) => {
        requireAuth(context);
        console.log(`User ${context.user.id} subscribed to: taskCreated`);
        return subscribeToEvent(SUBSCRIPTION_EVENTS.TASK_CREATED);
      },

      resolve: (payload) => {
        return payload.task;
      },
    },

    taskUpdated: {
      subscribe: withFilter(
        (_, __, context) => {
          requireAuth(context);
          return subscribeToEvent(SUBSCRIPTION_EVENTS.TASK_UPDATED);
        },
        (payload, variables, context) => {
          if (variables.taskId) {
            return payload.task.id === variables.taskId;
          }
          return true;
        }
      ),

      resolve: (payload) => {
        return payload.task;
      },
    },

    taskDeleted: {
      subscribe: withFilter(
        (_, __, context) => {
          requireAuth(context);
          return subscribeToEvent(SUBSCRIPTION_EVENTS.TASK_DELETED);
        },
        (payload, variables) => {
          return payload.taskId === variables.taskId;
        }
      ),

      resolve: (payload) => {
        return {
          taskId: payload.taskId,
          deletedBy: payload.deletedBy,
          deletedAt: payload.deletedAt,
        };
      },
    },

    taskAssigned: {
      subscribe: withFilter(
        (_, __, context) => {
          requireAuth(context);
          return subscribeToEvent(SUBSCRIPTION_EVENTS.TASK_ASSIGNED);
        },
        (payload, variables, context) => {
          return payload.task.assigned_to === context.user.id;
        }
      ),

      resolve: (payload) => {
        return payload.task;
      },
    },

    taskStatusChanged: {
      subscribe: withFilter(
        (_, __, context) => {
          requireAuth(context);
          return subscribeToEvent(SUBSCRIPTION_EVENTS.TASK_STATUS_CHANGED);
        },
        (payload, variables) => {
          if (variables.taskId) {
            return payload.task.id === variables.taskId;
          }
          return true;
        }
      ),

      resolve: (payload) => {
        return {
          task: payload.task,
          oldStatus: payload.oldStatus,
          newStatus: payload.newStatus,
          changedBy: payload.changedBy,
          changedAt: new Date().toISOString(),
        };
      },
    },

    // Comment Subscriptions
    commentAdded: {
      subscribe: withFilter(
        (_, __, context) => {
          requireAuth(context);
          return subscribeToEvent(SUBSCRIPTION_EVENTS.COMMENT_ADDED);
        },
        (payload, variables) => {
          return payload.comment.task_id === variables.taskId;
        }
      ),

      resolve: (payload) => {
        return payload.comment;
      },
    },

    commentUpdated: {
      subscribe: withFilter(
        (_, __, context) => {
          requireAuth(context);
          return subscribeToEvent(SUBSCRIPTION_EVENTS.COMMENT_UPDATED);
        },
        (payload, variables) => {
          return payload.comment.task_id === variables.taskId;
        }
      ),

      resolve: (payload) => {
        return payload.comment;
      },
    },

    commentDeleted: {
      subscribe: withFilter(
        (_, __, context) => {
          requireAuth(context);
          return subscribeToEvent(SUBSCRIPTION_EVENTS.COMMENT_DELETED);
        },
        (payload, variables) => {
          return payload.taskId === variables.taskId;
        }
      ),
      resolve: (payload) => {
        return {
          commentId: payload.commentId,
          taskId: payload.taskId,
          deletedBy: payload.deletedBy,
          deletedAt: payload.deletedAt,
        };
      },
    },

    // Notification Subscriptions
    notificationReceived: {
      subscribe: withFilter(
        (_, __, context) => {
          requireAuth(context);
          return subscribeToEvent(SUBSCRIPTION_EVENTS.NOTIFICATION_SENT);
        },
        (payload, variables, context) => {
          return payload.notification.userId === context.user.id;
        }
      ),

      resolve: (payload) => {
        return payload.notification;
      },
    },
  },
};
