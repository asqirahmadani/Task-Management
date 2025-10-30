import { RedisPubSub } from "graphql-redis-subscriptions";
import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redisOptions = {
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 200);
    return delay;
  },
};

const pubsub = new RedisPubSub({
  publisher: new Redis(redisOptions),
  subscriber: new Redis(redisOptions),
});

export const SUBSCRIPTION_EVENTS = {
  // Notification events
  NOTIFICATION_SENT: "NOTIFICATION_SENT",

  // User events
  USER_ONLINE: "USER_ONLINE",
  USER_OFFLINE: "USER_OFFLINE",
  USER_TYPING: "USER_TYPING",

  // Task events
  TASK_CREATED: "TASK_CREATED",
  TASK_UPDATED: "TASK_UPDATED",
  TASK_DELETED: "TASK_DELETED",
  TASK_ASSIGNED: "TASK_ASSIGNED",
  TASK_STATUS_CHANGED: "TASK_STATUS_CHANGED",

  // Comment events
  COMMENT_ADDED: "COMMENT_ADDED",
  COMMENT_UPDATED: "COMMENT_UPDATED",
  COMMENT_DELETED: "COMMENT_DELETED",
};

export const publishEvent = async (event, payload) => {
  try {
    await pubsub.publish(event, payload);
    console.log(`Published ${event}`);
  } catch (error) {
    console.error(`Error publishing ${event}:`, error.message);
  }
};

export const subscribeToEvent = (event) => {
  return pubsub.asyncIterator(event);
};

// Event Handlers
pubsub.getPublisher().on("connect", () => {
  console.log("Redis Publisher connected");
});

pubsub.getSubscriber().on("connect", () => {
  console.log("Redis Subscriber connected");
});

pubsub.getPublisher().on("error", (err) => {
  console.log("Redis Publisher error:", err.message);
});

pubsub.getSubscriber().on("error", (err) => {
  console.log("Redis Subscriber error:", err.message);
});

export default pubsub;
